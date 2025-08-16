import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
import { forumReplies } from "../schema";
export const forumReplyMedias = pgTable("forum_reply_medias", {
    id: serial("id").primaryKey(),
    forumReplyId: integer("forum_reply_id").references(() => forumReplies.id),
    url: text("url"),
    mediaType: mediaTypeEnum("media_type"),
    createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
