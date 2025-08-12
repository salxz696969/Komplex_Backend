import { pgEnum } from "drizzle-orm/pg-core";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
