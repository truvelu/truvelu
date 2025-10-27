import { useCallback, useRef, useState } from "react";

interface UseEditableTitleOptions {
	onSave: (newTitle: string) => void;
	onStartEdit?: () => void;
}

export function useEditableTitle({
	onSave,
	onStartEdit,
}: UseEditableTitleOptions) {
	const editableRef = useRef<HTMLSpanElement | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [originalTitle, setOriginalTitle] = useState("");

	const startEditing = useCallback(() => {
		const el = editableRef.current;
		if (!el) return;

		// Store original title for cancel
		setOriginalTitle(el.textContent ?? "");

		// Call optional callback (e.g., to close dropdown)
		onStartEdit?.();

		// Delay to ensure dropdown menu closes and loses focus
		if (!editableRef.current) return;

		// Make element editable
		editableRef.current.role = "textbox";
		editableRef.current.tabIndex = 0;
		editableRef.current.contentEditable = "true";

		// Focus the element
		setTimeout(() => {
			if (!editableRef.current) return;
			editableRef.current.focus();

			// Select all text
			const range = document.createRange();
			range.selectNodeContents(editableRef.current);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			setIsEditing(true);
		}, 200);
	}, [onStartEdit]);

	const saveEdit = useCallback(() => {
		const el = editableRef.current;
		if (!el) return;

		const newTitle = el.textContent?.trim() ?? "";

		// If empty or unchanged, revert to original
		if (!newTitle || newTitle === originalTitle) {
			el.textContent = originalTitle;
		} else if (newTitle !== originalTitle) {
			// Call the save callback
			onSave(newTitle);
		}

		// Exit edit mode
		el.contentEditable = "false";
		el.removeAttribute("role");
		el.removeAttribute("tabIndex");
		setIsEditing(false);
	}, [originalTitle, onSave]);

	const cancelEdit = useCallback(() => {
		const el = editableRef.current;
		if (!el) return;

		// Revert to original title
		el.textContent = originalTitle;

		// Exit edit mode
		el.contentEditable = "false";
		el.removeAttribute("role");
		el.removeAttribute("tabIndex");
		setIsEditing(false);
	}, [originalTitle]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLSpanElement>) => {
			if (!isEditing) return;

			if (e.key === "Enter") {
				e.preventDefault();
				saveEdit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				cancelEdit();
			}
		},
		[isEditing, saveEdit, cancelEdit],
	);

	const handleBlur = useCallback(() => {
		if (!isEditing) return;
		saveEdit();
	}, [isEditing, saveEdit]);

	return {
		editableRef,
		isEditing,
		startEditing,
		handleKeyDown,
		handleBlur,
	};
}
