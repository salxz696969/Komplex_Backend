import { Router } from "express";
import {
  getAllVideos,
  getVideoById,
  // TODO: Future features - these functions need to be implemented
  // getVideoComments,
  // getVideoReplies,
  // getVideoLikes, // GET /videos/:id/likes - who liked this video
} from "../../controllers/feed/videos.controller.js";

const router = Router();

/**
 * @swagger
 * /feed/videos:
 *   get:
 *     summary: Get curated video feed
 *     tags: [Feed - Videos]
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
 *         description: Number of videos per page
 *     responses:
 *       200:
 *         description: Successfully retrieved video feed
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
 *                     $ref: '#/components/schemas/Video'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAllVideos); // GET /feed/videos - curated video feed

/**
 * @swagger
 * /feed/videos/{id}:
 *   get:
 *     summary: Get specific video details
 *     tags: [Feed - Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Successfully retrieved video details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       404:
 *         description: Video not found
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
router.get("/:id", getVideoById); // GET /feed/videos/:id - specific video details

// TODO: View comments and replies - these functions need to be implemented
// router.get("/:id/comments", getVideoComments); // GET /feed/videos/:id/comments - comments on this video
// router.get("/:id/comments/:commentId/replies", getVideoReplies); // GET /feed/videos/:id/comments/:commentId/replies - replies to comment

// TODO: Future features
// router.get("/:id/likes", getVideoLikes); // Who liked this video

export default router;
