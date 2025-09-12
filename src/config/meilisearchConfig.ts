import { MeiliSearch } from "meilisearch";
export const meilisearch = new MeiliSearch({
	host:
		process.env.MEILI_HOST_URL ??
		(() => {
			throw new Error("MEILI_HOST_URL is not defined");
		})(),
	apiKey: process.env.MEILI_API_KEY,
});