import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const forum_replies = pgTable("forum_replies", {
	id: varchar("id", { length: 36 }).primaryKey(),
	forum_comment_id: varchar("forum_comment_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	description: text("description"),
	image_url: text("image_url"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
