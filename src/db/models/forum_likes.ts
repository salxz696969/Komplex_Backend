import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const forumLikes = pgTable(
	"forum_likes",
	{
		id: serial("id").primaryKey(),
		forumId: integer("forum_id"),
		userId: integer("user_id"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		uniqueKeys: {
			uniqueUserForumLike: [table.userId, table.forumId],
		},
	})
);
