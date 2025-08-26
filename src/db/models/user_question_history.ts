import { pgTable, serial, integer, boolean } from "drizzle-orm/pg-core";
import { userExerciseHistory } from "./user_exercise_history";
import { questions } from "./questions";

export const exerciseQuestionHistory = pgTable("exercise_question_history", {
  id: serial("id").primaryKey(),
  exerciseHistoryId: integer("exercise_history_id").references(
    () => userExerciseHistory.id
  ),
  questionId: integer("question_id").references(() => questions.id),
  isCorrect: boolean("is_correct").notNull(),
});
