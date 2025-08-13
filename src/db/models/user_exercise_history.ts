import { pgTable, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const userExerciseHistory = pgTable("user_exercise_history", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	exerciseId: integer("exercise_id"),
	score: integer("score"),
	timeTaken: integer("time_taken"),
	completedAt: timestamp("completed_at").defaultNow(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
