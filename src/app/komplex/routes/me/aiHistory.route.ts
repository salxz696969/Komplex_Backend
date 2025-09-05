import { Router } from "express";
import {
  getAiHistoryForAUser,
  postAiHistoryForAUser,
} from "../../controllers/me/aiHistory.controller.js";
const router = Router();

/**
 * @swagger
 * /ai-history:
 *   get:
 *     summary: Get AI interaction history for current user
 *     description: TEMP NOTE: corresponds to getAiHistoryForAUser from ../controllers/me/aiHistory.controller.js
 *     tags: [AI History]
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
 *         description: AI history retrieved successfully
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
 *                       userId:
 *                         type: integer
 *                       prompt:
 *                         type: string
 *                       response:
 *                         type: string
 *                       createdAt:
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
router.get("/", getAiHistoryForAUser);

/**
 * @swagger
 * /ai-history:
 *   post:
 *     summary: Save AI interaction to history
 *     description: TEMP NOTE: corresponds to postAiHistoryForAUser from ../controllers/me/aiHistory.controller.js
 *     tags: [AI History]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - response
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: User's prompt/question
 *               response:
 *                 type: string
 *                 description: AI's response
 *               metadata:
 *                 type: object
 *                 description: Additional metadata about the interaction
 *     responses:
 *       201:
 *         description: AI interaction saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required fields
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
router.post("/", postAiHistoryForAUser);

export default router;
