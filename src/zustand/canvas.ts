import {
	compositeKeyCreator,
	createCanvasFinder,
	findFirstCanvasIdInRoom,
	patternCreators,
} from "@/lib/canvas.utils";
import { create } from "zustand";
import { type StorageValue, persist } from "zustand/middleware";

export enum CanvasType {
	CONTENT = "content",
	THREAD = "discussion",
}

export interface GeneralData {
	threadId: string;
	roomId: string;
}

export interface ContentData extends GeneralData {
	title?: string;
}

export interface ThreadData extends GeneralData {
	title?: string;
}

export type CanvasContentPayload = {
	id: string;
	type: CanvasType.CONTENT;
	data: ContentData | null;
};

export type CanvasThreadPayload = {
	id: string;
	type: CanvasType.THREAD;
	data: ThreadData | null;
};

export type CanvasPayload = CanvasContentPayload | CanvasThreadPayload;
export type CanvasPayloadWithoutId = Omit<CanvasPayload, "id">;
export type CanvasPayloadWithOptionalId = CanvasPayloadWithoutId & {
	id?: string;
};
export type CanvasOptions = {
	id?: string;
	type?: CanvasType;
	roomId?: string;
	threadId?: string;
};

export type CanvasStore = {
	openCanvas: Map<string, boolean>;
	activeCanvasId: Map<string, string>;
	canvasMap: Map<string, Map<string, CanvasPayload>>; // composite key -> Map<id, CanvasPayload>
	upsertCanvas: (payload: CanvasPayloadWithOptionalId) => void;
	removeCanvas: (options: Required<Omit<CanvasOptions, "id">>) => void;
	getCanvas: (options?: CanvasOptions) => CanvasPayload[];
	getCanvasCount: (options?: CanvasOptions) => number;
	clearOtherCanvas: (roomId: string) => void;
	clearCanvas: (roomId: string) => void;
	closeCanvas: (roomId: string) => void;
	setActiveCanvasId: (roomId: string, id: string) => void;
	toggleCanvas: (roomId: string) => void;
	setOpenCanvas: (roomId: string, open: boolean) => void;
};

