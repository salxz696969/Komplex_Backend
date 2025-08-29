import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type.js";
import { forumComments } from "../schema.js";
export const forumCommentMedias = pgTable("forum_comment_medias", {
    id: serial("id").primaryKey(),
    forumCommentId: integer("forum_comment_id").references(() => forumComments.id),
    url: text("url"),
    urlForDeletion: text("url_for_deletion"),
    mediaType: mediaTypeEnum("media_type"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
