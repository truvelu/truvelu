import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

export enum CanvasType {
  CONTENT = "content",
  THREAD = "thread",
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
  open: boolean;
  canvas: CanvasPayload[];
  canvasMap: Map<string, CanvasPayload[]>; // composite key -> CanvasPayload[]
  upsertCanvas: (payload: CanvasPayloadWithOptionalId) => void;
  removeCanvas: (roomId: string, threadId: string) => void;
  getCanvas: (options?: CanvasOptions) => CanvasPayload[];
  getCanvasCount: (options?: CanvasOptions) => number;
  clearCanvas: (roomId?: string) => void;
  closeCanvas: () => void;
};

export function compositeKeyCreator(payload: CanvasPayload): string[] {
  const keys: string[] = [];

  // Single value keys
  keys.push(`type_${payload.type}`);
  keys.push(`id_${payload.id}`);
  if (payload.data?.roomId) keys.push(`room_${payload.data.roomId}`);
  if (payload.data?.threadId) keys.push(`thread_${payload.data.threadId}`);

  // Two value combinations
  keys.push(`type_${payload.type}:id_${payload.id}`);
  if (payload.data?.roomId) {
    keys.push(`type_${payload.type}:room_${payload.data.roomId}`);
    keys.push(`id_${payload.id}:room_${payload.data.roomId}`);
  }
  if (payload.data?.threadId) {
    keys.push(`type_${payload.type}:thread_${payload.data.threadId}`);
    keys.push(`id_${payload.id}:thread_${payload.data.threadId}`);
  }
  if (payload.data?.roomId && payload.data?.threadId) {
    keys.push(`room_${payload.data.roomId}:thread_${payload.data.threadId}`);
  }

  // Three value combinations
  if (payload.data?.roomId) {
    keys.push(
      `type_${payload.type}:id_${payload.id}:room_${payload.data.roomId}`
    );
  }
  if (payload.data?.threadId) {
    keys.push(
      `type_${payload.type}:id_${payload.id}:thread_${payload.data.threadId}`
    );
  }
  if (payload.data?.roomId && payload.data?.threadId) {
    keys.push(
      `type_${payload.type}:room_${payload.data.roomId}:thread_${payload.data.threadId}`
    );
    keys.push(
      `id_${payload.id}:room_${payload.data.roomId}:thread_${payload.data.threadId}`
    );
  }

  // Four value combination
  if (payload.data?.roomId && payload.data?.threadId) {
    keys.push(
      `type_${payload.type}:id_${payload.id}:room_${payload.data.roomId}:thread_${payload.data.threadId}`
    );
  }

  return keys;
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      open:
        !!get()?.canvas?.length &&
        get()?.canvas?.every((item) => item.data !== null),
      canvas: [],
      canvasMap: new Map(),

      upsertCanvas: (payload) => {
        set((state) => {
          const id = payload.id || crypto.randomUUID();
          const payloadType = payload.type;

          // Check if canvas with this id already exists
          const existingIndex = (state?.canvas ?? []).findIndex(
            (item) => item.id === id
          );

          const canvasPayload: CanvasPayload =
            payloadType === CanvasType.CONTENT
              ? {
                  id,
                  type: CanvasType.CONTENT,
                  data: payload.data as ContentData | null,
                }
              : {
                  id,
                  type: CanvasType.THREAD,
                  data: payload.data as ThreadData | null,
                };

          let newCanvasArray: CanvasPayload[];
          if (existingIndex >= 0) {
            // Update existing canvas
            newCanvasArray = [...(state?.canvas ?? [])];
            newCanvasArray[existingIndex] = canvasPayload;
          } else {
            // Add new canvas
            newCanvasArray = [...(state?.canvas ?? []), canvasPayload];
          }

          // Update canvasMap with all composite keys
          const newCanvasMap = new Map(state?.canvasMap ?? []);
          const compositeKeys = compositeKeyCreator(canvasPayload);

          // Remove old entries for this canvas if updating
          if (existingIndex >= 0) {
            const oldCanvas = (state?.canvas ?? [])[existingIndex];
            const oldKeys = compositeKeyCreator(oldCanvas);
            oldKeys.forEach((key) => {
              const existingArray = newCanvasMap.get(key) || [];
              const filteredArray = existingArray.filter(
                (item) => item.id !== oldCanvas.id
              );
              if (filteredArray.length > 0) {
                newCanvasMap.set(key, filteredArray);
              } else {
                newCanvasMap.delete(key);
              }
            });
          }

          // Add canvas to all composite key arrays
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
            open: true,
          };
        });
      },

      removeCanvas: (roomId, threadId) => {
        set((state) => {
          // Find the item by roomId and threadId
          let existingItem: CanvasPayload | null = null;
          let itemId: string | null = null;

          for (const [, canvasArray] of state?.canvasMap ?? new Map()) {
            const canvas = canvasArray.find(
              (item) =>
                item.data?.roomId === roomId && item.data?.threadId === threadId
            );
            if (canvas) {
              existingItem = canvas;
              itemId = canvas.id;
              break;
            }
          }

          if (!existingItem || !itemId) return state;

          // Remove from array
          const newCanvas = (state?.canvas ?? []).filter(
            (item) => item.id !== itemId
          );

          // Update canvasMap - remove canvas from all composite key arrays
          const newCanvasMap = new Map(state?.canvasMap ?? []);
          const keysToUpdate = compositeKeyCreator(existingItem);

          keysToUpdate.forEach((key) => {
            const existingArray = newCanvasMap.get(key) || [];
            const filteredArray = existingArray.filter(
              (item) => item.id !== itemId
            );
            if (filteredArray.length > 0) {
              newCanvasMap.set(key, filteredArray);
            } else {
              newCanvasMap.delete(key);
            }
          });

          return {
            canvas: newCanvas,
            canvasMap: newCanvasMap,
            open: newCanvas.length > 0,
          };
        });
      },

      getCanvas: (options) => {
        // If no options provided, return all canvas
        if (!options) {
          return get()?.canvas ?? [];
        }

        const { id, type, roomId, threadId } = options;

        // Build composite key based on provided options
        const keyParts: string[] = [];
        if (type) keyParts.push(`type_${type}`);
        if (id) keyParts.push(`id_${id}`);
        if (roomId) keyParts.push(`room_${roomId}`);
        if (threadId) keyParts.push(`thread_${threadId}`);

        if (keyParts.length === 0) {
          return get()?.canvas ?? [];
        }

        const compositeKey = keyParts.join(":");
        const canvasArray = get()?.canvasMap?.get(compositeKey);

        return canvasArray || [];
      },

      getCanvasCount: (options) => {
        return get()?.getCanvas(options).length;
      },

      clearCanvas: (roomId) => {
        set((state) => {
          // If no roomId provided, clear everything
          if (!roomId) {
            return {
              canvas: [],
              canvasMap: new Map(),
              open: false,
            };
          }

          // Clear only canvas items from the specified room
          const remainingCanvas = (state?.canvas ?? []).filter(
            (canvas) => canvas.data?.roomId !== roomId
          );

          // Rebuild canvasMap with remaining items
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
            open: remainingCanvas.length > 0,
          };
        });
      },

      closeCanvas: () => {
        return get().clearCanvas();
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
              canvasMap: new Map(existingValue.state.canvasMap),
            },
          };
        },
        setItem: (name, newValue: StorageValue<CanvasStore>) => {
          // functions cannot be JSON encoded
          const str = JSON.stringify({
            ...newValue,
            state: {
              ...newValue.state,
              canvasMap: Array.from(newValue.state.canvasMap.entries()),
            },
          });
          sessionStorage.setItem(name, str);
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
