import { Router } from "express";
import {
  getUserFollowers,
  followUser,
  unfollowUser,
  // TODO: Future features
  // getAllUsers, // GET /feed/users - discover users
  // getUserById, // GET /feed/users/:id - user profile
  // getUserStats, // GET /feed/users/:id/stats - user statistics
} from "../../controllers/feed/users.controller.js";

const router = Router();

/**
 * @swagger
 * /feed/users/{id}/followers:
 *   get:
 *     summary: Get user's followers
 *     description: TEMP NOTE: corresponds to getUserFollowers from ../../controllers/feed/users.controller.js
 *     tags: [Feed - Users]
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
 *         description: Number of followers per page
 *     responses:
 *       200:
 *         description: User followers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 hasMore:
 *                   type: boolean
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
router.get("/:id/followers", getUserFollowers);

/**
 * @swagger
 * /feed/users/{id}/follow:
 *   post:
 *     summary: Follow a user
 *     description: TEMP NOTE: corresponds to followUser from ../../controllers/feed/users.controller.js
 *     tags: [Feed - Users]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to follow
 *     responses:
 *       200:
 *         description: User followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.post("/:id/follow", followUser);

/**
 * @swagger
 * /feed/users/{id}/follow:
 *   delete:
 *     summary: Unfollow a user
 *     description: TEMP NOTE: corresponds to unfollowUser from ../../controllers/feed/users.controller.js
 *     tags: [Feed - Users]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to unfollow
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.delete("/:id/follow", unfollowUser);

// TODO: Future features
// router.get("/", getAllUsers); // GET /feed/users - discover users
// router.get("/:id", getUserById); // GET /feed/users/:id - user profile
// router.get("/:id/stats", getUserStats); // GET /feed/users/:id/stats - user statistics

export default router;
