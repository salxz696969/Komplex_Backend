import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type.js";
import { forumReplies } from "../schema.js";
export const forumReplyMedias = pgTable("forum_reply_medias", {
    id: serial("id").primaryKey(),
    forumReplyId: integer("forum_reply_id").references(() => forumReplies.id),
    url: text("url"),
    urlForDeletion: text("url_for_deletion"),
    mediaType: mediaTypeEnum("media_type"),
    createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
