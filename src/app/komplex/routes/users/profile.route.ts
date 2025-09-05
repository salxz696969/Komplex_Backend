import { Router } from "express";
// import // TODO: Need to create these functions
// // getUserProfile,
// // getUserStats,
// // getUserActivity,
// "../../controllers/users/profile.controller.js";

const router = Router();

/**
 * @swagger
 * /users/{id}/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get public profile information for a specific user
 *     tags: [Users - Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
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
// router.get("/", getUserProfile); // GET /users/:id/profile - user profile

/**
 * @swagger
 * /users/{id}/profile/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Get public statistics for a specific user
 *     tags: [Users - Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBlogs:
 *                       type: integer
 *                     totalForums:
 *                       type: integer
 *                     totalVideos:
 *                       type: integer
 *                     totalLikes:
 *                       type: integer
 *                     joinDate:
 *                       type: string
 *                       format: date-time
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
// router.get("/stats", getUserStats); // GET /users/:id/profile/stats - user statistics

/**
 * @swagger
 * /users/{id}/profile/activity:
 *   get:
 *     summary: Get user activity
 *     description: Get recent activity for a specific user
 *     tags: [Users - Profile]
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
 *         description: Number of activities per page
 *     responses:
 *       200:
 *         description: Successfully retrieved user activity
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
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [blog, forum, video, comment, like]
 *                       content:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
// router.get("/activity", getUserActivity); // GET /users/:id/profile/activity - user activity

export default router;
