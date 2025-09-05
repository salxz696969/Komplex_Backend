import { pgTable, varchar, integer, timestamp, serial, text } from "drizzle-orm/pg-core";
import { users, videos } from "../schema.js";

export const userAIHistory = pgTable("user_ai_history", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	aiResult: text("ai_result"),
	prompt: text("prompt"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
