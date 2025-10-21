import { create } from "zustand";

export type AuthStore = {
	openModalAuth: boolean;
	toogleModalAuth: (openModalAuth: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => {
	return {
		openModalAuth: false,
		toogleModalAuth: (openModalAuth: boolean) => set({ openModalAuth }),
	};
});
