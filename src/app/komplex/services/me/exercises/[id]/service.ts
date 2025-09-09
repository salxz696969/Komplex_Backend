import { and, eq, max, count, avg } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  userExerciseHistory,
  exerciseQuestionHistory,
  questions,
  users,
} from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";

export const getExerciseById = async (id: string, userId: number) => {
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

  if (maxScore[0].maxScore === null) {
    throw new Error("History not found");
  }

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
      .leftJoin(questions, eq(exerciseQuestionHistory.questionId, questions.id))
      .leftJoin(
        userExerciseHistory,
        eq(exerciseQuestionHistory.exerciseHistoryId, userExerciseHistory.id)
      )
      .where(
        and(eq(exerciseQuestionHistory.exerciseHistoryId, exerciseHistoryId.id))
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

  return {
    data: {
      maxScore: maxScore[0].maxScore,
      numberOfAttempts: numberOfAttempts[0].numberOfAttempts,
      averageScore: averageScore[0].averageScore,
      attempts: transformSectionScores(questionHistory),
    },
  };
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

export const submitExercise = async (
  id: string,
  answers: any[],
  score: number,
  timeTaken: number,
  userId: number
) => {
  try {
    const exerciseHistory = await db
      .insert(userExerciseHistory)
      .values({
        userId: Number(userId),
        exerciseId: parseInt(id),
        score: score,
        timeTaken: timeTaken,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: userExerciseHistory.id,
      });

    let cacheQuestions = [];
    for (const answer of answers) {
      const questionId = answer.questionId;
      const isCorrect = answer.isCorrect;

      const insertedQuestion = await db
        .insert(exerciseQuestionHistory)
        .values({
          exerciseHistoryId: exerciseHistory[0].id,
          questionId,
          isCorrect,
        })
        .returning();

      cacheQuestions.push(insertedQuestion[0]);
    }

    const [username] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId));

    const cacheData = {
      username,
      score,
      timeTaken,
      questions: cacheQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const cacheKey = `exercise:userId:${userId}:exerciseId:${id}`;
    await redis.set(cacheKey, JSON.stringify(cacheData), { EX: 600 });

    return { data: cacheData };
  } catch (error: any) {
    throw new Error((error as Error).message);
  }
};
