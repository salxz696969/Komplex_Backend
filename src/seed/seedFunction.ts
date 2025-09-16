import { meilisearch } from "@/config/meilisearchConfig.js";
import { db } from "@/db/index.js";
import {
	blogMedia,
	blogs,
	choices,
	exercises,
	forumComments,
	forumMedias,
	forumReplies,
	forums,
	questions,
	users,
	videoComments,
	videoReplies,
	videos,
} from "@/db/schema.js";
import {
	mockChoices,
	mockComments,
	mockExercises,
	mockQuestions,
	mockReplies,
	mockTitleDescriptionTopicAndType,
	mockUsers,
} from "./data.js";
import { faker } from "@faker-js/faker";
import { Response, Request } from "express";

export const seedSearch = async (req: Request, res: Response) => {
	try {
		const blogsFromDb = await db
			.select({ id: blogs.id, title: blogs.title, description: blogs.description, topic: blogs.topic })
			.from(blogs);
		const forumsFromDb = await db
			.select({ id: forums.id, title: forums.title, description: forums.description, topic: forums.topic })
			.from(forums);
		const videosFromDb = await db
			.select({ id: videos.id, title: videos.title, description: videos.description, topic: videos.topic })
			.from(videos);
		for (let i = 0; i < blogsFromDb.length; i++) {
			await meilisearch.index("blogs").addDocuments([blogsFromDb[i]]);
		}
		for (let i = 0; i < forumsFromDb.length; i++) {
			await meilisearch.index("forums").addDocuments([forumsFromDb[i]]);
		}
		for (let i = 0; i < videosFromDb.length; i++) {
			await meilisearch.index("videos").addDocuments([videosFromDb[i]]);
		}
		res.status(200).json({ message: "Meilisearch seeded successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error seeding Meilisearch", error });
	}
};

export const seedDb = async (req: Request, res: Response) => {
	try {
		await db.insert(users).values(mockUsers);
		const blogsToInsert = mockTitleDescriptionTopicAndType.map((item) => ({
			...item,
			// Add other required fields with default/mock values
			userId: faker.number.int({ min: 1, max: 20 }),
			likeCount: faker.number.int({ min: 0, max: 10000 }),
			viewCount: faker.number.int({ min: 0, max: 100000 }),
		}));
		const forumsToInsert = mockTitleDescriptionTopicAndType.map((item) => ({
			...item,
			// Add other required fields with default/mock values
			userId: faker.number.int({ min: 1, max: 20 }),
			viewCount: faker.number.int({ min: 0, max: 100000 }),
		}));
		const videosToInsert = mockTitleDescriptionTopicAndType.map((item) => ({
			...item,
			// Add other required fields with default/mock values
			userId: faker.number.int({ min: 1, max: 20 }),
			viewCount: faker.number.int({ min: 0, max: 100000 }),
			videoUrl: faker.internet.url(),
			videoUrlForDeletion: faker.internet.url(),
			thumbnailUrl: faker.internet.url(),
			thumbnailUrlForDeletion: faker.internet.url(),
			duration: faker.number.int({ min: 30, max: 3600 }),
		}));
		const insertBlogs = await db.insert(blogs).values(blogsToInsert).returning({ id: blogs.id });
		await db.insert(forums).values(forumsToInsert).returning({ id: forums.id });
		const insertVideos = await db.insert(videos).values(videosToInsert).returning({ id: videos.id });

		for (const blog of insertBlogs) {
			for (let i = 0; i < faker.number.int({ min: 1, max: 4 }); i++) {
				await db.insert(blogMedia).values({
					blogId: blog.id,
					url: faker.image.urlLoremFlickr({ category: "nature" }),
					urlForDeletion: faker.image.urlLoremFlickr({ category: "nature" }),
					mediaType: faker.helpers.arrayElement(["image", "video"]),
				});
				await db.insert(forumMedias).values({
					forumId: blog.id,
					url: faker.image.urlLoremFlickr({ category: "nature" }),
					urlForDeletion: faker.image.urlLoremFlickr({ category: "nature" }),
					mediaType: faker.helpers.arrayElement(["image", "video"]),
				});
			}

			const randomComments = faker.helpers.arrayElements(mockComments, 5);
			const randomReplies = faker.helpers.arrayElements(mockReplies, 3);
			const commentsData = randomComments.map((comment) => ({
				forumId: blog.id,
				userId: faker.number.int({ min: 1, max: 20 }),
				description: comment,
			}));
			const repliesData = randomReplies.map((reply) => ({
				userId: faker.number.int({ min: 1, max: 20 }),
				description: reply,
			}));

			const insertCommentsToForums = await db
				.insert(forumComments)
				.values(commentsData)
				.returning({ id: forumComments.id });
			for (const comment of insertCommentsToForums) {
				await db.insert(forumReplies).values(
					repliesData.map((reply) => ({
						...reply,
						forumCommentId: comment.id,
					}))
				);
			}

			const insertCommentsToVideos = await db
				.insert(videoComments)
				.values(commentsData)
				.returning({ id: videoComments.id });
			for (const comment of insertCommentsToVideos) {
				await db.insert(videoReplies).values(
					repliesData.map((reply) => ({
						...reply,
						videoCommentId: comment.id,
					}))
				);
			}
		}

		const exercisesToInsert = mockExercises.map((exercise) => ({
			...exercise,
			videoId: faker.number.int({ min: 1, max: insertVideos.length }),
			userId: faker.number.int({ min: 1, max: 20 }),
		}));
		await db.insert(exercises).values(exercisesToInsert);
		const questionsToInsert = mockQuestions.map((question) => ({
			...question,
			userId: faker.number.int({ min: 1, max: 20 }),
		}));
		await db.insert(questions).values(questionsToInsert);
		await db.insert(choices).values(mockChoices);
		res.status(200).json({ message: "Database seeded successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error seeding database", error });
	}
};
