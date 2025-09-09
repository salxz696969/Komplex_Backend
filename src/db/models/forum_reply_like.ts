import { table } from "console";
import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { forumReplies, users } from "../schema.js";

export const forumReplyLikes = pgTable("forum_reply_likes", {
    id: serial("id").primaryKey(),
    forumReplyId: integer("forum_reply_id").references(() => forumReplies.id),
    userId: integer("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueForumReplyUser: [table.forumReplyId, table.userId],
		},
	})
);
