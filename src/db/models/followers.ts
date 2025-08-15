import { pgTable, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { users } from "../schema";

export const followers = pgTable("followers", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id),
	followedId: integer("followed_id").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
