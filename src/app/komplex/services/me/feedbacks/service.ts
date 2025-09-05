import { db } from "@/db/index.js";
import { feedbacks } from "@/db/schema.js";

export const createFeedback = async (body: any, userId: number) => {
  const { content, type } = body;
  const feedback = await db
    .insert(feedbacks)
    .values({
      content,
      type,
      userId,
      status: "unresolved",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return { data: feedback };
};
