import { Request, Response } from "express";
import { eq, count, max, inArray, and } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  exercises,
  questions,
  userExerciseHistory,
  choices,
} from "@/db/schema.js";

export const getExercises = async (req: Request, res: Response) => {
  try {
    const { grade } = req.query;
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
      .from(exercises)
      .where(eq(exercises.grade, grade as string));

    let userExerciseWithProgress: any[] = [];

    for (const exercise of allExercises) {
      const numberOfQuestions = await db
        .select({
          numberOfQuestions: count(questions.id),
        })
        .from(questions)
        .where(eq(questions.exerciseId, exercise.id));

      const userProgress = await db
        .select({
          numberOfAttempts: count(userExerciseHistory.id),
          highestScore: max(userExerciseHistory.score),
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
        numberOfQuestions: numberOfQuestions[0].numberOfQuestions,
        numberOfAttempts: userProgress[0].numberOfAttempts,
        highestScore: userProgress[0].highestScore,
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

    for (const question of exerciseWithQuestions.questions) {
      const randomizedChoices = question.choices.sort(
        () => Math.random() - 0.5
      );
      question.choices = randomizedChoices;
    }

    return res.status(200).json(exerciseWithQuestions);
  } catch (error: any) {
    console.error("Get exercise error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
