import { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { userExerciseHistory, exercises } from "@/db/schema.js";

export const getExerciseHistory = async (req: Request, res: Response) => {
  try {
    const userId = 1; // TO CHANGE
    const history = await db
      .select()
      .from(userExerciseHistory)
      .leftJoin(exercises, eq(userExerciseHistory.exerciseId, exercises.id))
      .where(eq(userExerciseHistory.userId, userId));

    res.json(
      history.map((his) => ({
        id: his.user_exercise_history.exerciseId,
        title: his.exercises?.title,
        timeTaken: his.user_exercise_history.timeTaken,
        score: his.user_exercise_history.score,
        createdAt: his.user_exercise_history.createdAt?.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error in getExerciseHostory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExerciseDashboard = async (req: Request, res: Response) => {
  try {
    const userId = 1; // TO CHANGE
    const totalExercisesCompleted = await db
      .select({
        count: sql<number>`count(distinct ${userExerciseHistory.exerciseId})`,
      })
      .from(userExerciseHistory)
      .where(eq(userExerciseHistory.userId, userId));
    const totalAttempts = await db
      .select({
        count: sql<number>`count(${userExerciseHistory.id})`,
      })
      .from(userExerciseHistory)
      .where(eq(userExerciseHistory.userId, userId));

    const averageScore = await db
      .select({
        average: sql<number>`avg(${userExerciseHistory.score})`,
      })
      .from(userExerciseHistory)
      .where(eq(userExerciseHistory.userId, userId));

    res.json({
      totalExercisesCompleted: Number(totalExercisesCompleted[0].count),
      totalAttempts: Number(totalAttempts[0].count),
      averageScore: Number(averageScore[0].average),
    });
  } catch (error) {
    console.error("Error in getExerciseDashboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get number of attempts
// highest score
// average score
// get score and questions correct per attempt per section:
// structure like this:

// export interface SectionScore {
//     section: string;
//     score: number;
//     totalQuestions: number;
//     correctAnswers: number;
//   }
