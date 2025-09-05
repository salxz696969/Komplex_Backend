import { Router } from "express";
// import // TODO: Need to check what functions exist for following
// // followUser,
// // unfollowUser,
// // getFollowing,
// // getFollowers,
// "../../controllers/me/follow.controller.js";

const router = Router();

// Following functionality
// TODO: Implement these based on existing controller functions
// router.post("/:id", followUser); // POST /me/follow/:id - follow user
// router.delete("/:id", unfollowUser); // DELETE /me/follow/:id - unfollow user
// router.get("/following", getFollowing); // GET /me/follow/following - who I follow
// router.get("/followers", getFollowers); // GET /me/follow/followers - who follows me

/**
 * @swagger
 * /me/follow/{id}:
 *   post:
 *     summary: Follow a user
 *     description: TEMP NOTE: corresponds to followUser from ../../controllers/me/follow.controller.js (TODO: implement)
 *     tags: [Me - Follow]
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
// router.post("/:id", followUser);

/**
 * @swagger
 * /me/follow/{id}:
 *   delete:
 *     summary: Unfollow a user
 *     description: TEMP NOTE: corresponds to unfollowUser from ../../controllers/me/follow.controller.js (TODO: implement)
 *     tags: [Me - Follow]
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
// router.delete("/:id", unfollowUser);

/**
 * @swagger
 * /me/follow/following:
 *   get:
 *     summary: Get users I follow
 *     description: TEMP NOTE: corresponds to getFollowing from ../../controllers/me/follow.controller.js (TODO: implement)
 *     tags: [Me - Follow]
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
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Following list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 following:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
// router.get("/following", getFollowing);

/**
 * @swagger
 * /me/follow/followers:
 *   get:
 *     summary: Get my followers
 *     description: TEMP NOTE: corresponds to getFollowers from ../../controllers/me/follow.controller.js (TODO: implement)
 *     tags: [Me - Follow]
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
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Followers list retrieved successfully
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
// router.get("/followers", getFollowers);

export default router;
