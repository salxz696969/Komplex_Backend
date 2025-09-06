import { Router } from "express";
import {
  getAllForumsController,
  getForumByIdController,   
  // TODO: Future features - these functions need to be implemented
  // getForumComments,
  // getForumReplies,
  // getForumLikes, // GET /forums/:id/likes - who liked this forum
} from "../../controllers/feed/forums.controller.js";

const router = Router();

/**
 * @swagger
 * /feed/forums:
 *   get:
 *     summary: Get curated forum feed
 *     tags: [Feed - Forums]
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
 *         description: Number of forums per page
 *     responses:
 *       200:
 *         description: Forum feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 forumsWithMedia:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Forum'
 *                 hasMore:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAllForumsController);

/**
 * @swagger
 * /feed/forums/{id}:
 *   get:
 *     summary: Get specific forum details
 *     tags: [Feed - Forums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     responses:
 *       200:
 *         description: Forum details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Forum'
 *       404:
 *         description: Forum not found
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
router.get("/:id", getForumByIdController);

/**
 * @swagger
 * /feed/forums/{id}/comments:
 *   get:
 *     summary: Get comments for a forum
 *     tags: [Feed - Forums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
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
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: Forum comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 hasMore:
 *                   type: boolean
 *       404:
 *         description: Forum not found
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
// TODO: These routes need controller functions to be implemented
// router.get("/:id/comments", getForumComments);

// /**
//  * @swagger
//  * /feed/forums/{id}/comments/{commentId}/replies:
//  *   get:
//  *     summary: Get replies for a forum comment
//  *     tags: [Feed - Forums]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Forum ID
//  *       - in: path
//  *         name: commentId
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Comment ID
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 20
//  *         description: Number of replies per page
//  *     responses:
//  *       200:
//  *         description: Comment replies retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 replies:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Reply'
//  *                 hasMore:
//  *                   type: boolean
//  *       404:
//  *         description: Forum or comment not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/:id/comments/:commentId/replies", getForumReplies);

// TODO: Future features
// router.get("/:id/likes", getForumLikes); // Who liked this forum

export default router;
