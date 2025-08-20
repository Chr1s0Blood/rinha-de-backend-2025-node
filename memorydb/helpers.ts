import type { HttpResponse } from "uWebSockets.js";

export function readJsonFromUWS(res: HttpResponse): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    res.onData((ab, isLast) => {
      const chunk = Buffer.from(ab);
      chunks.push(chunk);
      totalSize += chunk.length;

      if (isLast) {
        try {
          const finalBuffer = Buffer.concat(chunks, totalSize);
          const json = JSON.parse(finalBuffer.toString());
          resolve(json);
        } catch (e) {
          reject(new Error("JSON Invalid"));
          res.close();
        }
      }
    });

    res.onAborted(() => {
      reject(new Error("Request aborted"));
    });
  });
}