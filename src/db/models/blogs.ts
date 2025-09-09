import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "../schema.js";

export const blogs = pgTable("blogs", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	title: text("title"),
	description: text("description"),
	type: text("type"),
	topic: text("topic"),
	viewCount: integer("view_count"),
	likeCount: integer("like_amount"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
