import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
export const blogMedias = pgTable("blog_medias", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id"),
  url: text("url"),
  mediaType: mediaTypeEnum("media_type"),
  createdAt: timestamp("created_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }),
});
