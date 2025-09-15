import { db } from "../db/index.js";
import { videos, blogs, forums } from "../db/schema.js";
import { meilisearch } from "../config/meilisearchConfig.js";
import { data } from "./data.js";
export const seedSearch = async () => {
	const videosFromDb = await db
		.select({
			id: videos.id,
			title: videos.title,
			description: videos.description,
			type: videos.type,
			topic: videos.topic,
		})
		.from(videos);
	const blogsFromDb = await db
		.select({ id: blogs.id, title: blogs.title, type: blogs.type, topic: blogs.topic })
		.from(blogs);
	const forumsFromDb = await db
		.select({ id: forums.id, title: forums.title, type: forums.type, topic: forums.topic })
		.from(forums);
	for (const video of videosFromDb) {
		await meilisearch.index("videos").addDocuments([video]);
	}
	for (const blog of blogsFromDb) {
		await meilisearch.index("blogs").addDocuments([blog]);
	}
	for (const forum of forumsFromDb) {
		await meilisearch.index("forums").addDocuments([forum]);
	}
};

// export const seedDb=async(dbName: string)=>{
//   // Add your seeding logic here based on the dbName parameter
//   if(dbName==="videos"){
//     await db.insert(videos).values()}
