# Canvas Store: Structured Composite Keys Implementation ✅

## **Structured Composite Key Format**

```typescript
const compositeKey = `${id}||room-${roomId}||thread-${threadId}`;
// Example: "abc-123||room-room1||thread-thread1"
```

### **Key Structure:**

- **ID**: Original canvas ID (e.g., `abc-123`)
- **Separator**: `||` (double pipe for clear separation)
- **Room**: `room-${roomId}` (e.g., `room-room1`)
- **Thread**: `thread-${threadId}` (e.g., `thread-thread1`)

---

## **Implementation Details**

### **1. Adding Canvas:**

```typescript
addCanvas: (payload) => {
  const id = crypto.randomUUID();
  const roomId = newCanvas?.data?.roomId;
  const threadId = newCanvas?.data?.threadId;

  if (roomId && threadId) {
    const compositeKey = `${id}||room-${roomId}||thread-${threadId}`;
    newCanvasMap.set(compositeKey, newCanvas);
  }
};
```

### **2. Getting Canvas by Room and Thread:**

```typescript
getCanvas: (roomId, threadId) => {
  for (const [key, canvas] of state?.canvasMap ?? new Map()) {
    if (key.includes(`||room-${roomId}||thread-${threadId}`)) {
      return canvas;
    }
  }
  return null;
};
// ⚠️ O(n) lookup - searches through all keys
```

### **3. Getting Canvas by Room Only:**

```typescript
getCanvasByRoomId: (roomId) => {
  const roomCanvas: CanvasPayload[] = [];
  for (const [key, canvas] of state?.canvasMap ?? new Map()) {
    if (key.includes(`||room-${roomId}||`)) {
      roomCanvas.push(canvas);
    }
  }
  return roomCanvas;
};
// ⚠️ O(n) lookup - filters by roomId
```

### **4. Updating Canvas:**

```typescript
updateCanvas: (roomId, threadId, payload) => {
  // Find item by roomId and threadId
  let existingItem: CanvasPayload | null = null;
  let itemId: string | null = null;

  for (const [key, canvas] of state?.canvasMap ?? new Map()) {
    if (key.includes(`||room-${roomId}||thread-${threadId}`)) {
      existingItem = canvas;
      itemId = canvas.id;
      break;
    }
  }

  // Update both original ID key and composite key
  newCanvasMap.set(itemId, updatedItem);
  const compositeKey = `${itemId}||room-${roomId}||thread-${threadId}`;
  newCanvasMap.set(compositeKey, updatedItem);
};
```

### **5. Removing Canvas:**

```typescript
removeCanvas: (roomId, threadId) => {
  // Find item by roomId and threadId
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

  // Remove both original ID key and composite key
  newCanvasMap.delete(itemId);
  newCanvasMap.delete(compositeKey);
};
```

---

## **Performance Characteristics**

| Operation               | Time Complexity | Performance   |
| ----------------------- | --------------- | ------------- |
| **getCanvas()**         | O(n)            | ⚠️ **Slower** |
| **getCanvasByRoomId()** | O(n)            | ⚠️ **Slower** |
| **updateCanvas()**      | O(n)            | ⚠️ **Slower** |
| **removeCanvas()**      | O(n)            | ⚠️ **Slower** |
| **addCanvas()**         | O(1)            | ✅ **Fast**   |

---

## **Key Benefits**

### **✅ Advantages:**

- **Structured format** - Clear, readable composite keys
- **Unique identification** - Each canvas has both ID and composite key
- **Flexible querying** - Can search by roomId, threadId, or both
- **Self-documenting** - Key format clearly shows the structure
- **Collision-resistant** - Uses original ID as prefix

### **⚠️ Trade-offs:**

- **O(n) performance** - All lookups require iteration
- **String manipulation** - Key construction and parsing overhead
- **Memory usage** - Stores both original ID and composite key
- **Complexity** - More complex than simple composite keys

---

## **Usage Examples**

```typescript
// Adding canvas
addCanvas({
  type: CanvasType.THREAD,
  data: {
    threadId: "thread1",
    metadata: { roomId: "room1" },
  },
});
// Creates keys: "abc-123" and "abc-123||room-room1||thread-thread1"

// Getting canvas
const canvas = getCanvas("room1", "thread1");
// Searches for key containing "||room-room1||thread-thread1"

// Getting all canvas in room
const roomCanvas = getCanvasByRoomId("room1");
// Searches for keys containing "||room-room1||"

// Updating canvas
updateCanvas("room1", "thread1", { data: updatedData });
// Finds and updates both keys

// Removing canvas
removeCanvas("room1", "thread1");
// Removes both original ID and composite key
```

---

## **Key Design Benefits**

### **1. Clear Structure:**

```typescript
// ✅ Clear, readable format
"abc-123||room-room1||thread-thread1";

// vs simple composite key
"room1|thread1";
```

### **2. Unique Identification:**

```typescript
// Each canvas has two keys:
// 1. Original ID: "abc-123"
// 2. Composite key: "abc-123||room-room1||thread-thread1"
```

### **3. Flexible Querying:**

```typescript
// Can search by:
// - Exact match: "||room-room1||thread-thread1"
// - Room only: "||room-room1||"
// - Thread only: "||thread-thread1"
```

---

## **When to Use This Approach**

### **✅ Good for:**

- **Complex applications** requiring structured keys
- **Debugging** - Keys are self-documenting
- **Flexible querying** - Multiple search patterns
- **Unique identification** - Both ID and composite key available

### **❌ Avoid when:**

- **Performance is critical** - All operations are O(n)
- **Large datasets** - Iteration becomes expensive
- **Simple use cases** - Overkill for basic needs
- **Memory is constrained** - Stores duplicate keys

---

## **Summary**

Your **structured composite keys implementation** is now complete! 🎉

**Key Features:**

- ✅ **Structured format**: `id||room-${roomId}||thread-${threadId}`
- ✅ **Dual keys**: Original ID + composite key
- ✅ **Flexible querying**: Multiple search patterns
- ✅ **Self-documenting**: Clear key structure

**Trade-offs:**

- ⚠️ **O(n) performance** for all lookups
- ⚠️ **Higher memory usage** (dual keys)
- ⚠️ **String manipulation** overhead

**Perfect for:** Complex applications requiring structured, readable keys with flexible querying capabilities! 🚀
