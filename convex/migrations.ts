import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const addChatStatus = migrations.define({
	table: "chats",
	migrateOne: async (_ctx, doc) => {
		if (doc.status === undefined) {
			await _ctx.db.patch(doc._id, {
				status: { type: "ready", message: "Ready to start conversation" },
			});
		}
	},
});

export const run = migrations.runner([internal.migrations.addChatStatus]);
