import { pgTable, varchar, text, date, boolean, timestamp, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	dateOfBirth: date("date_of_birth"),
	isAdmin: boolean("is_admin"),
	isVerified: boolean("is_verified"),
	email: text("email"),
	password: text("password"),
	phone: text("phone"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
