import AuthForm from "@/components/shared/auth-form";
import SharedIcon from "@/components/shared/shared-icon";
import { Button } from "@/components/ui/button";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();

	return (
		<div className="relative flex items-center justify-center h-screen">
			<Button
				variant="outline"
				onClick={() => {
					navigate({ to: "/" });
				}}
				className="rounded-tlarge size-12 absolute top-6 left-6 cursor-pointer"
			>
				<SharedIcon icon={Cancel01Icon} />
			</Button>

			<div className="w-full max-w-md mx-auto flex flex-col gap-4 items-center justify-center flex-1 py-10 px-6">
				<h1 className="text-center text-3xl font-normal">Log in or sign up</h1>
				<p className="px-4 text-center text-base mb-1.5">
					You'll get smarter responses and can upload files, images, and more.
				</p>
				<AuthForm />
			</div>
		</div>
	);
}
