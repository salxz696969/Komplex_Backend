import { questions } from "../../../../db/models/questions";
import { Request, Response } from "express";
import { db } from "../../../../db";
import {
  exerciseQuestionHistory,
  exercises,
  userExerciseHistory,
} from "../../../../db/schema";
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
