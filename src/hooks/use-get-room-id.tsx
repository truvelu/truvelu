import { useLocation } from "@tanstack/react-router";

export function useGetRoomId() {
	const roomId = useLocation({
		select(state) {
			return state.pathname.split("/").pop();
		},
	});
	return roomId ?? "";
}
