import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	duration: integer("duration"),
	title: text("title"),
	description: text("description"),
	subject: text("subject"),
	topic: text("topic"),
	grade: integer("grade"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
