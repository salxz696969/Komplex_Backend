import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const blog = pgTable("blog", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	title: text("title"),
	description: text("description"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
