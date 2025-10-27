import { Authenticated, Unauthenticated } from "convex/react";
import type { ReactNode } from "react";
import SignInButton from "./sign-in-button";

const BtnLoginOrChild = ({ children }: { children: ReactNode }) => {
	return (
		<>
			<Authenticated>{children}</Authenticated>
			<Unauthenticated>
				<SignInButton mode="modal">{children}</SignInButton>
			</Unauthenticated>
		</>
	);
};

export default BtnLoginOrChild;
