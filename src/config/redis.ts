import { Environment } from "./environment";

export const getRedisConnectionUrl = (): string => {
  const redisUrl = Environment.redisUrl;

  if (!redisUrl) {
    throw new Error("REDIS_URL or QUEUE_REDIS_URL is required for BullMQ workers");
  }

  return redisUrl;
};
