import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id"),
  userId: integer("user_id"),
  title: text("title"),
  questionType: text("question_type"),
//   points: integer("points"),
  section: varchar("section"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }),
});
