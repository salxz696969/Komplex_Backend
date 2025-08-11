import { pgTable, varchar, date, text, timestamp } from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";

export const user = pgTable("user", {
	id: varchar("id", { length: 36 }).primaryKey(),
	first_name: text("first_name"),
	last_name: text("last_name"),
	DOB: date("dob"),
	role: userRoleEnum("role"),
	email: text("email"),
	password: text("password"),
	phone: text("phone"),
	created_at: timestamp("created_at", { mode: "date" }),
	updated_at: timestamp("updated_at", { mode: "date" }),
});
