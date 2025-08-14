import { Worker } from "node:worker_threads";
import { App, type HttpRequest, type HttpResponse } from "uWebSockets.js";
import { readJsonFromUWS } from "./helpers.ts";
import { getSummaryFromDb, purgePayments } from "./services.ts";
import fs from "node:fs";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const { port1, port2 } = new MessageChannel();

const app = App();


function processPaymentRequest(res: HttpResponse, req: HttpRequest) {
  let hasResponded = false;

  res.onAborted(() => {
    console.log("Payment request aborted");
    hasResponded = true;
  });

  try {
    readJsonFromUWS(res).then((body) => {
      port1.postMessage(body);
    });

    res.cork(() => {
      res.writeStatus("201 Created").end("", false);
    });

    hasResponded = true;

  } catch (error) {
    if (!hasResponded) {
      hasResponded = true;
      res.cork(() => {
        res.writeStatus("400 Bad Request").end("", false);
      });
    }
  }
}

app.post("/payments", processPaymentRequest);

app.get("/payments-summary", async (res, req) => {
  let hasResponded = false;
  res.onAborted(() => {
    console.log("Summary request aborted");
    hasResponded = true;
  });

  const queryString = req.getQuery();

  const params = Object.fromEntries(new URLSearchParams(queryString));

  const from = params.from;
  const to = params.to;

  if (hasResponded) return;

  // await sleep(1000);

  const summary = await getSummaryFromDb(from, to);

  res.cork(() => {
    hasResponded = true;
    res
      .writeStatus("200 OK")
      .writeHeader("Content-Type", "application/json")
      .end(summary, true);
  });
});

app.post("/purge-payments", async (res, req) => {
  res.onAborted(() => {
    console.log("Purge request aborted");
  });

  await purgePayments();

  res.cork(() => {
    res.writeStatus("200 OK").end("");
  });
});

switch (process.env.NODE_ENV) {
  case "development":
    app.listen(parseInt(process.env.PORT!, 10), (token) => {
      if (token) {
        console.log(`Listening to port ${process.env.PORT}`);
      } else {
        console.log(`Failed to listen to port ${process.env.PORT}`);
      }
    });
    break;

  case "production":
    const SOCKET_PATH_SERVER = process.env.SOCKET_PATH_SERVER!;
    if (fs.existsSync(SOCKET_PATH_SERVER)) {
      fs.unlinkSync(SOCKET_PATH_SERVER);
    }

    app.listen_unix((token) => {
      if (token) {
        console.log(`Listening to socket ${SOCKET_PATH_SERVER}`);
        fs.chmodSync(SOCKET_PATH_SERVER, 0o766);
      } else {
        console.log(`Failed to listen to socket ${SOCKET_PATH_SERVER}`);
      }
    }, SOCKET_PATH_SERVER);
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

  worker.postMessage({port: port2}, [port2]);
}
