import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook to track the size of an element.
 * Uses a callback ref pattern to properly handle elements that mount/unmount.
 * Uses ResizeObserver to monitor size changes and window resize events.
 *
 * @returns {Object} An object containing:
 *   - ref: Callback ref to attach to the element
 *   - width: Current width of the element in pixels
 *   - height: Current height of the element in pixels
 */
export function useGetComponentSize<T extends HTMLElement>() {
	const [element, setElement] = useState<T | null>(null);
	const [width, setWidth] = useState(0);
	const [height, setHeight] = useState(0);

	// Callback ref that tracks when the element mounts/unmounts
	const ref = useCallback((node: T | null) => {
		setElement(node);
	}, []);

	// Handle size tracking with ResizeObserver and window resize
	useEffect(() => {
		if (!element) {
			// Reset size when element unmounts
			setWidth(0);
			setHeight(0);
			return;
		}

		const updateSize = () => {
			setHeight(element.offsetHeight);
			setWidth(element.offsetWidth);
		};

		// Initial measurement
		updateSize();

		const ro = new ResizeObserver(updateSize);
		ro.observe(element);

		window.addEventListener("resize", updateSize);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updateSize);
		};
	}, [element]);

	return {
		ref,
		width,
		height,
	};
}
