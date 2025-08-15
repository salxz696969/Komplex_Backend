import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { forumComments, users } from "../schema";
export const forumReplies = pgTable("forum_replies", {
	id: serial("id").primaryKey(),
	forumCommentId: integer("forum_comment_id").references(() => forumComments.id),
	userId: integer("user_id").references(() => users.id),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
