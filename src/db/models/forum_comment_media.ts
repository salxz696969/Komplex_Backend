import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
export const forumCommentMedias = pgTable("forum_comment_medias", {
    id: serial("id").primaryKey(),
    forumCommentId: integer("forum_comment_id"),
    url: text("url"),
    mediaType: mediaTypeEnum("media_type"),
    createdAt: timestamp("created_at", { mode: "date" }),
    updatedAt: timestamp("updated_at", { mode: "date" })
});
