import type { Id } from "convex/_generated/dataModel";
import { create } from "zustand";

export type ResourceModalStore = {
	isOpen: boolean;
	planId: Id<"plans"> | null;
	threadId: string | null;
	openResourceModal: (planId: Id<"plans">, threadId: string) => void;
	closeResourceModal: () => void;
};

export const useResourceModalStore = create<ResourceModalStore>()((set) => ({
	isOpen: false,
	planId: null,
	threadId: null,
	openResourceModal: (planId, threadId) =>
		set({ isOpen: true, planId, threadId }),
	closeResourceModal: () =>
		set({ isOpen: false, planId: null, threadId: null }),
}));

