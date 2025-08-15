import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
import { users, videoComments } from "../schema";

export const videoCommentLike = pgTable("video_comment_like", {
	id: serial("id").primaryKey(),
	videoCommentId: integer("video_comment_id").references(() => videoComments.id),
	userId: integer("user_id").references(() => users.id),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
		uniqueKeys: {
			uniqueVideoCommentUser: [table.videoCommentId, table.userId],
		},
	}));
