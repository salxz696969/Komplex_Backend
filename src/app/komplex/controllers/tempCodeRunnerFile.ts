export const postVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user?.userId ?? "1";
		const { title, description, topic, type } = req.body;

		if (!title || !description || !topic || !type) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		let videoFile: Express.Multer.File;
		let thumbnailFile: Express.Multer.File;

		if (req.files && typeof req.files === "object" && "video" in req.files && "image" in req.files) {
			videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).video[0];
			thumbnailFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).image[0];
		} else {
			return res.status(400).json({ error: "Files not uploaded correctly" });
		}

		const uniqueKey = `${videoFile.filename}-${crypto.randomUUID()}-${thumbnailFile.filename}`;

		const videoUrl = await uploadVideoToCloudflare(
			uniqueKey,
			await fs.promises.readFile(videoFile.path),
			videoFile.mimetype
		);
		const thumbnailUrl = await uploadImageToCloudflare(
			uniqueKey,
			await fs.promises.readFile(thumbnailFile.path),
			thumbnailFile.mimetype
		);

		await fs.promises.unlink(videoFile.path);
		await fs.promises.unlink(thumbnailFile.path);

		const newVideo = await db
			.insert(videos)
			.values({
				videoUrlForDeletion: uniqueKey,
				videoUrl,
				title,
				description,
				duration: 100,
				topic,
				type,
				viewCount: 0,
				thumbnailUrl,
				thumbnailUrlForDeletion: uniqueKey,
				userId: Number(userId),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return res.status(201).json({ success: true, video: newVideo });
	} catch (error) {
		console.error("Error uploading file or saving media:", error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};