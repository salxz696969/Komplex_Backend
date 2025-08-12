import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
	id: varchar("id", { length: 36 }).primaryKey(),
	exercise_id: varchar("exercise_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	title: text("title"),
	question_type: text("question_type"),
	points: integer("points"),
	image_url: text("image_url"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
