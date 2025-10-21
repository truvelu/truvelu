import { useAuthStore } from "@/zustand/auth";
import { Slot } from "@radix-ui/react-slot";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

interface SignInButtonProps extends React.ComponentProps<typeof Slot> {
	mode?: "modal" | "page";
}

export default function SignInButton({
	mode = "page",
	children,
	...props
}: SignInButtonProps) {
	const navigate = useNavigate();
	const { toogleModalAuth } = useAuthStore(
		useShallow((state) => ({
			toogleModalAuth: state.toogleModalAuth,
		})),
	);

	return (
		<Slot
			data-slot="sign-in-button"
			{...props}
			onClick={(e) => {
				if (props?.onClick) {
					props.onClick(e);
				}

				if (mode === "page") {
					navigate({ to: "/auth" });
					return;
				}

				if (mode === "modal") {
					toogleModalAuth(true);
					return;
				}
			}}
		>
			{children}
		</Slot>
	);
}
