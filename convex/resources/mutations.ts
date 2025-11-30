/**
 * Resources mutations
 * Single responsibility: Unified operations across files, webSearch, and urlToMap
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";

/**
 * Publish all resources for a plan
 * This will:
 * 1. Delete all items with pendingDelete: true
 * 2. For items with replacesId: delete the original, clear replacesId
 * 3. Update all draft items to published status with current date
 */
export const publishAllForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.object({
		filesPublished: v.number(),
		filesDeleted: v.number(),
		urlsPublished: v.number(),
		urlsDeleted: v.number(),
		mappedUrlsPublished: v.number(),
		mappedUrlsDeleted: v.number(),
	}),
	handler: async (ctx, args) => {
		// Verify plan ownership
		await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		const now = new Date().toISOString();
		let filesPublished = 0;
		let filesDeleted = 0;
		let urlsPublished = 0;
		let urlsDeleted = 0;
		let mappedUrlsPublished = 0;
		let mappedUrlsDeleted = 0;

		// ============================================================
		// Process FILES
		// ============================================================
		const files = await ctx.db
			.query("files")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		for (const file of files) {
			// Delete files marked for deletion
			if (file.pendingDelete) {
				await ctx.scheduler.runAfter(0, internal.files.mutations.hardDeleteById, {
					fileId: file._id,
				});
				filesDeleted++;
				continue;
			}

			// Publish draft files
			if (file.publishedStatus?.type === "draft") {
				await ctx.db.patch(file._id, {
					publishedStatus: {
						type: "published",
						date: now,
					},
					pendingDelete: undefined,
					replacesId: undefined,
				});
				filesPublished++;
			}
		}

		// ============================================================
		// Process WEB SEARCH (URLs)
		// ============================================================
		const webSearches = await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		// Collect originals that need to be deleted (those being replaced)
		const originalsToDelete = new Set<string>();
		for (const ws of webSearches) {
			if (ws.replacesId && ws.publishedStatus?.type === "draft") {
				originalsToDelete.add(ws.replacesId);
			}
		}

		for (const ws of webSearches) {
			// Skip if this item is being replaced by a draft
			if (originalsToDelete.has(ws._id)) {
				await ctx.scheduler.runAfter(0, internal.webSearch.mutations.hardDeleteById, {
					webSearchId: ws._id,
				});
				urlsDeleted++;
				continue;
			}

			// Delete items marked for deletion
			if (ws.pendingDelete) {
				await ctx.scheduler.runAfter(0, internal.webSearch.mutations.hardDeleteById, {
					webSearchId: ws._id,
				});
				urlsDeleted++;
				continue;
			}

			// Publish draft items
			if (ws.publishedStatus?.type === "draft") {
				await ctx.db.patch(ws._id, {
					publishedStatus: {
						type: "published",
						date: now,
					},
					pendingDelete: undefined,
					replacesId: undefined,
				});
				urlsPublished++;
			}
		}

		// ============================================================
		// Process URL TO MAP (Mapped URLs)
		// ============================================================
		const urlToMaps = await ctx.db
			.query("urlToMap")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		// Collect originals that need to be deleted (those being replaced)
		const mappedOriginalsToDelete = new Set<string>();
		for (const utm of urlToMaps) {
			if (utm.replacesId && utm.publishedStatus?.type === "draft") {
				mappedOriginalsToDelete.add(utm.replacesId);
			}
		}

		for (const utm of urlToMaps) {
			// Skip if this item is being replaced by a draft
			if (mappedOriginalsToDelete.has(utm._id)) {
				await ctx.scheduler.runAfter(0, internal.urlToMap.mutations.hardDeleteUrlToMap, {
					urlToMapId: utm._id,
				});
				mappedUrlsDeleted++;
				continue;
			}

			// Delete items marked for deletion
			if (utm.pendingDelete) {
				await ctx.scheduler.runAfter(0, internal.urlToMap.mutations.hardDeleteUrlToMap, {
					urlToMapId: utm._id,
				});
				mappedUrlsDeleted++;
				continue;
			}

			// Publish draft items
			if (utm.publishedStatus?.type === "draft") {
				await ctx.db.patch(utm._id, {
					publishedStatus: {
						type: "published",
						date: now,
					},
					pendingDelete: undefined,
					replacesId: undefined,
				});
				mappedUrlsPublished++;
			}
		}

		return {
			filesPublished,
			filesDeleted,
			urlsPublished,
			urlsDeleted,
			mappedUrlsPublished,
			mappedUrlsDeleted,
		};
	},
});


