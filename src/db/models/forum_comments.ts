import { pgTable, varchar, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { forums, users } from "../schema.js";

export const forumComments = pgTable("forum_comments", {
	id: serial("id").primaryKey(),
	forumId: integer("forum_id").references(() => forums.id),
	userId: integer("user_id").references(() => users.id),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
