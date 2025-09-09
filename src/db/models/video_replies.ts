import { pgTable, varchar, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { users, videoComments } from "../schema.js";

export const videoReplies = pgTable("video_replies", {
	id: serial("id").primaryKey(),
	videoCommentId: integer("video_comment_id").references(() => videoComments.id),
	userId: integer("user_id").references(() => users.id),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
