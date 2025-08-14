import type { HttpResponse } from "uWebSockets.js";

export function readJsonFromUWS(res: HttpResponse): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer: Buffer | undefined;

    res.onData((ab, isLast) => {
      const chunk = Buffer.from(ab);

      if (isLast) {
        let json;
        const finalBuffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

        try {
          json = JSON.parse(finalBuffer.toString());
          resolve(json);
        } catch (e) {
          console.log(e);
          reject(new Error("JSON Invalid"));
          res.close();
        }
      } else {
        buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;
      }
    });

    res.onAborted(() => {
      reject(new Error("Request aborted"));
    });
  });
}