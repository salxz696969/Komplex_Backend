import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const blogs = pgTable("blogs", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	title: text("title"),
	description: text("description"),
	image_url: text("image_url"),
	view_count: integer("view_count"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
