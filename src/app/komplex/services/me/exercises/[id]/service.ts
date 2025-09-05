import { Request, Response } from "express";
import { and, eq, max, count, avg } from "drizzle-orm";
import { db } from "../../../../../db/index.js";
import {
  userExerciseHistory,
  exerciseQuestionHistory,
  questions,
} from "../../../../../db/schema.js";

export const getExerciseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // exercise id
    const userId = 1; // TO CHANGE

    const maxScore = await db
      .select({
        maxScore: max(userExerciseHistory.score),
      })
      .from(userExerciseHistory)
      .where(
        and(
          eq(userExerciseHistory.userId, userId),
          eq(userExerciseHistory.exerciseId, Number(id))
        )
      );

    if (!maxScore[0].maxScore)
      return res.status(404).json({ message: "History not found" });

    const numberOfAttempts = await db
      .select({
        numberOfAttempts: count(userExerciseHistory.id),
      })
      .from(userExerciseHistory)
      .where(
        and(
          eq(userExerciseHistory.userId, userId),
          eq(userExerciseHistory.exerciseId, Number(id))
        )
      );

    const averageScore = await db
      .select({
        averageScore: avg(userExerciseHistory.score),
      })
      .from(userExerciseHistory)
      .where(
        and(
          eq(userExerciseHistory.userId, userId),
          eq(userExerciseHistory.exerciseId, Number(id))
        )
      );

    const exerciseHistoryIds = await db
      .select({
        id: userExerciseHistory.id,
      })
      .from(userExerciseHistory)
      .where(
        and(
          eq(userExerciseHistory.userId, userId),
          eq(userExerciseHistory.exerciseId, Number(id))
        )
      );

    let questionHistory: any = [];
    for (const exerciseHistoryId of exerciseHistoryIds) {
      const questionsHistory = await db
        .select()
        .from(exerciseQuestionHistory)
        .leftJoin(
          questions,
          eq(exerciseQuestionHistory.questionId, questions.id)
        )
        .leftJoin(
          userExerciseHistory,
          eq(exerciseQuestionHistory.exerciseHistoryId, userExerciseHistory.id)
        )
        .where(
          and(
            eq(exerciseQuestionHistory.exerciseHistoryId, exerciseHistoryId.id)
          )
        );
      questionHistory.push({
        exerciseHistoryId: exerciseHistoryId.id,
        questions: questionsHistory.map((q: any) => ({
          id: q.questions?.id,
          section: q.questions?.section,
          title: q.questions?.title,
          isCorrect: q.exercise_question_history.isCorrect,
        })),
      });
    }

    res.json({
      maxScore: maxScore[0].maxScore,
      numberOfAttempts: numberOfAttempts[0].numberOfAttempts,
      averageScore: averageScore[0].averageScore,
      attempts: transformSectionScores(questionHistory),
    });

    // get exercise questions

    // const questionAndCorrectness = await db
    //   .select({
    //     id: questions.id,
    //     section: questions.section,
    //     // numberOfQuestions: countDistinct(questions.section),
    //     correctAnswers: exerciseQuestionHistory.isCorrect,
    //   })
    //   .from(questions)
    //   .leftJoin(
    //     exerciseQuestionHistory,
    //     eq(questions.id, exerciseQuestionHistory.questionId)
    //   )
    //   .where(
    //     and(
    //       eq(questions.exerciseId, Number(id)),
    //       eq(exerciseQuestionHistory.isCorrect, true)
    //     )
    //   )
    //   .groupBy(questions.id, exerciseQuestionHistory.isCorrect);

    // const sections = [...new Set(questionAndCorrectness.map((q) => q.section))];

    // let sectionScores: any = [];
    // for (const section of sections) {
    //   let score = 0;
    //   for (const question of questionAndCorrectness) {
    //     if (question.section === section && question.correctAnswers) {
    //       score += 1;
    //     }
    //   }
    //   let totalQuestions = questionAndCorrectness.filter(
    //     (q) => q.section === section
    //   ).length;
    //   sectionScores.push({
    //     section: section,
    //     score: (score * 100) / totalQuestions,
    //   });
    // }

    // res.json({
    //   maxScore: maxScore[0].maxScore,
    //   numberOfAttempts: numberOfAttempts[0].numberOfAttempts,
    //   averageScore: averageScore[0].averageScore,
    //   sectionScores: sectionScores,
    // });

    // res.json({
    //   maxScore: maxScore[0].maxScore,
    //   numberOfAttempts: numberOfAttempts[0].numberOfAttempts,
    //   averageScore: averageScore[0].averageScore,
    //   sectionScores: sectionScores,
    // });
  } catch (error) {
    console.error("Error in getExerciseById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

function transformSectionScores(questionHistory: any[]) {
  // Get all unique sections from all attempts
  const sections = new Set<string>();
  for (const attempt of questionHistory) {
    for (const question of attempt.questions) {
      if (question.section) {
        sections.add(question.section);
      }
    }
  }

  // Calculate section scores for each attempt
  const sectionScoresByAttempt = questionHistory.map((attempt) => {
    const sectionStats: {
      [key: string]: { correct: number; total: number; score: number };
    } = {};

    // Initialize stats for each section
    for (const section of sections) {
      sectionStats[section] = { correct: 0, total: 0, score: 0 };
    }

    // Count correct and total questions per section for this attempt
    for (const question of attempt.questions) {
      if (question.section && question.section in sectionStats) {
        sectionStats[question.section].total++;
        if (question.isCorrect) {
          sectionStats[question.section].correct++;
        }
      }
    }

    // Calculate percentage scores for each section
    for (const section of sections) {
      if (sectionStats[section].total > 0) {
        sectionStats[section].score =
          (sectionStats[section].correct / sectionStats[section].total) * 100;
      }
    }

    return {
      exerciseHistoryId: attempt.exerciseHistoryId,
      sectionScores: Object.entries(sectionStats).map(([section, stats]) => ({
        section,
        correctAnswers: stats.correct,
        totalQuestions: stats.total,
        score: Math.round(stats.score * 100) / 100, // Round to 2 decimal places
      })),
    };
  });

  return sectionScoresByAttempt;
}
