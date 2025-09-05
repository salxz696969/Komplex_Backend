import { questions } from "../../../../db/models/questions.js";
import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import {
  exercises,
  userExerciseHistory,
  exerciseQuestionHistory
} from "../../../../db/schema.js";
import {
  and,
  avg,
  count,
  countDistinct,
  eq,
  inArray,
  max,
  sql,
} from "drizzle-orm";

export const getExercises = async (req: Request, res: Response) => {
  try {
    const userId = 1; // TO CHANGE

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

    return res.status(200).json(response);

    // console.log(userProgressPerExercise);
    // return res.status(200).json(allExercises);
  } catch (error: any) {
    console.error("Get exercises error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


