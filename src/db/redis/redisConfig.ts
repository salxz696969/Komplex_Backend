import { config } from "dotenv";
import { createClient } from "redis";

config();

export const redis = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 19180,
  },
});

redis.on("error", (err) => console.log("Redis Client Error", err));
