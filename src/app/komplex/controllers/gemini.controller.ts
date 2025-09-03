import { GoogleGenAI } from "@google/genai";
import { Response, Request } from "express";

import { AuthenticatedRequest } from "../../utils/authenticatedRequest.js";

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY || "",
});

export const callGemini = async (req: AuthenticatedRequest, res: Response) => {
	const { input, language } = req.body;

	if (!input || !language) {
		return res.status(400).json({ error: "Missing input or language" });
	}

	const prompt = `Is this input "${input}" about math? If so, explain it in "${language}". You don't need to say yes or no just say the result and if it is not return "បញ្ចូលមិនទាក់ទងនឹងគណិតវិទ្យា។"`;

	try {
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});
		return res.json({ result: response.text });
	} catch (error) {
		return res.status(500).json({ error: "Failed to generate content" });
	}
};
