import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
export const blogMedia = pgTable("blog_media", {
	id: serial("id").primaryKey(),
	blogId: integer("blog_id"),
	url: text("url"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
