import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media_type";

export const forum_medias = pgTable("forum_medias", {
	id: varchar("id", { length: 36 }).primaryKey(),
	forum_id: varchar("forum_id", { length: 36 }),
	url: text("url"),
	media_type: mediaTypeEnum("media_type"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
