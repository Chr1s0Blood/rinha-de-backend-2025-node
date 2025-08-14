import { request } from "undici";
import type { IBestProcessor, IHealth, IHealthsSummary } from "../src/types.ts";

const bestProcessor = {
  processor: "null",
  url: "",
  expireAt: 0,
};

const healthCheckUrls = {
  default: `${process.env.PAYMENT_PROCESSOR_URL_DEFAULT}/payments/service-health`,
  fallback: `${process.env.PAYMENT_PROCESSOR_URL_FALLBACK}/payments/service-health`,
};

const processorUrls = {
  default: `${process.env.PAYMENT_PROCESSOR_URL_DEFAULT}/payments`,
  fallback: `${process.env.PAYMENT_PROCESSOR_URL_FALLBACK}/payments`,
};

export async function getBestProcessor() {
  if (bestProcessor.expireAt > Date.now()) {
    console.log("Using cached best processor:", bestProcessor);
    return bestProcessor;
  }

  console.log("Fetching health summaries...");

  const healths = await fetchHealthSummaries();

  const processor = handleBestProcessor(healths);

  bestProcessor.processor = processor.processor;
  bestProcessor.url = processor.url;
  bestProcessor.expireAt = Date.now() + 4800;

  return processor;
}

async function fetchHealthSummaries(): Promise<IHealthsSummary> {
  try {
    const defaultHealth = await request(healthCheckUrls.default, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const fallbackHealth = await request(healthCheckUrls.fallback, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (defaultHealth.statusCode !== 200 && fallbackHealth.statusCode !== 200) {
      throw new Error("Both health checks failed");
    }

    const [defaultHealthData, fallbackHealthData] = await Promise.all([
      defaultHealth.body.json(),
      fallbackHealth.body.json(),
    ]);

    console.log("Default Health:", defaultHealthData);
    console.log("Fallback Health:", fallbackHealthData);

    return {
      default: defaultHealthData as IHealth,
      fallback: fallbackHealthData as IHealth,
    };
  } catch (error) {
    console.error("Error fetching both health summaries:", error);
    return {
      default: { failing: true, minResponseTime: 0 },
      fallback: { failing: true, minResponseTime: 0 },
    };
  }
}

function handleBestProcessor(healths: IHealthsSummary): IBestProcessor {
  const defaultHealth = healths.default;
  const fallbackHealth = healths.fallback;

  if (defaultHealth.failing && fallbackHealth.failing) {
    return {
      processor: "none",
      url: "",
    };
  }

  if (defaultHealth.failing) {
    return { processor: "fallback", url: processorUrls.fallback };
  }

  if (fallbackHealth.failing) {
    return { processor: "default", url: processorUrls.default };
  }

  const timeDifference =
    defaultHealth.minResponseTime - fallbackHealth.minResponseTime;

  return timeDifference > 500
    ? { processor: "fallback", url: processorUrls.fallback }
    : { processor: "default", url: processorUrls.default };
}
