import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { forumComments, users } from "../schema";

export const forumCommentLikes = pgTable("forum_comment_likes", {
    id: serial("id").primaryKey(),
    forumCommentId: integer("forum_comment_id").references(() => forumComments.id),
    userId: integer("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueForumCommentUser: [table.forumCommentId, table.userId],
		},
	})
);
