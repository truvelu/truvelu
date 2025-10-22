import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { Button } from "../ui/button";

export default function SignOutButton({
	children,
	...props
}: ComponentProps<typeof Button>) {
	const navigate = useNavigate();
	return (
		<Button
			{...props}
			onClick={async (e) => {
				await authClient.signOut();
				if (props.onClick) {
					props.onClick(e);
				}
				navigate({ to: "/auth" });
			}}
		>
			{children}
		</Button>
	);
}
