import { pgTable, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const userVideoHistory = pgTable("user_video_history", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	videoId: integer("video_id"),
	timeWatched: integer("time_watched"),
	watchedAt: timestamp("watched_at").defaultNow(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueUserVideo: [table.userId, table.videoId],
		},
	})
);