export const useCanvasStore = create<CanvasStore>()(
	persist(
		(set, get) => ({
			openCanvas: new Map(),
			activeCanvasId: new Map(),
			canvasMap: new Map(),

			upsertCanvas: (payload) => {
				set((state) => {
					try {
						const id = payload.id || crypto.randomUUID();
						const payloadType = payload.type;

						const canvasPayload: CanvasPayload = {
							id,
							type: payloadType,
							data: payload.data as ContentData | ThreadData | null,
						};

						const compositeKey = compositeKeyCreator(canvasPayload);

						const newActiveCanvasId = new Map<string, string>(
							state?.activeCanvasId ?? [],
						);
						const newCanvasMap = new Map(state?.canvasMap ?? []);
						const newOpenCanvasMap = new Map(state?.openCanvas ?? []);

						// Get or create the inner map for this composite key
						const existingCanvas = newCanvasMap.get(compositeKey);
						const innerMap = existingCanvas || new Map<string, CanvasPayload>();

						// Add/update the canvas in the inner map
						innerMap.set(id, canvasPayload);

						// Update the outer map
						newCanvasMap.set(compositeKey, innerMap);
						newActiveCanvasId.set(payload.data?.roomId ?? "", id);

						// Check if there are any existing canvases for this specific roomId
						const roomPattern = patternCreators.byRoom(
							payload.data?.roomId ?? "",
						);
						const hasCanvasInRoom = Array.from(
							state?.canvasMap?.keys() ?? [],
						).some((key) => roomPattern.test(key));

						if (!existingCanvas && !hasCanvasInRoom) {
							newOpenCanvasMap.set(payload.data?.roomId ?? "", true);
						}

						return {
							canvasMap: newCanvasMap,
							openCanvas: newOpenCanvasMap,
							activeCanvasId: newActiveCanvasId,
						};
					} catch (error) {
						console.error("Canvas upsert error:", error);
						return state;
					}
				});
			},

			removeCanvas: ({ roomId, threadId, type }) => {
				set((state) => {
					try {
						// Use direct lookup with composite key
						const lookupKey = compositeKeyCreator(type, roomId, threadId);
						const innerMap = state?.canvasMap?.get(lookupKey);

						if (!innerMap?.size) {
							return state;
						}

						// Remove the entire composite key entry (since each composite key typically has one canvas)
						const newActiveCanvasId = new Map(state?.activeCanvasId ?? []);
						const newCanvasMap = new Map(state?.canvasMap ?? []);
						const newOpenCanvasMap = new Map(state?.openCanvas ?? []);

						// Delete the canvas first
						newCanvasMap.delete(lookupKey);

						// Find first canvas for this roomId
						const firstCanvasId = findFirstCanvasIdInRoom(newCanvasMap, roomId);

						// Update or remove the activeCanvasId for this specific roomId
						if (firstCanvasId) {
							newActiveCanvasId.set(roomId, firstCanvasId);
						} else {
							// No more canvases in this room, so close it and remove activeCanvasId
							newActiveCanvasId.delete(roomId);
							newOpenCanvasMap.set(roomId, false);
						}

						return {
							canvasMap: newCanvasMap,
							openCanvas: newOpenCanvasMap,
							activeCanvasId: newActiveCanvasId,
						};
					} catch (error) {
						console.error("Canvas removal error:", error);
						return state;
					}
				});
			},

			getCanvas: (options) => {
				try {
					const state = get();
					const finder = createCanvasFinder(state?.canvasMap ?? new Map());

					// If no options provided, return all canvas
					if (!options) {
						return finder.findAll();
					}

					const { type, roomId, threadId } = options;

					// Most specific lookup: type + roomId + threadId
					if (type && roomId && threadId) {
						return finder.findByCompositeKey(type, roomId, threadId);
					}

					// Pattern matching for roomId + threadId (without type)
					if (roomId && threadId && !type) {
						return finder.findByRoomAndThread(roomId, threadId);
					}

					// Pattern matching for roomId only
					if (roomId && !threadId && !type) {
						return finder.findByRoom(roomId);
					}

					// Pattern matching for threadId only
					if (threadId && !roomId && !type) {
						return finder.findByThread(threadId);
					}

					// Pattern matching for type + roomId
					if (type && roomId && !threadId) {
						return finder.findByTypeAndRoom(type, roomId);
					}

					// Pattern matching for type + threadId
					if (type && threadId && !roomId) {
						return finder.findByTypeAndThread(type, threadId);
					}

					// Return all canvas if no specific criteria
					return finder.findAll();
				} catch (error) {
					console.error("Canvas retrieval error:", error);
					return [];
				}
			},

			getCanvasCount: (options) => {
				try {
					return get()?.getCanvas(options).length ?? 0;
				} catch (error) {
					console.error("Canvas count error:", error);
					return 0;
				}
			},

			clearCanvas: (roomId) => {
				set((state) => {
					try {
						// If no roomId provided, clear everything
						if (!roomId) {
							return {
								canvasMap: new Map(),
								openCanvas: new Map(),
								activeCanvasId: new Map(),
							};
						}

						// Clear only canvas items from the specified room using pattern matching
						const newCanvasMap = new Map<string, Map<string, CanvasPayload>>();
						const newOpenCanvasMap = new Map(state?.openCanvas ?? []);
						const newActiveCanvasId = new Map(state?.activeCanvasId ?? []);

						const pattern = patternCreators.byRoom(roomId);

						// Keep only entries that don't match the roomId pattern
						for (const [key, innerMap] of state?.canvasMap ?? []) {
							if (!pattern.test(key)) {
								newCanvasMap.set(key, innerMap);
							}
						}

						// Close the canvas and remove activeCanvasId for this room
						newOpenCanvasMap.set(roomId, false);
						newActiveCanvasId.delete(roomId);

						return {
							canvasMap: newCanvasMap,
							openCanvas: newOpenCanvasMap,
							activeCanvasId: newActiveCanvasId,
						};
					} catch (error) {
						console.error("Canvas clear error:", error);
						return state;
					}
				});
			},

			clearOtherCanvas: (roomId: string) => {
				return set((state) => {
					const oldActiveCanvasId = new Map(state?.activeCanvasId ?? []);
					const newActiveCanvasId = new Map(oldActiveCanvasId);
					const oldCanvasMap = new Map(state?.canvasMap ?? []);
					const newCanvasMap = new Map<string, Map<string, CanvasPayload>>();

					const activeCanvasIdByRoomId = oldActiveCanvasId.get(roomId);
					const pattern = patternCreators.byRoom(roomId);

					// Keep all canvases from other rooms, and only the active canvas from the specified room
					for (const [key, innerMap] of oldCanvasMap) {
						// If this key doesn't match the specified roomId, keep it
						if (!pattern.test(key)) {
							newCanvasMap.set(key, innerMap);
						} else {
							// This key matches the specified roomId
							// Only keep it if it contains the active canvas ID
							if (
								!!activeCanvasIdByRoomId &&
								innerMap.get(activeCanvasIdByRoomId)
							) {
								newCanvasMap.set(key, innerMap);
							}
						}
					}

					// Find first canvas for this roomId
					const firstCanvasId = findFirstCanvasIdInRoom(newCanvasMap, roomId);

					// Update activeCanvasId and openCanvas based on remaining canvases
					const newOpenCanvasMap = new Map(state?.openCanvas ?? []);
					if (firstCanvasId) {
						newActiveCanvasId.set(roomId, firstCanvasId);
					} else {
						// No more canvases in this room, close it and remove activeCanvasId
						newActiveCanvasId.delete(roomId);
						newOpenCanvasMap.set(roomId, false);
					}

					return {
						canvasMap: newCanvasMap,
						activeCanvasId: newActiveCanvasId,
						openCanvas: newOpenCanvasMap,
					};
				});
			},

			closeCanvas: (roomId) => {
				try {
					return set((state) => {
						const newOpenCanvasMap = new Map(state?.openCanvas ?? []);
						newOpenCanvasMap.set(roomId, false);
						return { openCanvas: newOpenCanvasMap };
					});
				} catch (error) {
					console.error("Canvas close error:", error);
				}
			},

			setActiveCanvasId: (roomId, id) => {
				set((state) => {
					const newActiveCanvasIdMap = new Map(state?.activeCanvasId ?? []);
					newActiveCanvasIdMap.set(roomId, id);
					return { activeCanvasId: newActiveCanvasIdMap };
				});
			},

			setOpenCanvas: (roomId, open) => {
				set((state) => {
					const newOpenCanvasMap = new Map(state.openCanvas);
					newOpenCanvasMap.set(roomId, open);
					return { openCanvas: newOpenCanvasMap };
				});
			},

			toggleCanvas: (roomId) => {
				set((state) => {
					const newOpenCanvasMap = new Map(state.openCanvas);
					newOpenCanvasMap.set(roomId, !newOpenCanvasMap.get(roomId));
					return { openCanvas: newOpenCanvasMap };
				});
			},
		}),
		{
			name: "canvas-storage",
			storage: {
				getItem: (name) => {
					const str = sessionStorage.getItem(name);
					if (!str) return null;
					const existingValue = JSON.parse(str);
					return {
						...existingValue,
						state: {
							...existingValue.state,
							canvasMap: new Map(
								(existingValue?.state?.canvasMap ?? []).map(
									([key, innerMapData]: [
										string,
										[string, CanvasPayload][],
									]) => [key, new Map(innerMapData)],
								),
							),
							openCanvas: new Map(
								(existingValue?.state?.openCanvas ?? []).map(
									([key, value]: [string, boolean]) => [key, value],
								),
							),
							activeCanvasId: new Map(
								(existingValue?.state?.activeCanvasId ?? []).map(
									([key, value]: [string, string]) => [key, value],
								),
							),
						},
					};
				},
				setItem: (name, newValue: StorageValue<CanvasStore>) => {
					// functions cannot be JSON encoded
					const str = JSON.stringify({
						...newValue,
						state: {
							...newValue.state,
							canvasMap: Array.from(
								newValue?.state?.canvasMap?.entries() ?? [],
							).map(([key, innerMap]) => [key, Array.from(innerMap.entries())]),
							openCanvas: Array.from(
								newValue?.state?.openCanvas?.entries() ?? [],
							).map(([key, value]: [string, boolean]) => [key, value]),
							activeCanvasId: Array.from(
								newValue?.state?.activeCanvasId?.entries() ?? [],
							).map(([key, value]: [string, string]) => [key, value]),
						},
					});
					sessionStorage.setItem(name, str);
				},
				removeItem: (name) => sessionStorage.removeItem(name),
			},
		},
	),
);
