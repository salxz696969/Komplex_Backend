import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const question = pgTable("question", {
	id: varchar("id", { length: 36 }).primaryKey(),
	exercise_id: varchar("exercise_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	title: text("title"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
