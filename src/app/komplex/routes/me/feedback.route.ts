import { Router } from "express";
import { createFeedback } from "../../controllers/feed/feedback.controller.js"; // ! TO CHANGE

const router = Router();

/**
 * @swagger
 * /me/feedback:
 *   post:
 *     summary: Submit feedback
 *     description: TEMP NOTE: corresponds to createFeedback from ../../controllers/feed/feedback.controller.js
 *     tags: [Me - Feedback]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Feedback subject/title
 *               message:
 *                 type: string
 *                 description: Detailed feedback message
 *               category:
 *                 type: string
 *                 enum: [bug, feature, general, other]
 *                 description: Feedback category
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Feedback priority
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
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
router.post("/", createFeedback);

export default router;
