import { Router } from "express";
// import // TODO: Need to create these functions
// // getUserForums,
// // getUserForumById,
// "../../controllers/users/forums.controller.js";

const router = Router();

/**
 * @swagger
 * /users/{id}/forums:
 *   get:
 *     summary: Get user's forums
 *     description: Get all forums created by a specific user (read-only)
 *     tags: [Users - Forums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
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
 *         description: Number of forums per page
 *     responses:
 *       200:
 *         description: Successfully retrieved user's forums
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Forum'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       404:
 *         description: User not found
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
// router.get("/", getUserForums); // GET /users/:id/forums - user's forums

/**
 * @swagger
 * /users/{id}/forums/{forumId}:
 *   get:
 *     summary: Get specific user forum
 *     description: Get a specific forum created by a user (read-only)
 *     tags: [Users - Forums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: forumId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     responses:
 *       200:
 *         description: Successfully retrieved forum details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Forum'
 *       404:
 *         description: User or forum not found
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
// router.get("/:forumId", getUserForumById); // GET /users/:id/forums/:forumId - specific forum

export default router;
