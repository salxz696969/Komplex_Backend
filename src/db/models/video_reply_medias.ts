import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { videoReplies } from "./video_replies";
import { mediaTypeEnum } from "./media_type";
import { users } from "../schema";

export const videoReplyMedias = pgTable("video_reply_medias", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	urlForDeletion: text("url_for_deletion"),
	videoReplyId: integer("video_reply_id").references(() => videoReplies.id),
	url: text("url"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
