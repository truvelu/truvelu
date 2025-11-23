/**
 * Utility helpers for working with lightweight mock arrays.
 *
 * These are especially helpful when rendering skeleton states or repeatable
 * placeholder UIs. Keeping the logic centralized encourages consistent
 * patterns and avoids re-allocating arrays inside component bodies.
 */
export const createArrayMock = (length: number, startAt = 0): number[] => {
	if (length < 0) {
		throw new Error("length must be a non-negative number");
	}

	return Array.from({ length }, (_, index) => startAt + index);
};


