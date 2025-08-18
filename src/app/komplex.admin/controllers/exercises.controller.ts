import { avg, count, eq, inArray, sum } from "drizzle-orm";
import { db } from "../../../db";
import {
  choices,
  exercises,
  questions,
  userExerciseHistory,
} from "../../../db/schema";

import { Request, Response } from "express";
import { and, sql } from "drizzle-orm";

export const getExercises = async (req: Request, res: Response) => {
  try {
    const { grade, subject } = req.query;

    // Build the base query
    let baseQuery = db
      .select({
        // Basic exercise info
        id: exercises.id,
        topic: exercises.topic,
        duration: exercises.duration,
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
      );

    // Execute query with or without filters
    let result;
    if (grade && subject) {
      result = await baseQuery
        .where(
          and(
            eq(exercises.grade, parseInt(grade as string)),
            eq(exercises.subject, subject as string)
          )
        )
        .groupBy(exercises.id);
    } else {
      result = await baseQuery.groupBy(exercises.id);
    }

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
      topic: exercise.topic,
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
    const {
      duration,
      title,
      description,
      subject,
      topic,
      grade,
      exerciseQuestions,
    } = req.body;

    const exercise = await db
      .insert(exercises)
      .values({
        userId: 1,
        duration,
        title,
        description,
        subject,
        topic,
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
    await db.delete(questions).where(eq(questions.exerciseId, parseInt(id)));

    // delete exercise
    await db.delete(exercises).where(eq(exercises.id, parseInt(id)));
    res.status(200).json({ message: "Exercise deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExerciseDashboard = async (req: Request, res: Response) => {
  try {
    // get total excercises
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

    res.status(200).json({
      totalExercises,
      totalAttempts,
      averageScore,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};
