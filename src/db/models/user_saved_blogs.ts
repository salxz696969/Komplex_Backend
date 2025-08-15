import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { blogs, users } from "../schema";

export const userSavedBlogs = pgTable(
	"user_saved_blogs",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id").references(() => users.id),
		blogId: integer("blog_id").references(() => blogs.id),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		uniqueKeys: {
			uniqueUserBlogSave: [table.userId, table.blogId],
		},
	})
);
