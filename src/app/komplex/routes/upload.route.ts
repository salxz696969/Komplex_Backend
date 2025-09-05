import { Router } from "express";
import { getSignedUrl } from "../controllers/upload.controller.js";

const router = Router();

/**
 * @swagger
 * /upload/upload-url:
 *   post:
 *     summary: Get signed URL for file upload
 *     description: TEMP NOTE: corresponds to getSignedUrl from ../controllers/upload.controller.js
 *     tags: [Upload]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to upload
 *               fileType:
 *                 type: string
 *                 description: MIME type of the file
 *               folder:
 *                 type: string
 *                 description: Folder path in storage (optional)
 *                 default: "uploads"
 *     responses:
 *       200:
 *         description: Signed URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signedUrl:
 *                   type: string
 *                   description: Pre-signed URL for uploading
 *                 key:
 *                   type: string
 *                   description: File key in storage
 *                 expiresIn:
 *                   type: integer
 *                   description: URL expiration time in seconds
 *       400:
 *         description: Missing required fields
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
router.post("/upload-url", getSignedUrl as any);

export default router;
