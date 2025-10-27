import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to track the height of an input element.
 * Uses ResizeObserver to monitor height changes and window resize events.
 *
 * @returns {Object} An object containing:
 *   - inputRef: Ref to attach to the input element
 *   - inputHeight: Current height of the input element in pixels
 *   - handleInputReady: Callback to manually trigger height calculation
 */
export function useInputHeight() {
	const inputRef = useRef<HTMLDivElement>(null);
	const [inputHeight, setInputHeight] = useState(0);

	const handleInputReady = useCallback(() => {
		if (inputRef.current) {
			setInputHeight(inputRef.current.offsetHeight);
		}
	}, []);

	// Handle input height tracking with ResizeObserver and window resize
	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;

		const updateHeight = () => {
			setInputHeight(input.offsetHeight);
		};

		const ro = new ResizeObserver(updateHeight);
		ro.observe(input);

		window.addEventListener("resize", updateHeight);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updateHeight);
		};
	}, []);

	return {
		inputRef,
		inputHeight,
		handleInputReady,
	};
}
