import cloudinary from "./cloudinaryConfig.js";
export const uploadToCloudinary = (
	fileBuffer: Buffer,
	folder: string,
	resourceType: "image" | "video" | "raw" | "auto" = "auto"
) => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (error, result) => {
			if (error) return reject(error);
			resolve(result);
		});
		stream.end(fileBuffer);
	});
};

export const deleteFromCloudinary = async (publicId: string, resourceType: "image" | "video" | "raw" = "image") => {
	return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};