import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const forum_comment = pgTable("forum_comment", {
	id: varchar("id", { length: 36 }).primaryKey(),
	forum_id: varchar("forum_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	description: text("description"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
