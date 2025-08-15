import { pgTable, varchar, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { exercises, users } from "../schema";

export const questions = pgTable("questions", {
	id: serial("id").primaryKey(),
	exerciseId: integer("exercise_id").references(() => exercises.id),
	userId: integer("user_id").references(() => users.id),
	title: text("title"),
	questionType: text("question_type"),
	points: integer("points"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
