import { authClient } from "@/lib/auth-client";
import type { ComponentProps } from "react";
import { Button } from "../ui/button";

export default function SignOutButton({
	children,
	...props
}: ComponentProps<typeof Button>) {
	return (
		<Button
			{...props}
			onClick={async (e) => {
				await authClient.signOut();
				if (props.onClick) {
					props.onClick(e);
				}
			}}
		>
			{children}
		</Button>
	);
}
