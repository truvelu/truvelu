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

export type CanvasStore = {
  open: boolean;
  canvas: CanvasPayload[];
  canvasMap: Map<string, CanvasPayload>; // id -> CanvasPayload
  addCanvas: (payload: CanvasPayloadWithoutId) => void;
  updateCanvas: (
    roomId: string,
    threadId: string,
    payload: Partial<CanvasPayloadWithoutId>
  ) => void;
  removeCanvas: (roomId: string, threadId: string) => void;
  getCanvas: (roomId: string, threadId: string) => CanvasPayload | null;
  getCanvasByRoomId: (roomId: string) => CanvasPayload[];
  getCanvasCount: () => number;
  getCanvasCountByRoomId: (roomId: string) => number;
  reorderCanvas: (fromIndex: number, toIndex: number) => void;
  clearCanvas: () => void;
  closeCanvas: () => void;
};

// export const useCanvasStore = create<CanvasStore>();

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      open:
        !!get()?.canvas?.length &&
        get()?.canvas?.every((item) => item.data !== null),
      canvas: [],
      canvasMap: new Map(),

      addCanvas: (payload) => {
        set((state) => {
          const id = crypto.randomUUID();
          const newCanvas: CanvasPayload =
            payload.type === CanvasType.CONTENT
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

          // Update array, canvasMap, and roomThreadMap
          const newCanvasArray = [...(state?.canvas ?? []), newCanvas];
          const newCanvasMap = new Map(state?.canvasMap ?? []);

          // Update canvasMap with structured composite key
          const roomId = newCanvas?.data?.roomId;
          const threadId = newCanvas?.data?.threadId;

          if (roomId && threadId) {
            const compositeKey = `${id}||room-${roomId}||thread-${threadId}`;
            newCanvasMap.set(compositeKey, newCanvas);
          }

          return {
            canvas: newCanvasArray,
            canvasMap: newCanvasMap,
            open: true,
          };
        });
      },

      updateCanvas: (roomId, threadId, payload) => {
        set((state) => {
          // Find the item by roomId and threadId
          let existingItem: CanvasPayload | null = null;
          let itemId: string | null = null;

          for (const [key, canvas] of state?.canvasMap ?? new Map()) {
            if (key.includes(`||room-${roomId}||thread-${threadId}`)) {
              existingItem = canvas;
              itemId = canvas.id;
              break;
            }
          }

          if (!existingItem || !itemId) return state;

          let updatedItem: CanvasPayload;

          if (existingItem.type === CanvasType.CONTENT) {
            updatedItem = {
              ...existingItem,
              data: (payload.data as ContentData | null) ?? existingItem.data,
            };
          } else {
            updatedItem = {
              ...existingItem,
              data: (payload.data as ThreadData | null) ?? existingItem.data,
            };
          }

          // Find index in array for update
          const index = (state?.canvas ?? []).findIndex(
            (item) => item.id === itemId
          );
          if (index === -1) return state;

          // Update both array and map
          const newCanvas = [...(state?.canvas ?? [])];
          newCanvas[index] = updatedItem;
          const newCanvasMap = new Map(state?.canvasMap);

          // Update both the original ID key and composite key
          newCanvasMap.set(itemId, updatedItem);
          const compositeKey = `${itemId}||room-${roomId}||thread-${threadId}`;
          newCanvasMap.set(compositeKey, updatedItem);

          return {
            canvas: newCanvas,
            canvasMap: newCanvasMap,
          };
        });
      },

      removeCanvas: (roomId, threadId) => {
        set((state) => {
          // Find the item by roomId and threadId
          let existingItem: CanvasPayload | null = null;
          let itemId: string | null = null;
          let compositeKey: string | null = null;

          for (const [key, canvas] of state?.canvasMap ?? new Map()) {
            if (key.includes(`||room-${roomId}||thread-${threadId}`)) {
              existingItem = canvas;
              itemId = canvas.id;
              compositeKey = key;
              break;
            }
          }

          if (!existingItem || !itemId || !compositeKey) return state;

          // Remove from array and map
          const newCanvas = (state?.canvas ?? []).filter(
            (item) => item.id !== itemId
          );
          const newCanvasMap = new Map(state?.canvasMap ?? []);

          // Remove both the original ID key and composite key
          newCanvasMap.delete(itemId);
          newCanvasMap.delete(compositeKey);

          return {
            canvas: newCanvas,
            canvasMap: newCanvasMap,
            open: newCanvas.length > 0,
          };
        });
      },

      getCanvas: (roomId, threadId) => {
        // Find the item by roomId and threadId using structured composite key
        for (const [key, canvas] of get()?.canvasMap ?? new Map()) {
          if (key.includes(`||room-${roomId}||thread-${threadId}`)) {
            return canvas;
          }
        }
        return null;
      },

      getCanvasByRoomId: (roomId) => {
        // O(n) lookup using structured composite keys - filter by roomId
        const roomCanvas: CanvasPayload[] = [];
        for (const [key, canvas] of get()?.canvasMap ?? new Map()) {
          if (key.includes(`||room-${roomId}||`)) {
            roomCanvas.push(canvas);
          }
        }
        return roomCanvas;
      },

      getCanvasCount: () => {
        return (get()?.canvas ?? []).length;
      },

      getCanvasCountByRoomId: (roomId) => {
        return get()?.getCanvasByRoomId(roomId).length;
      },

      reorderCanvas: (fromIndex, toIndex) => {
        set((state) => {
          const newCanvas = [...(state?.canvas ?? [])];
          const [movedItem] = newCanvas.splice(fromIndex, 1);
          newCanvas.splice(toIndex, 0, movedItem);

          // Update map to reflect new order and maintain composite keys
          const newCanvasMap = new Map(state?.canvasMap ?? []);
          newCanvas?.forEach((item) => {
            // Set the original ID key
            newCanvasMap.set(item.id, item);

            // Set the composite key if roomId and threadId exist
            const roomId = item.data?.roomId;
            const threadId = item.data?.threadId;
            if (roomId && threadId) {
              const compositeKey = `${item.id}||room-${roomId}||thread-${threadId}`;
              newCanvasMap.set(compositeKey, item);
            }
          });

          return {
            canvas: newCanvas,
            canvasMap: newCanvasMap,
          };
        });
      },

      clearCanvas: () => {
        set({
          canvas: [],
          canvasMap: new Map(),
          open: false,
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
