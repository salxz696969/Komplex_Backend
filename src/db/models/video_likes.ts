import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const videoLikes = pgTable("video_likes", {
	id: serial("id").primaryKey(),
	videoId: integer("video_id"),
	userId: serial("user_id"),
	createdAt: timestamp("created_at", { mode: "date" }),
	updatedAt: timestamp("updated_at", { mode: "date" }),
});
