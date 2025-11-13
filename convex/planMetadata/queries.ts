/**
 * Queries for planMetadata and all its children
 * Single responsibility: Read operations only
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

/**
 * Get plan metadata with all related data by planId
 */
export const getByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadata = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.first();

		if (!planMetadata) {
			return null;
		}

		const [learningRequirements, searchQueries, searchResults] =
			await Promise.all([
				ctx.db
					.query("planMetadataLearningRequirements")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
				ctx.db
					.query("planMetadataSearchQueries")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
				ctx.db
					.query("planMetadataSearchResults")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
			]);

		return {
			planMetadata,
			learningRequirements,
			searchQueries,
			searchResults,
		};
	},
});

/**
 * Internal query for plan metadata with all children
 */
export const getByPlanIdInternal = internalQuery({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadata = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.first();

		if (!planMetadata) {
			return null;
		}

		const [learningRequirements, searchQueries, searchResults] =
			await Promise.all([
				ctx.db
					.query("planMetadataLearningRequirements")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
				ctx.db
					.query("planMetadataSearchQueries")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
				ctx.db
					.query("planMetadataSearchResults")
					.withIndex("by_planMetadataId_and_userId", (q) =>
						q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
					)
					.collect(),
			]);

		return {
			planMetadata,
			learningRequirements,
			searchQueries,
			searchResults,
		};
	},
});
