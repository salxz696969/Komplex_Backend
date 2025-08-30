import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "./cloudflareConfig";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Upload an image
export const uploadImageToCloudflare = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> => {
  await r2.send(
    new PutObjectCommand({
      Bucket: "komplex-image",
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PHOTO_PUBLIC_URL}/${key}`;
};

// Upload a video
export const uploadVideoToCloudflare = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> => {
  await r2.send(
    new PutObjectCommand({
      Bucket: "komplex-video",
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_VIDEO_PUBLIC_URL}/${key}`;
};

// Delete an object (image or video)
export const deleteFromCloudflare = async (
  bucket: string,
  key: string
): Promise<void> => {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

export const getSignedUrlFromCloudflare = async (
  fileName: string,
  fileType: string,
  userId: string
): Promise<{ signedUrl: string; key: string }> => {
  const bucket =
    fileType === "image/jpeg" ||
    fileType === "image/png" ||
    fileType === "image/jpg" ||
    fileType === "image/webp"
      ? "komplex-image"
      : "komplex-video";

  const command = await new PutObjectCommand({
    Bucket: bucket,
    Key: `${userId}/${fileName}`,
    ContentType: fileType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 }); // 1 min expiry

  return { signedUrl, key: `${userId}/${fileName}` };
};
