/**
 * Plan mutations
 * Single responsibility: Write operations for plan domain only
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { chatStatusValidator } from "../schema";

/**
 * Update plan status
 */
export const updatePlanStatus = internalMutation({
	args: {
		planId: v.id("plans"),
		status: chatStatusValidator,
	},
	handler: async (ctx, { planId, status }) => {
		await ctx.db.patch(planId, { status });
	},
});
