import { redis } from "@/db/redis/redisConfig.js";
import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";

// --- POST Limiters ---
const bigPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 5,
	duration: 60,
	blockDuration: 60,
});

const smallPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const videoPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 2,
	duration: 60,
	blockDuration: 60,
});

// --- UPDATE Limiters ---
const bigUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 5,
	duration: 60,
	blockDuration: 60,
});

const smallUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const videoUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 2,
	duration: 60,
	blockDuration: 60,
});

// --- DELETE Limiters ---
const bigDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const smallDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const videoDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 5,
	duration: 60,
	blockDuration: 60,
});

// --- GET Limiters ---
const getSmallContentLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 30,
	duration: 60,
	blockDuration: 60,
});

const getBigContentLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 20,
	duration: 60,
	blockDuration: 60,
});

const getVideoLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 15,
	duration: 60,
	blockDuration: 60,
});

// --- AI Limiter ---
const aiLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 20,
	duration: 60,
	blockDuration: 60,
});

// --Admin Rate Limiter Middleware Factory --
const adminBigPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 20,
	duration: 60,
	blockDuration: 60,
});

const adminSmallPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 40,
	duration: 60,
	blockDuration: 60,
});

const adminVideoPostLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const adminBigUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 20,
	duration: 60,
	blockDuration: 60,
});

const adminSmallUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 40,
	duration: 60,
	blockDuration: 60,
});

const adminVideoUpdateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 60,
	blockDuration: 60,
});

const adminBigDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 40,
	duration: 60,
	blockDuration: 60,
});

const adminSmallDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 40,
	duration: 60,
	blockDuration: 60,
});

const adminVideoDeleteLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 20,
	duration: 60,
	blockDuration: 60,
});

const adminGetSmallContentLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 120,
	duration: 60,
	blockDuration: 60,
});

const adminGetBigContentLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 80,
	duration: 60,
	blockDuration: 60,
});

const adminGetVideoLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 60,
	duration: 60,
	blockDuration: 60,
});

const adminAiLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 80,
	duration: 60,
	blockDuration: 60,
});

const userLoginLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 5,
	duration: 300, // 5 minutes
	blockDuration: 900, // 15 minutes block if exceeded
});

// Signup limiter: 3 attempts per 10 minutes
const userSignupLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 3,
	duration: 600, // 10 minutes
	blockDuration: 1800, // 30 minutes block if exceeded
});

const adminLoginLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 5,
	duration: 300, // 5 minutes
	blockDuration: 900, // 15 minutes block if exceeded
});

const adminSignupLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 10,
	duration: 300, // 5 minutes
	blockDuration: 900, // 15 minutes block if exceeded
});

export const createRateLimiterMiddleware = (limiter: RateLimiterRedis) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await limiter.consume(req.ip ?? "unknown-ip");
			next();
		} catch {
			res.status(429).json({ message: "Too Many Requests - try again later" });
		}
	};
};

// --- POST Middlewares ---
export const postBigRateLimiter = createRateLimiterMiddleware(bigPostLimiter);
export const postSmallRateLimiter = createRateLimiterMiddleware(smallPostLimiter);
export const postVideoRateLimiter = createRateLimiterMiddleware(videoPostLimiter);

// --- UPDATE Middlewares ---
export const updateBigRateLimiter = createRateLimiterMiddleware(bigUpdateLimiter);
export const updateSmallRateLimiter = createRateLimiterMiddleware(smallUpdateLimiter);
export const updateVideoRateLimiter = createRateLimiterMiddleware(videoUpdateLimiter);

// --- DELETE Middlewares ---
export const deleteBigRateLimiter = createRateLimiterMiddleware(bigDeleteLimiter);
export const deleteSmallRateLimiter = createRateLimiterMiddleware(smallDeleteLimiter);
export const deleteVideoRateLimiter = createRateLimiterMiddleware(videoDeleteLimiter);

// --- GET Middlewares ---
export const getSmallContentRateLimiter = createRateLimiterMiddleware(getSmallContentLimiter);
export const getBigContentRateLimiter = createRateLimiterMiddleware(getBigContentLimiter);
export const getVideoRateLimiter = createRateLimiterMiddleware(getVideoLimiter);

// --- AI Middleware ---
export const aiRateLimiter = createRateLimiterMiddleware(aiLimiter);

// --- Admin Middlewares ---
export const adminBigPostRateLimiter = createRateLimiterMiddleware(adminBigPostLimiter);
export const adminSmallPostRateLimiter = createRateLimiterMiddleware(adminSmallPostLimiter);
export const adminVideoPostRateLimiter = createRateLimiterMiddleware(adminVideoPostLimiter);
export const adminBigUpdateRateLimiter = createRateLimiterMiddleware(adminBigUpdateLimiter);
export const adminSmallUpdateRateLimiter = createRateLimiterMiddleware(adminSmallUpdateLimiter);
export const adminVideoUpdateRateLimiter = createRateLimiterMiddleware(adminVideoUpdateLimiter);
export const adminBigDeleteRateLimiter = createRateLimiterMiddleware(adminBigDeleteLimiter);
export const adminSmallDeleteRateLimiter = createRateLimiterMiddleware(adminSmallDeleteLimiter);
export const adminVideoDeleteRateLimiter = createRateLimiterMiddleware(adminVideoDeleteLimiter);
export const adminGetSmallContentRateLimiter = createRateLimiterMiddleware(adminGetSmallContentLimiter);
export const adminGetBigContentRateLimiter = createRateLimiterMiddleware(adminGetBigContentLimiter);
export const adminAiRateLimiter = createRateLimiterMiddleware(adminAiLimiter);
export const userLoginRateLimiter = createRateLimiterMiddleware(userLoginLimiter);
export const userSignupRateLimiter = createRateLimiterMiddleware(userSignupLimiter);
export const adminLoginRateLimiter = createRateLimiterMiddleware(adminLoginLimiter);
export const adminSignupRateLimiter = createRateLimiterMiddleware(adminSignupLimiter);
export const adminGetVideoRateLimiter = createRateLimiterMiddleware(adminGetVideoLimiter);