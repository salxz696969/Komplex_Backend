import { table } from "console";
import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { users, videos } from "../schema";

export const userSavedVideos = pgTable("user_saved_videos", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	videoId: serial("video_id").references(() => videos.id),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueUserVideo: [table.userId, table.videoId],
		},
	})
);
