import { MessagePort, parentPort, workerData } from "node:worker_threads";
import type {
  IBestProcessor,
  IPaymentDataRaw,
} from "../types.ts";
import { request, Pool } from "undici";
import fastJson from "fast-json-stringify";
import { fetchBestProcessor } from "../services.ts";
import zmq from "zeromq";

const MAX_RETRY_ATTEMPTS = 30;

const stringifyPayloadToProcessor = fastJson({
  title: "PayloadToProcessor",
  type: "object",
  properties: {
    correlationId: { type: "string" },
    amount: { type: "number" },
    requestedAt: { type: "string" },
    processor: { type: "string" }
  },
});

const undiciPools = new Map<string, Pool>();
function getUndiciPoolFor(urlStr: string) {
  const u = new URL(urlStr);
  const origin = `${u.protocol}//${u.host}`;
  let pool = undiciPools.get(origin);
  if (!pool) {
    pool = new Pool(origin, {
      connections: 50,
      pipelining: 5,
      keepAliveTimeout: 10000,
      keepAliveMaxTimeout: 30000
    });
    undiciPools.set(origin, pool);
  }
  return pool;
}

const PROCESSING_CONCURRENCY = 300;

const pub = new zmq.Publisher({
  sendHighWaterMark: 100000
});

const bind = workerData.bind!

await pub.bind(bind);
console.log(`[zmq] Publisher bind ${bind}`);

const queue: any[] = [];
let sending = false;
let batchTimer: NodeJS.Timeout | null = null;

async function sendQueued(msg: any) {
  queue.push(msg);
  
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  batchTimer = setTimeout(async () => {
    if (sending || queue.length === 0) return;
    
    sending = true;
    const batch = queue.splice(0, Math.min(queue.length, 50));
    
    try {
      for (const msg of batch) {
        await pub.send(msg);
      }
    } catch (error) {
      console.error("[zmq] Batch send error:", error);
    }
    
    sending = false;
    
    if (queue.length > 0) {
      setTimeout(() => sendQueued(queue.shift()), 5);
    }
  }, 5);
}

const BEST_PROCESSOR_TTL_MS = 500;
let bestProcessorCache: { value: IBestProcessor; expiresAt: number } | null = null;
let bestProcessorInflight: Promise<IBestProcessor> | null = null;

async function getBestProcessor(): Promise<IBestProcessor> {
  const now = Date.now();

  if (bestProcessorCache && bestProcessorCache.expiresAt > now) {
    return bestProcessorCache.value;
  }

  if (!bestProcessorInflight) {
    const startedAt = now;
    bestProcessorInflight = fetchBestProcessor()
      .then((val) => {
        const v = val as IBestProcessor;
        bestProcessorCache = { value: v, expiresAt: startedAt + BEST_PROCESSOR_TTL_MS };
        return v;
      })
      .finally(() => {
        bestProcessorInflight = null;
      });
  }

  return bestProcessorInflight;
}

class PaymentQueue {
  private queue: Array<{ data: IPaymentDataRaw; retries: number; nextRetryAt: number }> = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = PROCESSING_CONCURRENCY;
  private isIdle = false;
  private idleCheckInterval: NodeJS.Timeout | null = null;

  async add(data: IPaymentDataRaw, retries = 0) {
    this.queue.push({
      data,
      retries,
      nextRetryAt: Date.now()
    });
    
    if (!this.isIdle) {
      this.processNext();
    }
  }

  private processNext() {
    if (this.activeWorkers >= this.maxConcurrency || this.isIdle) return;
    
    const now = Date.now();
    const itemIndex = this.queue.findIndex(item => item.nextRetryAt <= now);
    
    if (itemIndex === -1) {
      const nextItem = this.queue.reduce((closest, item) => 
        item.nextRetryAt < closest.nextRetryAt ? item : closest, 
        { nextRetryAt: Infinity }
      );
      
      if (nextItem.nextRetryAt !== Infinity) {
        setTimeout(() => this.processNext(), Math.min(nextItem.nextRetryAt - now, 10000));
      }
      return;
    }

    const item = this.queue.splice(itemIndex, 1)[0];
    this.activeWorkers++;

    this.processPayment(item)
      .finally(() => {
        this.activeWorkers--;

        if (this.queue.length > 0 && !this.isIdle) {
          setImmediate(() => this.processNext());
        }
      });
  }

  private async processPayment(item: { data: IPaymentDataRaw; retries: number; nextRetryAt: number }) {
    try {

      if (item.retries >= MAX_RETRY_ATTEMPTS) {
        console.log("Max retries reached, giving up:", item.data.correlationId);
        return;
      }

      const requestedAt = new Date().toISOString();
      const bestProcessor = await getBestProcessor();
      if (bestProcessor.processor === "none") {
        this.enterIdleMode();
        this.queue.unshift(item);
        return;
      }

      const stringData = stringifyPayloadToProcessor({
        ...item.data,
        requestedAt,
        processor: bestProcessor.processor
      });

      const response = await request(bestProcessor.url, {
        method: "POST",
        body: stringData,
        headers: { "Content-Type": "application/json" },
        dispatcher: getUndiciPoolFor(bestProcessor.url),
      });

      const status = response.statusCode;
      const success = status >= 200 && status < 300;

      if (success) {
        const published = await safePublish("update-payment", stringData);
        if (published) {
          return;
        }
      }

      this.scheduleRetry(item);

    } catch (error) {
      this.scheduleRetry(item);
    }
  }

  private enterIdleMode() {
    if (this.isIdle) return;
    
    this.isIdle = true;
    console.log("[PaymentQueue] Entering idle mode - no processors available");
    
    this.idleCheckInterval = setInterval(async () => {
      try {
        const bestProcessor = await getBestProcessor();
        if (bestProcessor.processor !== "none") {
          this.exitIdleMode();
        }
      } catch (error) {
        console.error("[PaymentQueue] Error checking processors during idle:", error);
      }
    }, 5000);
  }

  private exitIdleMode() {
    if (!this.isIdle) return;
    
    this.isIdle = false;
    console.log("[PaymentQueue] Exiting idle mode - processors available again");
    
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    
    if (this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }

  private scheduleRetry(item: { data: IPaymentDataRaw; retries: number; nextRetryAt: number }) {
    if (item.retries >= MAX_RETRY_ATTEMPTS) return;

    const delay = Math.min(Math.pow(2, item.retries) * 1000, 10000);
    
    this.queue.push({
      ...item,
      retries: item.retries + 1,
      nextRetryAt: Date.now() + delay
    });
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      activeWorkers: this.activeWorkers,
      isIdle: this.isIdle
    };
  }
}

const paymentQueue = new PaymentQueue();

if (parentPort) {
  parentPort.once("message", ({port}: {port: MessagePort}) => {
    port.on("message", (data: IPaymentDataRaw[]) => {
      for (const item of data) {
        paymentQueue.add(item);
      }
    });
  });
}

async function safePublish(channel: string, payload: string): Promise<boolean> {
  try {
    await sendQueued([channel, payload]);
    return true;
  } catch (err) {
    console.error("[publish] Erro ao enviar via ZeroMQ:", err);
    return false;
  }
}

// setInterval(() => {
//   const stats = paymentQueue.getStats();
//   console.log("[PaymentQueue] Stats:", stats);
// }, 10000);