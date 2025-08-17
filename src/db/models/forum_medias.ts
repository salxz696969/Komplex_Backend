import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";
import { forums } from "../schema";
export const forumMedias = pgTable("forum_medias", {
	id: serial("id").primaryKey(),
	forumId: integer("forum_id").references(() => forums.id),
	url: text("url"),
	urlForDeletion: text("url_for_deletion"),
	mediaType: mediaTypeEnum("media_type"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
