import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
import { videoComments } from "../schema";

export const videoCommentMedias = pgTable("video_comment_medias", {
	id: serial("id").primaryKey(),
	videoCommentId: integer("video_comment_id").references(() => videoComments.id),
	url: text("url"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
