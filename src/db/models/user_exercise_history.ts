import {
  pgTable,
  varchar,
  integer,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";
import { exercises, users } from "../schema.js";

export const userExerciseHistory = pgTable("user_exercise_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  exerciseId: integer("exercise_id").references(() => exercises.id),
  score: integer("score"),
  timeTaken: integer("time_taken"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
