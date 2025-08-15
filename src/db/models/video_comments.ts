import { pgTable, varchar, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { users, videos } from "../schema";

export const videoComments = pgTable("video_comments", {
	id: serial("id").primaryKey(),
	videoId: integer("video_id").references(() => videos.id),
	userId: integer("user_id").references(() => users.id),
	description: text("description"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
