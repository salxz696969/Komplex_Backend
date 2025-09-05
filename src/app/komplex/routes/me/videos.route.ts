import { Router } from "express";
import { uploadImages } from "../../../../middleware/upload.js";
import {
  getAllVideos,
  getVideoById,
  postVideo,
  updateVideo,
  deleteVideo,
  likeVideo,
  unlikeVideo,
  saveVideo,
  unsaveVideo,
  getUserVideoHistory,
  // TODO: Comment interactions - these functions need to be implemented
  // postVideoComment,
  // likeVideoComment,
  // unlikeVideoComment,
  // updateVideoComment,
  // deleteVideoComment,
  // Reply interactions
  // postVideoReply,
  // likeVideoReply,
  // unlikeVideoReply,
  // updateVideoReply,
  // deleteVideoReply,
} from "../../controllers/me/videos.controller.js";

const router = Router();

/**
 * @swagger
 * /me/videos:
 *   get:
 *     summary: Get my videos
 *     tags: [Me - Videos]
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
 *         description: Number of videos per page
 *     responses:
 *       200:
 *         description: Successfully retrieved my videos
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
router.get("/", getAllVideos); // GET /me/videos - my videos

/**
 * @swagger
 * /me/videos/{id}:
 *   get:
 *     summary: Get specific video details
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.get("/:id", getVideoById); // GET /me/videos/:id - specific video details

/**
 * @swagger
 * /me/videos:
 *   post:
 *     summary: Create a new video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - videoUrl
 *             properties:
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               videoUrl:
 *                 type: string
 *                 description: Video URL
 *               thumbnailUrl:
 *                 type: string
 *                 description: Thumbnail URL
 *               duration:
 *                 type: integer
 *                 description: Video duration in seconds
 *     responses:
 *       201:
 *         description: Video created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request
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
router.post("/", postVideo); // POST /me/videos - create video

/**
 * @swagger
 * /me/videos/{id}:
 *   put:
 *     summary: Update a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               videoUrl:
 *                 type: string
 *                 description: Video URL
 *               thumbnailUrl:
 *                 type: string
 *                 description: Thumbnail URL
 *               duration:
 *                 type: integer
 *                 description: Video duration in seconds
 *     responses:
 *       200:
 *         description: Video updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request
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
 *       403:
 *         description: Forbidden - not your video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.put("/:id", updateVideo); // PUT /me/videos/:id - update video

/**
 * @swagger
 * /me/videos/{id}:
 *   delete:
 *     summary: Delete a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not your video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.delete("/:id", deleteVideo); // DELETE /me/videos/:id - delete video

/**
 * @swagger
 * /me/videos/{id}/like:
 *   patch:
 *     summary: Like a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.patch("/:id/like", likeVideo); // PATCH /me/videos/:id/like - like video

/**
 * @swagger
 * /me/videos/{id}/unlike:
 *   patch:
 *     summary: Unlike a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.patch("/:id/unlike", unlikeVideo); // PATCH /me/videos/:id/unlike - unlike video

/**
 * @swagger
 * /me/videos/{id}/save:
 *   patch:
 *     summary: Save a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.patch("/:id/save", saveVideo); // PATCH /me/videos/:id/save - save video

/**
 * @swagger
 * /me/videos/{id}/unsave:
 *   patch:
 *     summary: Unsave a video
 *     tags: [Me - Videos]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video unsaved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.patch("/:id/unsave", unsaveVideo); // PATCH /me/videos/:id/unsave - unsave video

// TODO: Comment interactions (on any video) - these functions need to be implemented
// router.post("/:id/comments", uploadImages.array("images", 4), postVideoComment); // POST /me/videos/:id/comments - comment on video
// router.patch("/:id/comments/:commentId/like", likeVideoComment); // PATCH /me/videos/:id/comments/:commentId/like - like comment
// router.patch("/:id/comments/:commentId/unlike", unlikeVideoComment); // PATCH /me/videos/:id/comments/:commentId/unlike - unlike comment
// router.put(
//   "/:id/comments/:commentId",
//   uploadImages.array("images", 4),
//   updateVideoComment
// ); // PUT /me/videos/:id/comments/:commentId - update comment
// router.delete("/:id/comments/:commentId", deleteVideoComment); // DELETE /me/videos/:id/comments/:commentId - delete comment

// TODO: Reply interactions (nested) - these functions need to be implemented
// router.post(
//   "/:id/comments/:commentId/replies",
//   uploadImages.array("images", 4),
//   postVideoReply
// ); // POST /me/videos/:id/comments/:commentId/replies - reply to comment
// router.patch("/:id/comments/:commentId/replies/:replyId/like", likeVideoReply); // PATCH /me/videos/:id/comments/:commentId/replies/:replyId/like - like reply
// router.patch(
//   "/:id/comments/:commentId/replies/:replyId/unlike",
//   unlikeVideoReply
// ); // PATCH /me/videos/:id/comments/:commentId/replies/:replyId/unlike - unlike reply
// router.put(
//   "/:id/comments/:commentId/replies/:replyId",
//   uploadImages.array("images", 4),
//   updateVideoReply
// ); // PUT /me/videos/:id/comments/:commentId/replies/:replyId - update reply
// router.delete("/:id/comments/:commentId/replies/:replyId", deleteVideoReply); // DELETE /me/videos/:id/comments/:commentId/replies/:replyId - delete reply

/**
 * @swagger
 * /me/videos/history:
 *   get:
 *     summary: Get my video history
 *     tags: [Me - Videos]
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
 *         description: Number of videos per page
 *     responses:
 *       200:
 *         description: Successfully retrieved video history
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
router.get("/history", getUserVideoHistory); // GET /me/videos/history - my video history

export default router;
