import { pgTable, varchar, text, boolean, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const choices = pgTable("choices", {
	id: serial("id").primaryKey(),
	questionId: integer("question_id"),
	text: text("text"),
	isCorrect: boolean("is_correct"),
	createdAt: timestamp("created_at", { mode: "date" }),
});
