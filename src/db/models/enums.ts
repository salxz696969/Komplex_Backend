import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("userRole", ["teacher", "student", "admin"]);
export const contentTypeEnum = pgEnum("contentType", [
	"blog",
	"forum",
	"forum_comment",
	"forum_reply",
	"video",
	"video_comment",
	"video_reply",
	"exercise",
	"question",
]);
