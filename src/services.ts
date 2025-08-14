import { Client } from "undici";
import type { IBestProcessor, IPaymentData } from "./types.ts";

const client = new Client("http://localhost", {
  socketPath: process.env.SOCKET_PATH!,
  pipelining: 20,
});

export async function getSummaryFromDb(from: string, to: string) {
  const res = await client.request({
    path: `/summary?from=${from}&to=${to}`,
    method: "GET",
  });

  return res.body.text();
}

export async function fetchBestProcessor(): Promise<IBestProcessor | null> {
  const response = await client.request({
    method: "GET",
    path: `/best-processor`,
  });

  const data = (await response.body.json()) as IBestProcessor;
  return data;
}

export async function purgePayments(): Promise<void> {
    await client.request({
      method: "POST",
      path: `/purge`,
    });
}

export async function getAllPayments(): Promise<IPaymentData[]> {
  const response = await client.request({
    method: "GET",
    path: `/get-all`,
  });

  const data = (await response.body.json()) as IPaymentData[];
  return data;
}