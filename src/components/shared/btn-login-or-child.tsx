import { useConvexAuth } from "convex/react";
import type { ReactNode } from "react";
import SignInButton from "./sign-in-button";

const BtnLoginOrChild = ({ children }: { children: ReactNode }) => {
	const { isAuthenticated } = useConvexAuth();

	if (!isAuthenticated) {
		return <SignInButton mode="modal">{children}</SignInButton>;
	}

	return <>{children}</>;
};

export default BtnLoginOrChild;
