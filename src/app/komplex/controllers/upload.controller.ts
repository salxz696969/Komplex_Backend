import { AuthenticatedRequest } from "../../../types/request.js";
import { Response } from "express";
import { getSignedUrlFromCloudflare } from "../../../db/cloudflare/cloudflareFunction.js";

export const getSignedUrl = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { fileName, fileType } = req.body;
    // user already checked at middleware
    const userId = req.user.userId;

    if (!fileName || !fileType) {
      return res
        .status(400)
        .json({ error: "fileName and fileType are required" });
    }

    const { signedUrl, key } = await getSignedUrlFromCloudflare(
      fileName,
      fileType,
      userId
    );

    return res.status(200).json({ signedUrl, key });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
