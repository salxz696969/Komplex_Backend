import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type.js";
import { blogs } from "./blogs.js";
export const blogMedia = pgTable("blog_media", {
	id: serial("id").primaryKey(),
	blogId: integer("blog_id").references(() => blogs.id),
	url: text("url"),
	urlForDeletion: text("url_for_deletion"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
