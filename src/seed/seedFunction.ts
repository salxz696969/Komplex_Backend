import { meilisearch } from "@/config/meilisearchConfig.js";
import { db } from "@/db/index.js";
import { blogs, forums, videos } from "@/db/schema.js";

export const seedSearch = async () => {
	const blogsFromDb = await db
		.select({ id: blogs.id, title: blogs.title, description: blogs.description, topic: blogs.topic })
		.from(blogs);
	const forumsFromDb = await db
		.select({ id: forums.id, title: forums.title, description: forums.description, topic: forums.topic })
		.from(forums);
	const videosFromDb = await db
		.select({ id: videos.id, title: videos.title, description: videos.description, topic: videos.topic })
		.from(videos);
	for (let i = 0; i < blogsFromDb.length; i++) {
		await meilisearch.index("blogs").addDocuments([blogsFromDb[i]]);
	}
	for (let i = 0; i < forumsFromDb.length; i++) {
		await meilisearch.index("forums").addDocuments([forumsFromDb[i]]);
	}
	for (let i = 0; i < videosFromDb.length; i++) {
		await meilisearch.index("videos").addDocuments([videosFromDb[i]]);
	}
};