import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { redis } from "./db/redis/redisConfig.js";

import routes from "./app/komplex/routes/index.js";
import adminRoutes from "./app/komplex.admin/routes/index.js";
import { globalRateLimiter } from "./middleware/redisLimiter.js";
import { db } from "./db/index.js";
import {
	blogMedia,
	blogs,
	forumComments,
	forumMedias,
	forumReplies,
	forums,
	videoComments,
	videoReplies,
	videos,
} from "./db/schema.js";
import { meilisearch } from "./config/meilisearchConfig.js";
import { faker } from "@faker-js/faker";
import { comments, data, replies } from "./seed/data.js";
dotenv.config();

const app = express();

try {
	await redis.connect();
	console.log("Redis connected:", redis.isOpen);
	const PORT = process.env.PORT || 6000;

	app.listen(PORT, () => {
		console.log(`🚀 Server is running on http://localhost:${PORT}`);
		console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
		console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "Set" : "NOT SET"}`);
	});
} catch (err) {
	console.error("Failed to connect to Redis:", err);
}
// middleware

// Enhanced error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
	console.error("🚨 Express Error Middleware:");
	console.error("Error:", err);
	console.error("Stack trace:", err.stack);
	console.error("Request URL:", req.url);
	console.error("Request method:", req.method);
	console.error("Request body:", req.body);
	console.error("Request params:", req.params);
	console.error("Request query:", req.query);

	res.status(500).json({
		message: "Internal Server Error",
		error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
	});
});

app.use(
	cors({
		origin: [process.env.CORS_ORIGIN as string, "http://localhost:3000", "http://localhost:4000"],
		credentials: true,
	})
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

app.use(globalRateLimiter);
app.get("/ping", (req, res) => {
	res.status(200).send("pong");
});

app.use("/api/", routes);
app.use("/api/admin", adminRoutes);

// connection

app.get("/seedDb", async (req, res) => {
	try {
		for (let i = 0; i < data.length; i++) {
			const d = data[i];

			// Insert blog and get the generated ID
			const blog = await db
				.insert(blogs)
				.values({
					userId: faker.number.int({ min: 1, max: 10 }),
					title: d.title,
					description: d.description,
					type: d.type,
					topic: d.topic,
					viewCount: faker.number.int({ min: 0, max: 1000 }),
					likeCount: faker.number.int({ min: 0, max: 500 }),
				})
				.returning({ id: blogs.id });
			const blogId = blog[0].id;

			await db.insert(blogMedia).values({
				blogId,
				url: faker.image.url(),
				urlForDeletion: "nth",
				mediaType: "image",
			});

			// Insert forum and get ID
			const forum = await db
				.insert(forums)
				.values({
					userId: faker.number.int({ min: 1, max: 10 }),
					title: d.title,
					description: d.description,
					type: d.type,
					topic: d.topic,
					viewCount: faker.number.int({ min: 0, max: 1000 }),
				})
				.returning({ id: forums.id });
			const forumId = forum[0].id;

			await db.insert(forumMedias).values({
				forumId,
				url: faker.image.url(),
				urlForDeletion: "nth",
				mediaType: "image",
			});

			// Insert video and get ID
			const video = await db
				.insert(videos)
				.values({
					userId: faker.number.int({ min: 1, max: 10 }),
					videoUrlForDeletion: "nth",
					videoUrl: "https://youtu.be/SigJxFXKaIU?si=HiQOUyziyZj_29mr",
					thumbnailUrlForDeletion: "nth",
					thumbnailUrl: faker.image.url(),
					title: d.title,
					description: d.description,
					duration: faker.number.int({ min: 30, max: 300 }),
					type: d.type,
					topic: d.topic,
					viewCount: faker.number.int({ min: 0, max: 1000 }),
				})
				.returning({ id: videos.id });
			const videoId = video[0].id;

			// Insert comments and replies
			for (let j = 0; j < 10; j++) {
				const forumComment = await db
					.insert(forumComments)
					.values({
						forumId,
						userId: faker.number.int({ min: 1, max: 10 }),
						description: comments[faker.number.int({ min: 0, max: comments.length - 1 })],
					})
					.returning({ id: forumComments.id });
				const forumCommentId = forumComment[0].id;

				const videoComment = await db
					.insert(videoComments)
					.values({
						videoId,
						userId: faker.number.int({ min: 1, max: 10 }),
						description: comments[faker.number.int({ min: 0, max: comments.length - 1 })],
					})
					.returning({ id: videoComments.id });
				const videoCommentId = videoComment[0].id;

				for (let k = 0; k < 5; k++) {
					await db.insert(forumReplies).values({
						forumCommentId,
						userId: faker.number.int({ min: 1, max: 10 }),
						description: replies[faker.number.int({ min: 0, max: replies.length - 1 })],
					});

					await db.insert(videoReplies).values({
						videoCommentId,
						userId: faker.number.int({ min: 1, max: 10 }),
						description: replies[faker.number.int({ min: 0, max: replies.length - 1 })],
					});
				}
			}
		}
		res.status(200).json({ message: "Database seeded successfully" });
	} catch (error) {
		console.error("Error seeding database:", error);
		res.status(500).json({ message: "Failed to seed database" });
	}
});

// Global error handlers for uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error("🚨 UNCAUGHT EXCEPTION:", error);
	console.error("Stack trace:", error.stack);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("🚨 UNHANDLED REJECTION at:", promise);
	console.error("Reason:", reason);
	process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("🛑 SIGTERM received, shutting down gracefully");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("🛑 SIGINT received, shutting down gracefully");
	process.exit(0);
});
