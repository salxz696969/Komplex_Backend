import { Router } from "express";
import {
  getExercises,
  getExercise,
  // TODO: Future features
  // getExerciseStats, // GET /exercises/:id/stats - exercise statistics
  // getExerciseLeaderboard, // GET /exercises/:id/leaderboard - top performers
} from "../../controllers/feed/exercises.controller.js";

const router = Router();

/**
 * @swagger
 * /feed/exercises:
 *   get:
 *     summary: Get curated exercise feed
 *     description: TEMP NOTE: corresponds to getExercises from ../../controllers/feed/exercises.controller.js
 *     tags: [Feed - Exercises]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of exercises per page
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *         description: Filter by grade level
 *     responses:
 *       200:
 *         description: Exercise feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exercises:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Exercise'
 *                 hasMore:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getExercises);

/**
 * @swagger
 * /feed/exercises/{id}:
 *   get:
 *     summary: Get specific exercise details
 *     description: TEMP NOTE: corresponds to getExercise from ../../controllers/feed/exercises.controller.js
 *     tags: [Feed - Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exercise'
 *       404:
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getExercise);

// TODO: Future features
// router.get("/:id/stats", getExerciseStats); // Exercise statistics
// router.get("/:id/leaderboard", getExerciseLeaderboard); // Top performers

export default router;
