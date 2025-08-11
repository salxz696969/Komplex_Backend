import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { contentTypeEnum } from "./enums";

export const likes = pgTable("likes", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	content_type: contentTypeEnum("content_type"),
	content_id: varchar("content_id", { length: 36 }),
	created_at: timestamp("created_at", { mode: "date" }),
});
