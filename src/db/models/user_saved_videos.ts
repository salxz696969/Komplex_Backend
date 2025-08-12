import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const user_saved_videos = pgTable("user_saved_videos", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	video_id: varchar("video_id", { length: 36 }),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
