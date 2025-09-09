import { pgTable, varchar, text, boolean, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { questions } from "../schema.js";

export const choices = pgTable("choices", {
	id: serial("id").primaryKey(),
	questionId: integer("question_id").references(() => questions.id),
	text: text("text"),
	isCorrect: boolean("is_correct"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
