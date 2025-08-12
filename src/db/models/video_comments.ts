import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const video_comments = pgTable("video_comments", {
	id: varchar("id", { length: 36 }).primaryKey(),
	video_id: varchar("video_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	description: text("description"),
	image_url: text("image_url"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
