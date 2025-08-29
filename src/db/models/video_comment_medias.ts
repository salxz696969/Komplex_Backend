import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type.js";
import { users, videoComments } from "../schema.js";

export const videoCommentMedias = pgTable("video_comment_medias", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	urlForDeletion: text("url_for_deletion"),
	videoCommentId: integer("video_comment_id").references(() => videoComments.id),
	url: text("url"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
