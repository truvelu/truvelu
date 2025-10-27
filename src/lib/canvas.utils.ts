import type { CanvasPayload, CanvasType } from "@/zustand/canvas";

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
 * Extracts type, roomId, and threadId from a composite key
 * Parses the composite key format: type_{type}:room_{roomId}:thread_{threadId}
 */
export function compositeKeyExtractor(compositeKey: string): {
	type: CanvasType;
	roomId: string;
	threadId: string;
} | null {
	const pattern = /^type_([^:]+):room_([^:]+):thread_(.+)$/;
	const match = compositeKey.match(pattern);

	if (!match) {
		return null;
	}

	const [, type, roomId, threadId] = match;
	return {
		type: type as CanvasType,
		roomId,
		threadId,
	};
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
		threadId: string,
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
			`^type_[^:]+:room_${roomId}:thread_${threadId}$`,
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
	canvasMap: Map<string, Map<string, CanvasPayload>>,
): CanvasFinder {
	return new CanvasFinder(canvasMap);
}
