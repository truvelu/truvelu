/**
 * LearningRequirements mutations
 * Single responsibility: Write operations for learningRequirements domain
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";
import { freeObjectValidator } from "../schema";

/**
 * Upsert learning requirements for a plan
 */
export const upsertForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.object({
			topic: v.optional(v.string()),
			userLevel: v.optional(v.string()),
			goal: v.optional(v.string()),
			duration: v.optional(v.string()),
			other: freeObjectValidator,
		}),
	},
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Check if learning requirements already exist for this plan
		const existing = await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		if (existing) {
			// Update existing record
			await ctx.db.patch(existing._id, {
				topic: args.data.topic,
				userLevel: args.data.userLevel,
				goal: args.data.goal,
				duration: args.data.duration,
				other: args.data.other,
			});
			return {
				status: 200,
				message: "Learning requirements updated successfully",
				learningRequirementsId: existing._id,
			};
		}

		// Create new record
		const learningRequirementsId = await ctx.db.insert("learningRequirements", {
			planId: args.planId,
			userId: args.userId,
			learningId: plan.learningId,
			topic: args.data.topic,
			userLevel: args.data.userLevel,
			goal: args.data.goal,
			duration: args.data.duration,
			other: args.data.other,
		});

		return {
			status: 200,
			message: "Learning requirements created successfully",
			learningRequirementsId,
		};
	},
});

/**
 * Delete learning requirements by ID
 */
export const deleteById = mutation({
	args: {
		learningRequirementId: v.id("learningRequirements"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const requirement = await ctx.db.get(args.learningRequirementId);
		if (!requirement) {
			throw new Error(
				`Learning requirement not found: ${args.learningRequirementId}`,
			);
		}
		if (requirement.userId !== args.userId) {
			throw new Error(`Unauthorized: You don't own this learning requirement`);
		}

		await ctx.db.delete(args.learningRequirementId);
		return null;
	},
});

