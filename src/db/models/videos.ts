import { pgTable, varchar, text, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	title: text("title"),
	description: text("description"),
	viewCount: integer("view_count"),
	videoUrl: text("video_url"),
	thumbnailUrl: text("thumbnail_url"),
	duration: integer("duration"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
