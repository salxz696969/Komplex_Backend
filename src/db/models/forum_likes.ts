import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { forums, users } from "../schema.js";

export const forumLikes = pgTable(
	"forum_likes",
	{
		id: serial("id").primaryKey(),
		forumId: integer("forum_id").references(() => forums.id),
		userId: integer("user_id").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		uniqueKeys: {
			uniqueUserForumLike: [table.userId, table.forumId],
		},
	})
);
