import { pgTable, varchar, text, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const videoComments = pgTable("video_comments", {
	id: serial("id").primaryKey(),
	videoId: integer("video_id"),
	userId: integer("user_id"),
	description: text("description"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: "date" }),
	updatedAt: timestamp("updated_at", { mode: "date" }),
});
