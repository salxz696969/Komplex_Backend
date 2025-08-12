import { pgTable, varchar, text, date, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: varchar("id", { length: 36 }).primaryKey(),
	first_name: text("first_name"),
	last_name: text("last_name"),
	date_of_birth: date("date_of_birth"),
	is_admin: boolean("is_admin"),
	is_verified: boolean("is_verified"),
	email: text("email"),
	password: text("password"),
	phone: text("phone"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
