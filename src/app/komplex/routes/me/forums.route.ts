import { Router } from "express";
import { uploadImages } from "../../../../middleware/upload.js";
import {
  getAllForums,
  getForumById,
  postForum,
  updateForum,
  deleteForum,
  likeForum,
  unlikeForum,
  // TODO: Comment interactions - these functions need to be implemented
  // postForumComment,
  // likeForumComment,
  // unlikeForumComment,
  // updateForumComment,
  // deleteForumComment,
  // Reply interactions
  // postForumReply,
  // likeForumReply,
  // unlikeForumReply,
  // updateForumReply,
  // deleteForumReply,
  // TODO: Future features
  // getLikedForums, // GET /me/liked-forums - forums I liked
  // getSavedForums, // GET /me/saved-forums - forums I saved
} from "../../controllers/me/forums.controller.js";

const router = Router();

/**
 * @swagger
 * /me/forums:
 *   get:
 *     summary: Get my forums
 *     tags: [Me - Forums]
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
 *         description: Number of forums per page
 *     responses:
 *       200:
 *         description: Successfully retrieved my forums
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
router.get("/", getAllForums); // GET /me/forums - my forums

/**
 * @swagger
 * /me/forums/{id}:
 *   get:
 *     summary: Get specific forum details
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.get("/:id", getForumById); // GET /me/forums/:id - specific forum details

/**
 * @swagger
 * /me/forums:
 *   post:
 *     summary: Create a new forum
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Forum title
 *               description:
 *                 type: string
 *                 description: Forum description
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *                 description: Forum images (max 4)
 *     responses:
 *       201:
 *         description: Forum created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Forum'
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
router.post("/", uploadImages.array("images", 4), postForum); // POST /me/forums - create forum

/**
 * @swagger
 * /me/forums/{id}:
 *   put:
 *     summary: Update a forum
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Forum title
 *               description:
 *                 type: string
 *                 description: Forum description
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *                 description: Forum images (max 4)
 *     responses:
 *       200:
 *         description: Forum updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Forum'
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
 *         description: Forbidden - not your forum
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.put("/:id", uploadImages.array("images", 4), updateForum); // PUT /me/forums/:id - update forum

/**
 * @swagger
 * /me/forums/{id}:
 *   delete:
 *     summary: Delete a forum
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     responses:
 *       200:
 *         description: Forum deleted successfully
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
 *         description: Forbidden - not your forum
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.delete("/:id", deleteForum); // DELETE /me/forums/:id - delete forum

/**
 * @swagger
 * /me/forums/{id}/like:
 *   patch:
 *     summary: Like a forum
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     responses:
 *       200:
 *         description: Forum liked successfully
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
router.patch("/:id/like", likeForum); // PATCH /me/forums/:id/like - like forum

/**
 * @swagger
 * /me/forums/{id}/unlike:
 *   patch:
 *     summary: Unlike a forum
 *     tags: [Me - Forums]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Forum ID
 *     responses:
 *       200:
 *         description: Forum unliked successfully
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
router.patch("/:id/unlike", unlikeForum); // PATCH /me/forums/:id/unlike - unlike forum

// TODO: Comment interactions (on any forum) - these functions need to be implemented
// router.post("/:id/comments", uploadImages.array("images", 4), postForumComment); // POST /me/forums/:id/comments - comment on forum
// router.patch("/:id/comments/:commentId/like", likeForumComment); // PATCH /me/forums/:id/comments/:commentId/like - like comment
// router.patch("/:id/comments/:commentId/unlike", unlikeForumComment); // PATCH /me/forums/:id/comments/:commentId/unlike - unlike comment
// router.put(
//   "/:id/comments/:commentId",
//   uploadImages.array("images", 4),
//   updateForumComment
// ); // PUT /me/forums/:id/comments/:commentId - update comment
// router.delete("/:id/comments/:commentId", deleteForumComment); // DELETE /me/forums/:id/comments/:commentId - delete comment

// TODO: Reply interactions (nested) - these functions need to be implemented
// router.post(
//   "/:id/comments/:commentId/replies",
//   uploadImages.array("images", 4),
//   postForumReply
// ); // POST /me/forums/:id/comments/:commentId/replies - reply to comment
// router.patch("/:id/comments/:commentId/replies/:replyId/like", likeForumReply); // PATCH /me/forums/:id/comments/:commentId/replies/:replyId/like - like reply
// router.patch(
//   "/:id/comments/:commentId/replies/:replyId/unlike",
//   unlikeForumReply
// ); // PATCH /me/forums/:id/comments/:commentId/replies/:replyId/unlike - unlike reply
// router.put(
//   "/:id/comments/:commentId/replies/:replyId",
//   uploadImages.array("images", 4),
//   updateForumReply
// ); // PUT /me/forums/:id/comments/:commentId/replies/:replyId - update reply
// router.delete("/:id/comments/:commentId/replies/:replyId", deleteForumReply); // DELETE /me/forums/:id/comments/:commentId/replies/:replyId - delete reply

// TODO: Future features
// router.get("/liked", getLikedForums); // GET /me/liked-forums - forums I liked
// router.get("/saved", getSavedForums); // GET /me/saved-forums - forums I saved

export default router;
