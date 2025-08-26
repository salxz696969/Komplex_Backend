import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { feedbacks } from "./feedbacks";
import { mediaTypeEnum } from "../schema";

export const feedbackMedia = pgTable("feedback_media", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").references(() => feedbacks.id),
  publicUrl: text("public_url"),
  secureUrl: text("secure_url"),
  mediaType: mediaTypeEnum("media_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
