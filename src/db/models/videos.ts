import { pgTable, varchar, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { users } from "../schema";

export const videos = pgTable("videos", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	title: text("title"),
	description: text("description"),
	viewCount: integer("view_count"),
	type: text("type"),
	topic: text("topic"),
	videoUrl: text("video_url"),
	videoUrlForDeletion: text("video_url_for_deletion"),
	thumbnailUrl: text("thumbnail_url"),
	thumbnailUrlForDeletion: text("thumbnail_url_for_deletion"),
	duration: integer("duration"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
