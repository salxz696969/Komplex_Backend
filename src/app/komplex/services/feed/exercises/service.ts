import { eq, count, max, inArray, and } from "drizzle-orm";
import { db } from "@/db/index.js";
import { exercises, questions, userExerciseHistory, choices, exerciseQuestionHistory } from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";

export const getExercises = async (grade: string, userId: number) => {
  try {
    const cacheKey = `exercises:${grade}`;
    let userExerciseWithProgress: any[] = [];
    const redisData = await redis.get(cacheKey);

		if (redisData) {
			const exercisesFromCache = JSON.parse(redisData);
			for (const exercise of exercisesFromCache) {
				const userProgress = await db
					.select({
						numberOfAttempts: count(userExerciseHistory.id),
						highestScore: max(userExerciseHistory.score),
					})
					.from(userExerciseHistory)
					.where(
						and(
							eq(userExerciseHistory.userId, Number(userId)),
							eq(userExerciseHistory.exerciseId, exercise.id)
						)
					);
				userExerciseWithProgress.push({
					...exercise,
					numberOfAttempts: userProgress[0].numberOfAttempts,
					highestScore: userProgress[0].highestScore,
				});
			}
		} else {
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

			let cacheExerciseForAGrade: any[] = [];

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
							eq(userExerciseHistory.userId, Number(userId)),
							eq(userExerciseHistory.exerciseId, exercise.id)
						)
					);

				userExerciseWithProgress.push({
					...exercise,
					numberOfQuestions: numberOfQuestions[0].numberOfQuestions,
					numberOfAttempts: userProgress[0].numberOfAttempts,
					highestScore: userProgress[0].highestScore,
				});
				cacheExerciseForAGrade.push({
					...exercise,
					numberOfQuestions: numberOfQuestions[0].numberOfQuestions,
				});
			}
			await redis.set(cacheKey, JSON.stringify(cacheExerciseForAGrade), {
				EX: 60 * 60,
			});
		}

		// get all exercises with questions and choices

		const subjects = [...new Set(userExerciseWithProgress.map((exercise) => exercise.subject))];

		let response: any = {};

		for (const subject of subjects) {
			response[subject] = userExerciseWithProgress.filter((exercise) => exercise.subject === subject);
		}

		return { data: response };
	} catch (error: any) {
		console.error("Get exercises error:", error);
		throw new Error((error as Error).message);
	}
};

export const getExercise = async (id: string) => {
	try {
		const cacheKey = `exercise:${id}`;
		const cachedData = await redis.get(cacheKey);
		if (cachedData) {
			return { data: JSON.parse(cachedData) };
		}

		// Get the exercise
		const exerciseResult = await db
			.select()
			.from(exercises)
			.where(eq(exercises.id, parseInt(id)))
			.limit(1);

		if (!exerciseResult || exerciseResult.length === 0) {
			throw new Error("Exercise not found");
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
			allChoices = await db.select().from(choices).where(inArray(choices.questionId, questionIds));
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
			const randomizedChoices = question.choices.sort(() => Math.random() - 0.5);
			question.choices = randomizedChoices;
		}

		await redis.set(cacheKey, JSON.stringify(exerciseWithQuestions), {
			EX: 600,
		});

		return { data: exerciseWithQuestions };
	} catch (error: any) {
		console.error("Get exercise error:", error);
		throw new Error((error as Error).message);
	}
};
