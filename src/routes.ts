import http from "node:http";
import { URL } from "node:url";
import { getSummaryFromDb, purgePayments } from "./services.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CONTENT_TYPE_JSON = { "Content-Type": "application/json" };
const CONTENT_TYPE_TEXT = { "Content-Type": "text/plain" };

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

export async function handleRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  addPaymentToBatch: (payment: any) => void
) {
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
}
