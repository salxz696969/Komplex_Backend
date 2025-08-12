import { pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const choices = pgTable("choices", {
	id: varchar("id", { length: 36 }).primaryKey(),
	question_id: varchar("question_id", { length: 36 }),
	text: text("text"),
	is_correct: boolean("is_correct"),
	created_at: timestamp("created_at", { mode: "date" }),
});
