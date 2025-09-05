import { Router } from "express";
// import // TODO: Need to create these functions
// getUserBlogs,
// getUserBlogById,
// "../../controllers/users/blogs.controller.js";

const router = Router();

/**
 * @swagger
 * /users/{id}/blogs:
 *   get:
 *     summary: Get user's blogs
 *     description: Get all blogs created by a specific user (read-only)
 *     tags: [Users - Blogs]
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
 *         description: Number of blogs per page
 *     responses:
 *       200:
 *         description: Successfully retrieved user's blogs
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
 *                     $ref: '#/components/schemas/Blog'
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
// router.get("/", getUserBlogs); // GET /users/:id/blogs - user's blogs

/**
 * @swagger
 * /users/{id}/blogs/{blogId}:
 *   get:
 *     summary: Get specific user blog
 *     description: Get a specific blog created by a user (read-only)
 *     tags: [Users - Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: Successfully retrieved blog details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Blog'
 *       404:
 *         description: User or blog not found
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
// router.get("/:blogId", getUserBlogById); // GET /users/:id/blogs/:blogId - specific blog

export default router;
