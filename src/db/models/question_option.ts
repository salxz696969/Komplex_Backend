import { pgTable, varchar, text, boolean } from "drizzle-orm/pg-core";

export const question_option = pgTable("question_option", {
	id: varchar("id", { length: 36 }).primaryKey(),
	question_id: varchar("question_id", { length: 36 }),
	text: text("text"),
	is_correct: boolean("is_correct"),
});
