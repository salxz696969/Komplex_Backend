import { table } from "console";
import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const videoLikes = pgTable(
	"video_likes",
	{
		id: serial("id").primaryKey(),
		videoId: integer("video_id"),
		userId: serial("user_id"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		uniqueKeys: {
			uniqueVideoUserLike: [table.videoId, table.userId],
		},
	})
);
