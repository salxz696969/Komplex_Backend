// create table user_oauth (
//     id SERIAL PRIMARY KEY,
//     user_id INT REFERENCES users(id),
//     provider VARCHAR, -- 'google', 'discord', etc
//     provider_id VARCHAR, -- unique id from provider
//     created_at TIMESTAMP
// )

import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "../schema";

export const userOauth = pgTable("user_oauth", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: text("provider"),
  providerId: text("provider_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
