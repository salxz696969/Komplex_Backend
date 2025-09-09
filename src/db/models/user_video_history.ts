import { pgTable, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { users, videos } from "../schema.js";

export const userVideoHistory = pgTable(
  "user_video_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    videoId: integer("video_id").references(() => videos.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);
