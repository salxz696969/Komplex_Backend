import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	title: text("title"),
	description: text("description"),
	view_count: integer("view_count"),
	video_url: text("video_url"),
	thumbnail_url: text("thumbnail_url"),
	duration: integer("duration"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
