import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const forumLikes = pgTable("forum_likes", {
	id: serial("id").primaryKey(),
	forumId: integer("forum_id"),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { mode: "date" }),
	updatedAt: timestamp("updated_at", { mode: "date" }),
});
