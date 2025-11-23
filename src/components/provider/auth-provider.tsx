import { createContext, useContext } from "react";

type AuthProviderState = {
	userId: string;
	token: string;
};

interface AuthProviderProps extends Partial<AuthProviderState> {
	children: React.ReactNode;
}

const initialState: AuthProviderState = {
	userId: "",
	token: "",
};

const AuthProviderContext = createContext<AuthProviderState>(initialState);

export function AuthProvider({ userId, token, children }: AuthProviderProps) {
	const value = { userId: userId ?? "", token: token ?? "" };

	return (
		<AuthProviderContext.Provider value={value}>
			{children}
		</AuthProviderContext.Provider>
	);
}

export const useAuth = () => {
	const context = useContext(AuthProviderContext);

	if (context === undefined)
		throw new Error("useAuth must be used within a AuthProvider");

	return context;
};
