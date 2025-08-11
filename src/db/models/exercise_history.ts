import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const exercise_history = pgTable("exercise_history", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	exercise_id: varchar("exercise_id", { length: 36 }),
	score: integer("score"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
