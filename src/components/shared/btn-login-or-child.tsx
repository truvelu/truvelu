import { Authenticated, Unauthenticated } from "convex/react";
import type { ReactNode } from "react";
import SignInButton from "./sign-in-button";

const BtnLoginOrChild = ({ children }: { children: ReactNode }) => {
	return (
		<>
			<Authenticated>
				<SignInButton mode="modal">{children}</SignInButton>
			</Authenticated>
			<Unauthenticated>{children}</Unauthenticated>
		</>
	);
};

export default BtnLoginOrChild;
