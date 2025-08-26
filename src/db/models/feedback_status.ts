import { pgEnum } from "drizzle-orm/pg-core";

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "resolved",
  "unresolved",
  "dismissed",
]);
