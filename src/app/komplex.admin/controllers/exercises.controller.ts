import { avg, count, eq, inArray, isNull, sum } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  choices,
  exerciseQuestionHistory,
  exercises,
  questions,
  userExerciseHistory,
} from "../../../db/schema.js";

import { Request, Response } from "express";
import { and, sql } from "drizzle-orm";
import { redis } from "../../../db/redis/redisConfig.js";

export const getExercises = async (req: Request, res: Response) => {
  try {
    const { grade } = req.query;
    const cacheKey = `exercises:${grade || "all"}`;
    await redis.del(cacheKey);

    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      return res.status(200).json(JSON.parse(cacheData));
    }

    // Build the base query
    let baseQuery = db
      .select({
        // Basic exercise info
        id: exercises.id,
        duration: exercises.duration,
        title: exercises.title,
        subject: exercises.subject,
        grade: exercises.grade,
        createdAt: exercises.createdAt,
        // Counts and stats
        questionCount: sql<number>`COUNT(DISTINCT ${questions.id})`,
        attemptCount: sql<number>`COUNT(DISTINCT ${userExerciseHistory.id})`,
        averageScore: sql<number>`AVG(${userExerciseHistory.score})`,
      })
      .from(exercises)
      .leftJoin(questions, eq(exercises.id, questions.exerciseId))
      .leftJoin(
        userExerciseHistory,
        eq(exercises.id, userExerciseHistory.exerciseId)
      )
      .where(isNull(exercises.videoId)); // Add this line to filter for null videoId

    // Execute query with or without filters
    let result;
    if (grade) {
      result = await baseQuery.groupBy(exercises.id);
    } else {
      result = await baseQuery.groupBy(exercises.id);
    }
    await redis.set(cacheKey, JSON.stringify(result), { EX: 1 });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Get exercises error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// interface ExerciseInput {
//   duration: number;
//   title: string;
//   description: string;
//   subject: string;
//   topic: string;
//   grade: number;
//   questions: {
//     title: string;
//     questionType: string;
//     section: string;
//     imageUrl: string;
//     choices: {
//       choice: string;
//       isCorrect: boolean;
//     }[];
//   }[];
// }

export const getExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `exercise:${id}`;
    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      return res.status(200).json(JSON.parse(cacheData));
    }

    // Get the exercise
    const exerciseResult = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (!exerciseResult || exerciseResult.length === 0) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    const exercise = exerciseResult[0];

    // Get all questions for this exercise
    const questionsResult = await db
      .select()
      .from(questions)
      .where(eq(questions.exerciseId, parseInt(id)));

    // Get all choices for all questions in this exercise
    const questionIds = questionsResult.map((q) => q.id);

    let allChoices: any[] = [];
    if (questionIds.length > 0) {
      allChoices = await db
        .select()
        .from(choices)
        .where(inArray(choices.questionId, questionIds));
    }

    // Build the nested structure
    const exerciseWithQuestions = {
      id: exercise.id,
      title: exercise.title,
      description: exercise.description,
      subject: exercise.subject,
      grade: exercise.grade,
      duration: exercise.duration,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      questions: questionsResult.map((question) => ({
        id: question.id,
        title: question.title,
        imageUrl: question.imageUrl,
        section: question.section,
        choices: allChoices
          .filter((choice) => choice.questionId === question.id)
          .map((choice) => ({
            id: choice.id,
            text: choice.text,
            isCorrect: choice.isCorrect,
          })),
      })),
    };

    await redis.set(cacheKey, JSON.stringify(exerciseWithQuestions), {
      EX: 60 * 60 * 24,
    });

    return res.status(200).json(exerciseWithQuestions);
  } catch (error: any) {
    console.error("Get exercise error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const createExercise = async (req: Request, res: Response) => {
  try {
    const userId = 1; // TO CHANGE
    const { duration, title, description, subject, grade, exerciseQuestions } =
      req.body;

    const exercise = await db
      .insert(exercises)
      .values({
        userId,
        duration,
        title,
        description,
        subject,
        grade,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: exercises.id });

    // insert to questions
    // we need to insert individually then get the id of question after each insert then create choices with that question id
    for (let question of exerciseQuestions) {
      const result = await db
        .insert(questions)
        .values({
          title: question.title,
          questionType: question.questionType,
          section: question.section,
          imageUrl: question.imageUrl,
          exerciseId: exercise[0].id,
        })
        .returning({ id: questions.id });
      const questionId = result[0].id;
      for (let choice of question.choices) {
        await db.insert(choices).values({
          questionId,
          text: choice.choice,
          isCorrect: choice.isCorrect,
          createdAt: new Date(),
        });
      }
    }

    res.status(201).json({ message: "Exercise created successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Internal server error" + error.message });
  }
};

export const deleteExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `exercise:${id}`;
    // get question ids
    const questionIds = await db
      .select({
        id: questions.id,
      })
      .from(questions)
      .where(eq(questions.exerciseId, parseInt(id)));

    // delete choices
    await db.delete(choices).where(
      inArray(
        choices.questionId,
        questionIds.map((q) => q.id)
      )
    );

    // delete question
    for (let questionId of questionIds) {
      await db
        .delete(exerciseQuestionHistory)
        .where(eq(exerciseQuestionHistory.questionId, questionId.id));
    }
    await db.delete(questions).where(eq(questions.exerciseId, parseInt(id)));

    // delete exercise
    await db
      .delete(userExerciseHistory)
      .where(eq(userExerciseHistory.exerciseId, parseInt(id)));
    await db.delete(exercises).where(eq(exercises.id, parseInt(id)));
    res.status(200).json({ message: "Exercise deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};

export const getExerciseDashboard = async (req: Request, res: Response) => {
  try {
    const cacheKey = `exercise:dashboard`;
    // get total excercises
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
    const result = await db
      .select({
        count: count(exercises.id),
      })
      .from(exercises);
    const totalExercises = result[0].count;

    // get attempts
    const attempts = await db
      .select({
        count: count(userExerciseHistory.id),
      })
      .from(userExerciseHistory);
    const totalAttempts = attempts[0].count;

    // get avarage score
    const totalScores = await db
      .select({
        averageScore: avg(userExerciseHistory.score),
      })
      .from(userExerciseHistory);
    const averageScore = totalScores[0].averageScore
      ? parseFloat(totalScores[0].averageScore)
      : 0;
    const cacheData = {
      totalExercises,
      totalAttempts,
      averageScore,
    };
    await redis.set(cacheKey, JSON.stringify(cacheData), { EX: 60 * 60 * 24 });

    res.status(200).json({
      totalExercises,
      totalAttempts,
      averageScore,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};

export const updateExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { duration, title, description, subject, grade, exerciseQuestions } =
      req.body;
    const cacheKey = `exercise:${id}`;

    const exercise = await db
      .update(exercises)
      .set({ duration, title, description, subject, grade })
      .where(eq(exercises.id, parseInt(id)));

    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    for (let question of exerciseQuestions) {
      await db
        .update(questions)
        .set({
          title: question.title,
          questionType: question.questionType,
          section: question.section,
          imageUrl: question.imageUrl,
        })
        .where(eq(questions.id, parseInt(question.id)));

      for (let choice of question.choices) {
        console.log("choice", choice);
        console.log("question.id", question.id);
        console.log("choice.id", choice.id);

        await db
          .update(choices)
          .set({
            text: choice.text,
            isCorrect: choice.isCorrect,
          })
          .where(eq(choices.id, parseInt(choice.id)));
      }
    }

    await redis.del(cacheKey);
    res.status(200).json({ message: "Exercise updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
    console.error("Update exercise error:", error);
  }
};
