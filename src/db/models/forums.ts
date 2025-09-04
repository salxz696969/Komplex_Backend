import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "../schema.js";
export const forums = pgTable("forums", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	title: text("title"),
	description: text("description"),
	viewCount: integer("view_count"),
	type: text("type"),
	topic: text("topic"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
