import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const blogs = pgTable("blogs", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	title: text("title"),
	description: text("description"),
	type: text("type"),
	topic: text("topic"),
	viewCount: integer("view_count"),
	likeCount: integer("like_count"),
	createdAt: timestamp("created_at", { mode: "date" }),
	updatedAt: timestamp("updated_at", { mode: "date" }),
});
