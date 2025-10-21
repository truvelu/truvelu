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
  activeCanvasId: string;
  canvasMap: Map<string, Map<string, CanvasPayload>>; // composite key -> Map<id, CanvasPayload>
  upsertCanvas: (payload: CanvasPayloadWithOptionalId) => void;
  removeCanvas: (options: Omit<CanvasOptions, "id">) => void;
  getCanvas: (options?: CanvasOptions) => CanvasPayload[];
  getCanvasCount: (options?: CanvasOptions) => number;
  clearCanvas: (roomId: string) => void;
  closeCanvas: (roomId: string) => void;
  setActiveCanvasId: (id: string) => void;
};

/**
 * Creates composite key for canvas lookup
 * Only creates the composite key: type_{type}:room_{roomId}:thread_{threadId}
 */
export function compositeKeyCreator(payload: CanvasPayload): string {
  const { type, data } = payload;

  if (data?.roomId && data?.threadId) {
    return `type_${type}:room_${data.roomId}:thread_${data.threadId}`;
  }

  throw new Error("Canvas payload must have roomId and threadId");
}

/**
 * External finder utilities for canvasMap operations
 * These can be used both inside the store and externally
 */
export class CanvasFinder {
  constructor(private canvasMap: Map<string, Map<string, CanvasPayload>>) {}

  /**
   * Find all canvas items
   */
  findAll(): CanvasPayload[] {
    const allCanvas: CanvasPayload[] = [];
    for (const innerMap of this.canvasMap.values()) {
      for (const canvas of innerMap.values()) {
        allCanvas.push(canvas);
      }
    }
    return allCanvas;
  }

  /**
   * Find canvas by exact composite key (type + roomId + threadId)
   */
  findByCompositeKey(
    type: CanvasType,
    roomId: string,
    threadId: string
  ): CanvasPayload[] {
    const compositeKey = `type_${type}:room_${roomId}:thread_${threadId}`;
    const innerMap = this.canvasMap.get(compositeKey);
    return innerMap ? Array.from(innerMap.values()) : [];
  }

  /**
   * Find canvas by roomId and threadId (any type)
   */
  findByRoomAndThread(roomId: string, threadId: string): CanvasPayload[] {
    const pattern = new RegExp(
      `^type_[^:]+:room_${roomId}:thread_${threadId}$`
    );
    const matchingCanvas: CanvasPayload[] = [];

    for (const [key, innerMap] of this.canvasMap) {
      if (pattern.test(key)) {
        for (const canvas of innerMap.values()) {
          matchingCanvas.push(canvas);
        }
      }
    }
    return matchingCanvas;
  }

  /**
   * Find canvas by roomId only
   */
  findByRoom(roomId: string): CanvasPayload[] {
    const pattern = new RegExp(`:room_${roomId}:`);
    const matchingCanvas: CanvasPayload[] = [];

    for (const [key, innerMap] of this.canvasMap) {
      if (pattern.test(key)) {
        for (const canvas of innerMap.values()) {
          matchingCanvas.push(canvas);
        }
      }
    }
    return matchingCanvas;
  }

  /**
   * Find canvas by threadId only
   */
  findByThread(threadId: string): CanvasPayload[] {
    const pattern = new RegExp(`:thread_${threadId}$`);
    const matchingCanvas: CanvasPayload[] = [];

    for (const [key, innerMap] of this.canvasMap) {
      if (pattern.test(key)) {
        for (const canvas of innerMap.values()) {
          matchingCanvas.push(canvas);
        }
      }
    }
    return matchingCanvas;
  }

  /**
   * Find canvas by type and roomId
   */
  findByTypeAndRoom(type: CanvasType, roomId: string): CanvasPayload[] {
    const pattern = new RegExp(`^type_${type}:room_${roomId}:`);
    const matchingCanvas: CanvasPayload[] = [];

    for (const [key, innerMap] of this.canvasMap) {
      if (pattern.test(key)) {
        for (const canvas of innerMap.values()) {
          matchingCanvas.push(canvas);
        }
      }
    }
    return matchingCanvas;
  }

  /**
   * Find canvas by type and threadId
   */
  findByTypeAndThread(type: CanvasType, threadId: string): CanvasPayload[] {
    const pattern = new RegExp(`^type_${type}:room_[^:]+:thread_${threadId}$`);
    const matchingCanvas: CanvasPayload[] = [];

    for (const [key, innerMap] of this.canvasMap) {
      if (pattern.test(key)) {
        for (const canvas of innerMap.values()) {
          matchingCanvas.push(canvas);
        }
      }
    }
    return matchingCanvas;
  }

  /**
   * Find canvas by ID across all composite keys
   */
  findById(id: string): CanvasPayload | null {
    for (const innerMap of this.canvasMap.values()) {
      const canvas = innerMap.get(id);
      if (canvas) {
        return canvas;
      }
    }
    return null;
  }

  /**
   * Get count of canvas items
   */
  getCount(): number {
    let count = 0;
    for (const innerMap of this.canvasMap.values()) {
      count += innerMap.size;
    }
    return count;
  }

  /**
   * Check if canvas exists for given criteria
   */
  exists(type: CanvasType, roomId: string, threadId: string): boolean {
    return this.findByCompositeKey(type, roomId, threadId).length > 0;
  }
}

/**
 * Create a CanvasFinder instance from a canvasMap
 */
export function createCanvasFinder(
  canvasMap: Map<string, Map<string, CanvasPayload>>
): CanvasFinder {
  return new CanvasFinder(canvasMap);
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      activeCanvasId: "",
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
            const newCanvasMap = new Map(state?.canvasMap ?? []);

            // Get or create the inner map for this composite key
            const innerMap =
              newCanvasMap.get(compositeKey) ||
              new Map<string, CanvasPayload>();

            // Add/update the canvas in the inner map
            innerMap.set(id, canvasPayload);

            // Update the outer map
            newCanvasMap.set(compositeKey, innerMap);

            return {
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
            // Use direct lookup with composite key
            const lookupKey = `type_${type}:room_${roomId}:thread_${threadId}`;
            const innerMap = state?.canvasMap?.get(lookupKey);

            if (!innerMap?.size) {
              return state;
            }

            // Remove the entire composite key entry (since each composite key typically has one canvas)
            const newCanvasMap = new Map(state?.canvasMap ?? []);
            newCanvasMap.delete(lookupKey);

            return {
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
              };
            }

            // Clear only canvas items from the specified room using pattern matching
            const newCanvasMap = new Map<string, Map<string, CanvasPayload>>();
            const pattern = new RegExp(`:room_${roomId}:`);

            // Keep only entries that don't match the roomId pattern
            for (const [key, innerMap] of state?.canvasMap ?? []) {
              if (!pattern.test(key)) {
                newCanvasMap.set(key, innerMap);
              }
            }

            return {
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

      setActiveCanvasId: (id) => {
        set({ activeCanvasId: id });
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
                  ]) => [key, new Map(innerMapData)]
                )
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
                newValue?.state?.canvasMap?.entries() ?? []
              ).map(([key, innerMap]) => [key, Array.from(innerMap.entries())]),
            },
          });
          sessionStorage.setItem(name, str);
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
