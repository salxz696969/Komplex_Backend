import { Request, Response } from "express";
import { eq, sql, and, count, max } from "drizzle-orm";
import { db } from "@/db/index.js";
import { userExerciseHistory, exercises } from "@/db/schema.js";

export const getExercises = async (userId: number) => {
  // get all exercises with questions and choices
  const allExercises = await db
    .select({
      id: exercises.id,
      title: exercises.title,
      duration: exercises.duration,
      subject: exercises.subject,
      grade: exercises.grade,
    })
    .from(exercises);

  let userExerciseWithProgress: any[] = [];

  for (const exercise of allExercises) {
    const userProgress = await db
      .select({
        numberOfAttempts: count(userExerciseHistory.id),
        highestScore: max(userExerciseHistory.score),
        lastAttempt: max(userExerciseHistory.createdAt),
      })
      .from(userExerciseHistory)
      .where(
        and(
          eq(userExerciseHistory.userId, userId),
          eq(userExerciseHistory.exerciseId, exercise.id)
        )
      );

    userExerciseWithProgress.push({
      ...exercise,
      numberOfAttempts: userProgress[0].numberOfAttempts,
      highestScore: userProgress[0].highestScore,
      lastAttempt: userProgress[0].lastAttempt,
    });
  }

  const subjects = [
    ...new Set(userExerciseWithProgress.map((exercise) => exercise.subject)),
  ];

  let response: any = {};

  for (const subject of subjects) {
    response[subject] = userExerciseWithProgress.filter(
      (exercise) => exercise.subject === subject
    );
  }

  return { data: response };
};

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
