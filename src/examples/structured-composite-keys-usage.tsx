import React from "react";
import {
  useCanvasStore,
  CanvasType,
  ContentData,
  ThreadData,
} from "../zustand/canvas";

// Example component showing structured composite keys usage
export function StructuredCompositeKeysExample() {
  const {
    canvas,
    addCanvas,
    updateCanvas,
    removeCanvas,
    getCanvas,
    getCanvasByRoomId,
    getCanvasCount,
    getCanvasCountByRoomId,
  } = useCanvasStore();

  // Example: Adding canvas with roomId and threadId
  const addCanvasToRoom = (roomId: string, threadId: string) => {
    const threadData: ThreadData = {
      threadId,
      title: `Thread in ${roomId}`,
      metadata: { roomId }, // Important: include roomId in data
    };

    addCanvas({
      type: CanvasType.THREAD,
      data: threadData,
    });
  };

  // Example: Getting canvas by roomId and threadId
  const getSpecificCanvas = (roomId: string, threadId: string) => {
    const canvas = getCanvas(roomId, threadId);
    console.log(`Canvas for room ${roomId}, thread ${threadId}:`, canvas);
    return canvas;
  };

  // Example: Getting all canvas in a room
  const getAllCanvasInRoom = (roomId: string) => {
    const allCanvas = getCanvasByRoomId(roomId);
    console.log(`All canvas in room ${roomId}:`, allCanvas);
    return allCanvas;
  };

  // Example: Updating canvas
  const updateCanvasData = (roomId: string, threadId: string) => {
    const canvas = getCanvas(roomId, threadId);
    if (!canvas) return;

    const updatedData: ThreadData = {
      ...canvas.data,
      title: `Updated: ${canvas.data?.title}`,
    };

    updateCanvas(roomId, threadId, { data: updatedData });
  };

  // Example: Removing canvas
  const removeCanvasData = (roomId: string, threadId: string) => {
    removeCanvas(roomId, threadId);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">
        Structured Composite Keys Canvas Store
      </h2>

      <div className="text-sm text-gray-600 mb-4">
        <p>
          <strong>Composite Key Format:</strong>{" "}
          <code>
            id||room-{roomId}||thread-{threadId}
          </code>
        </p>
        <p>
          <strong>Example:</strong>{" "}
          <code>abc-123||room-room1||thread-thread1</code>
        </p>
      </div>

      <div className="space-x-2">
        <button
          onClick={() => addCanvasToRoom("room1", "thread1")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add to Room1, Thread1
        </button>
        <button
          onClick={() => addCanvasToRoom("room1", "thread2")}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add to Room1, Thread2
        </button>
        <button
          onClick={() => addCanvasToRoom("room2", "thread1")}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Add to Room2, Thread1
        </button>
      </div>

      <div className="space-x-2">
        <button
          onClick={() => getSpecificCanvas("room1", "thread1")}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Get Room1, Thread1
        </button>
        <button
          onClick={() => getAllCanvasInRoom("room1")}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Get All in Room1
        </button>
        <button
          onClick={() => updateCanvasData("room1", "thread1")}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Update Room1, Thread1
        </button>
        <button
          onClick={() => removeCanvasData("room1", "thread1")}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Remove Room1, Thread1
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <strong>Total canvases:</strong> {getCanvasCount()}
        </div>
        <div>
          <strong>Canvas in Room1:</strong> {getCanvasCountByRoomId("room1")}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Current Canvas:</h3>
        {canvas.map((item) => (
          <div key={item.id} className="p-3 border rounded-lg">
            <div className="font-medium">
              {item.type === CanvasType.CONTENT ? "📄 Content" : "💬 Thread"}
            </div>
            <div className="text-sm text-gray-600">ID: {item.id}</div>
            {item.data && (
              <div className="text-sm">
                {item.type === CanvasType.CONTENT ? (
                  <div>Title: {(item.data as ContentData).title}</div>
                ) : (
                  <div>
                    Room: {(item.data as ThreadData).metadata?.roomId} | Thread:{" "}
                    {(item.data as ThreadData).threadId}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Composite Key: {item.id}||room-
              {(item.data as ThreadData).metadata?.roomId}||thread-
              {(item.data as ThreadData).threadId}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
