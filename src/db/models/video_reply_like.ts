import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { videoReplies } from "./video_replies.js";
import { mediaTypeEnum } from "./media_type.js";
import { users } from "../schema.js";

export const videoReplyLike = pgTable("video_reply_like", {
	id: serial("id").primaryKey(),
	videoReplyId: integer("video_reply_id").references(() => videoReplies.id),
	userId: integer("user_id").references(() => users.id),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
},
(table) => ({
		uniqueKeys: {
			uniqueVideoReplyUser: [table.videoReplyId, table.userId],
		},
	}));
