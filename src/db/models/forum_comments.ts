import { pgTable, varchar, text, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const forumComments = pgTable("forum_comments", {
	id: serial("id").primaryKey(),
	forumId: integer("forum_id"),
	userId: integer("user_id"),
	description: text("description"),
	createdAt: timestamp("created_at", { mode: "date" }),
	updatedAt: timestamp("updated_at", { mode: "date" }),
});
