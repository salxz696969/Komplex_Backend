import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const user_video_history = pgTable("user_video_history", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	video_id: varchar("video_id", { length: 36 }),
	time_watched: integer("time_watched"),
	watched_at: timestamp("watched_at", { mode: "date" }),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
