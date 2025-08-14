import { table } from "console";
import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const userSavedVideos = pgTable("user_saved_videos", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	videoId: serial("video_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueUserVideo: [table.userId, table.videoId],
		},
	})
);
