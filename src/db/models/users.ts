import {
  pgTable,
  text,
  date,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid"),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  isAdmin: boolean("is_admin"),
  isVerified: boolean("is_verified"),
  isSocial: boolean("is_social"),
  email: text("email"),
  phone: text("phone"),
  profileImage: text("profile_image"),
  profileImageKey: text("profile_image_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
