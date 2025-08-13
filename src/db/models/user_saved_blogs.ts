import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const userSavedBlogs = pgTable("user_saved_blogs", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	blogId: integer("blog_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
