import { Worker } from "node:worker_threads";
import http from "node:http";
import { URL } from "node:url";
import { getSummaryFromDb, purgePayments } from "./services.ts";
import fs from "node:fs";

const { port1, port2 } = new MessageChannel();

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "50", 10);
const BATCH_TIMEOUT = parseInt(process.env.BATCH_TIMEOUT || "1000", 10);

let paymentBatch: any[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

function sendBatchToWorker() {
  if (paymentBatch.length > 0) {
    const batch = [...paymentBatch];
    paymentBatch = [];

    port1.postMessage(batch);

    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
  }
}

function addPaymentToBatch(payment: any) {
  paymentBatch.push(payment);

  if (paymentBatch.length >= BATCH_SIZE) {
    sendBatchToWorker();
  } else {
    if (!batchTimeout) {
      batchTimeout = setTimeout(() => {
        sendBatchToWorker();
      }, BATCH_TIMEOUT);
    }
  }
}

function readJsonFromHttp(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CONTENT_TYPE_JSON = { "Content-Type": "application/json" };
const CONTENT_TYPE_TEXT = { "Content-Type": "text/plain" };

const server = http.createServer(async (req, res) => {
  req.socket.setNoDelay(true);

  Object.assign(res.getHeaders(), CORS_HEADERS);

  const method = req.method;

  if (method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  const url = req.url!;

  try {
    if (method === "POST") {
      if (url === "/payments") {
        try {
          const body = await readJsonFromHttp(req);
          addPaymentToBatch(body);
          res.writeHead(201, { ...CORS_HEADERS, ...CONTENT_TYPE_TEXT });
          res.end();
        } catch (error) {
          res.writeHead(400, { ...CORS_HEADERS, ...CONTENT_TYPE_TEXT });
          res.end();
        }
        return;
      }

      if (url === "/purge-payments") {
        await purgePayments();
        res.writeHead(200, { ...CORS_HEADERS, ...CONTENT_TYPE_TEXT });
        res.end();
        return;
      }
    } else if (method === "GET") {
      if (url.startsWith("/payments-summary")) {
        const urlObj = new URL(url, `http://${req.headers.host}`);
        const searchParams = urlObj.searchParams;
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const summary = await getSummaryFromDb(from!, to!);

        res.writeHead(200, { ...CORS_HEADERS, ...CONTENT_TYPE_JSON });
        res.end(summary);
        return;
      }
    }
  } catch (error) {
    console.error("Server error:", error);
    res.writeHead(500, { ...CORS_HEADERS, ...CONTENT_TYPE_TEXT });
    res.end("Internal Server Error");
  }
});

server.keepAliveTimeout = 5000;

server.on("connection", (socket) => {
  socket.setKeepAlive(true, 1000);
  socket.setNoDelay(true);
});

switch (process.env.NODE_ENV) {
  case "development":
    server.listen(parseInt(process.env.PORT!, 10), () => {
      console.log(`Listening to port ${process.env.PORT}`);
    });
    break;

  case "production":
    const SOCKET_PATH_SERVER = process.env.SOCKET_PATH_SERVER!;
    if (fs.existsSync(SOCKET_PATH_SERVER)) {
      fs.unlinkSync(SOCKET_PATH_SERVER);
    }

    server.listen(SOCKET_PATH_SERVER, () => {
      console.log(`Listening to socket ${SOCKET_PATH_SERVER}`);
      fs.chmodSync(SOCKET_PATH_SERVER, 0o766);
    });
    break;

  default:
    console.error("Unknown environment:", process.env.NODE_ENV);
    break;
}

const totalWorkers = 1;
const allSuffixes = process.env.ZEROMQ_SUFFIXS!.split(",").map((s) => s.trim());

for (let i = 0; i < totalWorkers; i++) {
  const worker = new Worker(
    new URL("./workers/handle-to-processor.ts", import.meta.url),
    {
      workerData: {
        defaultUrl: process.env.PAYMENT_PROCESSOR_URL_DEFAULT,
        fallbackUrl: process.env.PAYMENT_PROCESSOR_URL_FALLBACK,
        bind: `ipc:///tmp/zeromq${allSuffixes[i]}.sock`,
      },
      env: process.env,
    }
  );

  worker.postMessage({ port: port2 }, [port2]);
}
