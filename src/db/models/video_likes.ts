import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const video_likes = pgTable("video_likes", {
	id: varchar("id", { length: 36 }).primaryKey(),
	video_id: varchar("video_id", { length: 36 }),
	user_id: varchar("user_id", { length: 36 }),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
