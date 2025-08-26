import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  duration: integer("duration"),
  title: text("title"),
  description: text("description"),
  subject: text("subject"),
  grade: varchar("grade"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
