import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const forumReplyLikes = pgTable("forum_reply_likes", {
    id: serial("id").primaryKey(),
    forumReplyId: integer("forum_reply_id"),
    userId: integer("user_id"),
    createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
