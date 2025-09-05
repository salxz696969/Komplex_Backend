import { Router } from "express";
import {
  getExerciseHistory,
  getExerciseDashboard,
  getExerciseById,
  // TODO: submitExercise function needs to be implemented
  // submitExercise,
  // TODO: Future features
  // getExerciseReports, // GET /me/exercises/reports - exercise performance reports
  // getExerciseProgress, // GET /me/exercises/progress - my progress across exercises
} from "../../controllers/me/exercises.controller.js";

const router = Router();

/**
 * @swagger
 * /me/exercises/history:
 *   get:
 *     summary: Get my exercise history
 *     description: TEMP NOTE: corresponds to getExerciseHistory from ../../controllers/me/exercises.controller.js
 *     tags: [Me - Exercises]
 *     security:
 *       - FirebaseAuth: []
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
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Exercise history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       exerciseId:
 *                         type: integer
 *                       score:
 *                         type: integer
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
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
router.get("/history", getExerciseHistory);

/**
 * @swagger
 * /me/exercises/dashboard:
 *   get:
 *     summary: Get my exercise dashboard
 *     description: TEMP NOTE: corresponds to getExerciseDashboard from ../../controllers/me/exercises.controller.js
 *     tags: [Me - Exercises]
 *     security:
 *       - FirebaseAuth: []
 *     responses:
 *       200:
 *         description: Exercise dashboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalExercises:
 *                   type: integer
 *                 completedExercises:
 *                   type: integer
 *                 averageScore:
 *                   type: number
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       exerciseId:
 *                         type: integer
 *                       score:
 *                         type: integer
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
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
router.get("/dashboard", getExerciseDashboard);

/**
 * @swagger
 * /me/exercises/{id}:
 *   get:
 *     summary: Get specific exercise details
 *     description: TEMP NOTE: corresponds to getExerciseById from ../../controllers/me/exercises.controller.js
 *     tags: [Me - Exercises]
 *     security:
 *       - FirebaseAuth: []
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
 *       401:
 *         description: Unauthorized
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
router.get("/:id", getExerciseById);

// TODO: submitExercise function needs to be implemented
// router.post("/:id/submit", submitExercise); // POST /me/exercises/:id/submit - submit exercise

// TODO: Future features
// router.get("/reports", getExerciseReports); // GET /me/exercises/reports - performance reports
// router.get("/progress", getExerciseProgress); // GET /me/exercises/progress - my progress

export default router;
