import { useAuthStore } from "@/zustand/auth";
import { useShallow } from "zustand/react/shallow";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import AuthForm from "./auth-form";
import CloseButton from "./close-button";

export default function AuthModal() {
	const { openModalAuth, toogleModalAuth } = useAuthStore(
		useShallow((state) => ({
			openModalAuth: state.openModalAuth,
			toogleModalAuth: state.toogleModalAuth,
		})),
	);
	return (
		<Dialog open={openModalAuth} onOpenChange={toogleModalAuth}>
			<DialogContent
				className="max-w-[373px] sm:max-w-[388px] rounded-tlarge px-0 pt-0 pb-10"
				showCloseButton={false}
			>
				<div className="h-header px-2.5 pt-2.5 flex items-center justify-end">
					<CloseButton
						buttonProps={{
							onClick: () => toogleModalAuth(false),
							className: "size-9 rounded-full",
						}}
					/>
				</div>
				<DialogHeader className="gap-5 px-6">
					<DialogTitle className="text-center text-3xl font-normal">
						Log in or sign up
					</DialogTitle>
					<DialogDescription className="px-4 text-center text-base mb-1.5">
						You'll get smarter responses and can upload files, images, and more.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6">
					<AuthForm />
				</div>
			</DialogContent>
		</Dialog>
	);
}
