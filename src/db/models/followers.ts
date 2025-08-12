import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const followers = pgTable("followers", {
	id: varchar("id", { length: 36 }).primaryKey(),
	user_id: varchar("user_id", { length: 36 }),
	followed_id: varchar("followed_id", { length: 36 }),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
    