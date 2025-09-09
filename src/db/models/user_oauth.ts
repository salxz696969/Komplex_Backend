// create table user_oauth (
//     id SERIAL PRIMARY KEY,
//     user_id INT REFERENCES users(id),
//     provider VARCHAR, -- 'google', 'discord', etc
//     provider_id VARCHAR, -- unique id from provider
//     created_at TIMESTAMP
// )

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "../schema.js";

export const userOauth = pgTable("user_oauth", {
  id: serial("id").primaryKey(),
  uid: text("uid").references(() => users.uid),
  provider: text("provider"),
  createdAt: timestamp("created_at").defaultNow(),
});
