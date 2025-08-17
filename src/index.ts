import { Worker } from "node:worker_threads";
import http from "node:http";
import fs from "node:fs";
import { handleRoutes } from "./routes.ts";

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

const server = http.createServer(async (req, res) => {
  req.socket.setNoDelay(true);
  await handleRoutes(req, res, addPaymentToBatch);
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