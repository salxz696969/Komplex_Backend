import { Router } from "express";
import {
  getAllBlogs,
  getBlogById,
  // TODO: Future features
  // getBlogLikes, // GET /blogs/:id/likes - who liked this blog
  // getBlogComments, // GET /blogs/:id/comments - comments on this blog
} from "../../controllers/feed/blogs.controller.js";

const router = Router();

/**
 * @swagger
 * /feed/blogs:
 *   get:
 *     summary: Get curated blog feed
 *     tags: [Feed - Blogs]
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
 *         description: Number of blogs per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [education, entertainment, news]
 *         description: Filter by blog type
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *         description: Filter by topic
 *     responses:
 *       200:
 *         description: Blog feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogsWithMedia:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Blog'
 *                 hasMore:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAllBlogs);

/**
 * @swagger
 * /feed/blogs/{id}:
 *   get:
 *     summary: Get specific blog details
 *     tags: [Feed - Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: Blog details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       404:
 *         description: Blog not found
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
router.get("/:id", getBlogById);

// TODO: Future interaction endpoints
// router.get("/:id/likes", getBlogLikes); // Who liked this blog
// router.get("/:id/comments", getBlogComments); // Comments on this blog

export default router;
