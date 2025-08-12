import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const forum_likes = pgTable("forum_likes", {
	id: varchar("id", { length: 36 }).primaryKey(),
	forum_id: varchar("forum_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
