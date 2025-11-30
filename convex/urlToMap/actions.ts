import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

if (!firecrawlApiKey) {
	throw new Error("FIRECRAWL_API_KEY environment variable not set");
}

export const mapUrl = internalAction({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
	},
	handler: async (ctx, { urlToMapId, userId }) => {
		// Dynamic import to avoid bundling issues
		const Firecrawl = (await import("@mendable/firecrawl-js")).default;
		const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

		await ctx.runMutation(api.urlToMap.mutations.updateUrlToMapStatus, {
			urlToMapId,
			userId,
			mapStatus: {
				type: "processing",
			},
		});

		await ctx.runMutation(api.urlToMap.mutations.updateUrlToMapStatus, {
			urlToMapId,
			userId,
			mapStatus: {
				type: "processing",
				message: "Mapping URL...",
			},
		});

		const urlToMap = await ctx.runQuery(api.urlToMap.queries.getUrlToMapById, {
			urlToMapId,
			userId,
		});

		if (!urlToMap) {
			throw new Error("URL to map not found");
		}

		const result = await firecrawl.map(urlToMap?.url ?? "", {
			limit: urlToMap.limit ?? 50,
			sitemap: urlToMap.ignoreSitemap ? "skip" : "include",
			includeSubdomains: urlToMap.includeSubdomains ?? true,
			search: urlToMap.search ?? "",
		});

		await Promise.all(
			result.links.map(async (item) => {
				await ctx.runMutation(api.webSearch.mutations.upsertForPlan, {
					planId: (urlToMap?.planId ?? "") as Id<"plans">,
					userId,
					data: [
						{
							title: item.title,
							url: item.url,
						},
					],
				});
			}),
		);

		await ctx.runMutation(api.urlToMap.mutations.updateUrlToMapStatus, {
			urlToMapId,
			userId,
			mapStatus: {
				type: "success",
				message: "URL mapped successfully",
			},
		});

		return result;
	},
});
