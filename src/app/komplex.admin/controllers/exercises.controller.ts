import { avg, count, eq, inArray, sum } from "drizzle-orm";
import { db } from "../../../db";
import {
  choices,
  exercises,
  questions,
  userExerciseHistory,
} from "../../../db/schema";

import { Request, Response } from "express";

export const getExercises = async (req: Request, res: Response) => {
  try {
    const { all, grade, subject } = req.query;
    if (all || (!grade && !subject)) {
      const result = await db.select().from(exercises);
      res.status(200).json(result);
    } else if (grade && subject) {
      const result = await db
        .select()
        .from(exercises)
        .where(
          eq(exercises.grade, parseInt(grade as string)) &&
            eq(exercises.subject, subject as string)
        );
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};

export const createExercise = async (req: Request, res: Response) => {
  try {
    const { duration, title, description, subject, topic, grade } = req.body;
    const exercise = await db.insert(exercises).values({
      userId: 1,
      duration,
      title,
      description,
      subject,
      topic,
      grade,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
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
