import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const forumCommentLikes = pgTable("forum_comment_likes", {
    id: serial("id").primaryKey(),
    forumCommentId: integer("forum_comment_id"),
    userId: integer("user_id"),
    createdAt: timestamp("created_at", { mode: "date" }),
    updatedAt: timestamp("updated_at", { mode: "date" }),
});
