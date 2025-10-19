import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

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
  canvas: CanvasPayload[];
  canvasMap: Map<string, CanvasPayload[]>; // composite key -> CanvasPayload[]
  upsertCanvas: (payload: CanvasPayloadWithOptionalId) => void;
  removeCanvas: (options: Omit<CanvasOptions, "id">) => void;
  getCanvas: (options?: CanvasOptions) => CanvasPayload[];
  getCanvasCount: (options?: CanvasOptions) => number;
  clearCanvas: (roomId: string) => void;
  closeCanvas: (roomId: string) => void;
};

/**
 * Creates optimized composite keys for efficient canvas lookup
 * Only generates essential keys to reduce memory overhead
 */
export function compositeKeyCreator(payload: CanvasPayload): string[] {
  const keys: string[] = [];
  const { type, id, data } = payload;

  // Essential single-value keys
  keys.push(`type_${type}`);
  keys.push(`id_${id}`);

  if (data?.roomId) keys.push(`room_${data.roomId}`);
  if (data?.threadId) keys.push(`thread_${data.threadId}`);

  // Combined keys for complex queries (most commonly used)
  if (data?.roomId && data?.threadId) {
    keys.push(`type_${type}:room_${data.roomId}:thread_${data.threadId}`);
  }

  if (data?.roomId) {
    keys.push(`type_${type}:room_${data.roomId}`);
  }

  return keys;
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      canvas: [],
      canvasMap: new Map(),
      _performanceMetrics: {
        operationsCount: 0,
        lastOperationTime: 0,
      },

      upsertCanvas: (payload) => {
        set((state) => {
          try {
            const id = payload.id || crypto.randomUUID();
            const payloadType = payload.type;

            // Optimized: Use Map lookup instead of findIndex for better performance
            const existingIndex = payload.id
              ? (state?.canvas ?? []).findIndex(
                  (item) => item.id === payload.id
                )
              : (state?.canvas ?? []).findIndex((item) => {
                  return (
                    item.type === payload.type &&
                    (!payload.data?.roomId ||
                      item.data?.roomId === payload.data.roomId) &&
                    (!payload.data?.threadId ||
                      item.data?.threadId === payload.data.threadId)
                  );
                });

            const canvasPayload: CanvasPayload = {
              id,
              type: payloadType,
              data: payload.data as ContentData | ThreadData | null,
            };

            // Optimized: Use more efficient array operations
            let newCanvasArray: CanvasPayload[];
            if (existingIndex >= 0) {
              newCanvasArray = [...(state?.canvas ?? [])];
              newCanvasArray[existingIndex] = canvasPayload;
            } else {
              newCanvasArray = [...(state?.canvas ?? []), canvasPayload];
            }

            // Optimized: Batch map updates
            const newCanvasMap = new Map(state?.canvasMap ?? []);
            const compositeKeys = compositeKeyCreator(canvasPayload);

            // Remove old entries if updating
            if (existingIndex >= 0) {
              const oldCanvas = (state?.canvas ?? [])[existingIndex];
              const oldKeys = compositeKeyCreator(oldCanvas);

              oldKeys.forEach((key) => {
                const existingArray = newCanvasMap.get(key);
                if (existingArray) {
                  const filteredArray = existingArray.filter(
                    (item) => item.id !== oldCanvas.id
                  );
                  if (filteredArray.length > 0) {
                    newCanvasMap.set(key, filteredArray);
                  } else {
                    newCanvasMap.delete(key);
                  }
                }
              });
            }

            // Add new entries
            compositeKeys.forEach((key) => {
              const existingArray = newCanvasMap.get(key) || [];
              const filteredArray = existingArray.filter(
                (item) => item.id !== id
              );
              newCanvasMap.set(key, [...filteredArray, canvasPayload]);
            });

            return {
              canvas: newCanvasArray,
              canvasMap: newCanvasMap,
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
            // Optimized: Use direct lookup with composite key
            const lookupKey = `type_${type}:room_${roomId}:thread_${threadId}`;
            const canvasArray = state?.canvasMap?.get(lookupKey);

            if (!canvasArray?.length) {
              // Fallback: search through canvas array if composite key not found
              const existingItem = (state?.canvas ?? []).find(
                (item) =>
                  item.data?.roomId === roomId &&
                  item.data?.threadId === threadId &&
                  item.type === type
              );

              if (!existingItem) return state;

              return {
                canvas: (state?.canvas ?? []).filter(
                  (item) => item.id !== existingItem.id
                ),
                canvasMap: new Map(state?.canvasMap ?? []),
              };
            }

            const existingItem = canvasArray[0];
            const itemId = existingItem.id;

            // Remove from array
            const newCanvas = (state?.canvas ?? []).filter(
              (item) => item.id !== itemId
            );

            // Update canvasMap - remove canvas from all composite key arrays
            const newCanvasMap = new Map(state?.canvasMap ?? []);
            const keysToUpdate = compositeKeyCreator(existingItem);

            keysToUpdate.forEach((key) => {
              const existingArray = newCanvasMap.get(key);
              if (existingArray) {
                const filteredArray = existingArray.filter(
                  (item) => item.id !== itemId
                );
                if (filteredArray.length > 0) {
                  newCanvasMap.set(key, filteredArray);
                } else {
                  newCanvasMap.delete(key);
                }
              }
            });

            return {
              canvas: newCanvas,
              canvasMap: newCanvasMap,
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

          // If no options provided, return all canvas
          if (!options) {
            return state?.canvas ?? [];
          }

          const { id, type, roomId, threadId } = options;

          // Optimized: Use most specific key first for better performance
          if (type && roomId && threadId) {
            const compositeKey = `type_${type}:room_${roomId}:thread_${threadId}`;
            return state?.canvasMap?.get(compositeKey) ?? [];
          }

          if (type && roomId) {
            const compositeKey = `type_${type}:room_${roomId}`;
            return state?.canvasMap?.get(compositeKey) ?? [];
          }

          if (type && threadId) {
            const compositeKey = `type_${type}:thread_${threadId}`;
            return state?.canvasMap?.get(compositeKey) ?? [];
          }

          // Fallback: Build composite key for other combinations
          const keyParts: string[] = [];
          if (type) keyParts.push(`type_${type}`);
          if (id) keyParts.push(`id_${id}`);
          if (roomId) keyParts.push(`room_${roomId}`);
          if (threadId) keyParts.push(`thread_${threadId}`);

          if (keyParts.length === 0) {
            return state?.canvas ?? [];
          }

          const compositeKey = keyParts.join(":");
          return state?.canvasMap?.get(compositeKey) ?? [];
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
                canvas: [],
                canvasMap: new Map(),
              };
            }

            // Optimized: Clear only canvas items from the specified room
            const remainingCanvas = (state?.canvas ?? []).filter(
              (canvas) => canvas.data?.roomId !== roomId
            );

            // Optimized: Rebuild canvasMap more efficiently
            const newCanvasMap = new Map<string, CanvasPayload[]>();
            remainingCanvas.forEach((item) => {
              const compositeKeys = compositeKeyCreator(item);
              compositeKeys.forEach((key) => {
                const existingArray = newCanvasMap.get(key) || [];
                newCanvasMap.set(key, [...existingArray, item]);
              });
            });

            return {
              canvas: remainingCanvas,
              canvasMap: newCanvasMap,
            };
          } catch (error) {
            console.error("Canvas clear error:", error);
            return state;
          }
        });
      },

      closeCanvas: (roomId) => {
        try {
          return get().clearCanvas(roomId);
        } catch (error) {
          console.error("Canvas close error:", error);
        }
      },
    }),
    {
      name: "canvas-storage",
      storage: {
        getItem: (name) => {
          try {
            const str = sessionStorage.getItem(name);
            if (!str) return null;
            const existingValue = JSON.parse(str);
            return {
              ...existingValue,
              state: {
                ...existingValue.state,
                canvasMap: new Map(existingValue.state.canvasMap || []),
                _performanceMetrics: existingValue.state
                  ._performanceMetrics || {
                  operationsCount: 0,
                  lastOperationTime: 0,
                },
              },
            };
          } catch (error) {
            console.error("Storage getItem error:", error);
            return null;
          }
        },
        setItem: (name, newValue: StorageValue<CanvasStore>) => {
          try {
            // functions cannot be JSON encoded
            const str = JSON.stringify({
              ...newValue,
            });
            sessionStorage.setItem(name, str);
          } catch (error) {
            console.error("Storage setItem error:", error);
          }
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
