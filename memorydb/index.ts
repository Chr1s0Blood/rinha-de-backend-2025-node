import http from "node:http";
import url from "node:url";
import fastJson from "fast-json-stringify";
import type { IPaymentData } from "../src/types.ts";
import fs from "node:fs";
import zmq from "zeromq";
import { getBestProcessor } from "./health-checker.ts";
import bsql from "better-sqlite3";

const sub = new zmq.Subscriber();

const allSuffixes = process.env.ZEROMQ_SUFFIXS!.split(",").map((s) => s.trim());

for (const suffix of allSuffixes) {
  sub.connect(`ipc:///tmp/zeromq${suffix}.sock`);
  console.log(`[zmq] Subscriber connected to ipc:///tmp/zeromq${suffix}.sock`);
}

sub.subscribe("update-payment");

console.log("Starting MemoryDB...");

const database = new bsql(":memory:");
database.pragma("journal_mode = OFF");
database.pragma("synchronous = OFF");

const SOCKET_PATH = process.env.SOCKET_PATH!;

if (fs.existsSync(SOCKET_PATH)) {
  fs.unlinkSync(SOCKET_PATH);
}

const stringifySummary = fastJson({
  title: "Summary",
  type: "object",
  properties: {
    default: {
      type: "object",
      properties: {
        totalRequests: { type: "integer" },
        totalAmount: { type: "number" },
      },
    },
    fallback: {
      type: "object",
      properties: {
        totalRequests: { type: "integer" },
        totalAmount: { type: "number" },
      },
    },
  },
});

database.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    correlationId TEXT PRIMARY KEY,
    requestedAt TEXT NOT NULL,
    processor TEXT NOT NULL,
    amount REAL NOT NULL
  )
`);

database.exec(`
  CREATE INDEX IF NOT EXISTS idx_processor ON payments (processor);
  CREATE INDEX IF NOT EXISTS idx_requestedAt ON payments (requestedAt);
`);

database.exec("DELETE FROM payments");

(async () => {
  for await (const [topicBuf, messageBuf] of sub) {
    const topic = topicBuf.toString();
    if (topic !== "update-payment") continue;

    setImmediate(() => {
      const message = messageBuf.toString();
      const paymentData = JSON.parse(message) as IPaymentData;

      const insertStmt = database.prepare(`
      INSERT INTO payments (correlationId, requestedAt, processor, amount) 
      VALUES (?, ?, ?, ?)
    `);

      insertStmt.run(
        paymentData.correlationId,
        paymentData.requestedAt,
        paymentData.processor,
        paymentData.amount
      );

    });
  }
})();

const server = http.createServer(async (req, res) => {

  req.socket.setNoDelay(true);

  const parsedUrl = url.parse(req.url!, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && pathname === "/summary") {
    const from = query.from as string;
    const to = query.to as string;

    const summary = getSummary(from!, to!);

    res.end(summary);
  } else if (req.method === "GET" && pathname === "/best-processor") {
    try {
      const processor = await getBestProcessor();
      const bestProcessorData = {
        processor: processor.processor,
        url: processor.url,
      };
      res.end(JSON.stringify(bestProcessorData));
    } catch (error) {
      res.statusCode = 500;

      res.end(JSON.stringify({ error: "Failed to get best processor" }));
    }
  } else if (req.method === "POST" && pathname === "/purge") {
    database.exec("DELETE FROM payments");


    res.end(JSON.stringify({ success: true }));
  } else if (req.method === "GET" && pathname === "/get-all") {
    const selectStmt = database.prepare(`
      SELECT * FROM payments
    `);

    const rows = selectStmt.all();

    res.end(JSON.stringify(rows));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(SOCKET_PATH, () => {
  console.log(`MemoryDB is ready and listening on port ${SOCKET_PATH}...`);
  fs.chmodSync(SOCKET_PATH, 0o766);
});

server.on("error", (err) => {
  console.log(`Failed to listen: ${err.message}`);
});

function getSummary(from: string, to: string) {
  console.log("Fetching summary from:", from, "to:", to);

  const selectStmt = database.prepare(`
    SELECT processor, amount 
    FROM payments 
    WHERE requestedAt >= ? AND requestedAt <= ?
  `);

  const rows = selectStmt.all(from, to);

  const summary = {
    default: {
      totalRequests: 0,
      totalAmount: 0,
    },
    fallback: {
      totalRequests: 0,
      totalAmount: 0,
    },
  };

  for (const row of rows) {
    const { processor, amount } = row as {
      processor: "default" | "fallback";
      amount: number;
      data: string;
    };
    if (processor in summary) {
      summary[processor].totalRequests++;
      summary[processor].totalAmount += amount;
    }
  }

  return stringifySummary(summary);
}
