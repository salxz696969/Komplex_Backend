import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const followers = pgTable("followers", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	followedId: integer("followed_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
