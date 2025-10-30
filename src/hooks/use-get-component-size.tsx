import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to track the height of an input element.
 * Uses ResizeObserver to monitor height changes and window resize events.
 *
 * @returns {Object} An object containing:
 *   - ref: Ref to attach to the input element
 *   - width: Current height of the input element in pixels
 *   - handleInputReady: Callback to manually trigger height calculation
 */
// export function useInputHeight() {
export function useGetComponentSize<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	const [width, setWidth] = useState(0);
	const [height, setHeight] = useState(0);

	const handleInputReady = useCallback(() => {
		if (ref.current) {
			setHeight(ref.current.offsetHeight);
			setWidth(ref.current.offsetWidth);
		}
	}, []);

	// Handle input height tracking with ResizeObserver and window resize
	useEffect(() => {
		const component = ref.current;
		if (!component) return;

		const updateHeight = () => {
			setHeight(component.offsetHeight);
			setWidth(component.offsetWidth);
		};

		const ro = new ResizeObserver(updateHeight);
		ro.observe(component);

		window.addEventListener("resize", updateHeight);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updateHeight);
		};
	}, []);

	useEffect(() => {
		handleInputReady();
	}, [handleInputReady]);

	return {
		ref,
		width,
		height,
		handleInputReady,
	};
}
