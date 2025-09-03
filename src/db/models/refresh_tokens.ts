import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "../schema";

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
