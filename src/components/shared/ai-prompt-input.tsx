import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	type PromptInputMessage,
	type PromptInputProps,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
	Infinity01Icon,
	Message01Icon,
	ShapeCollectionIcon,
	Tick02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { streamSectionValidator } from "convex/schema";
import type { Infer } from "convex/values";
import {
	type ChangeEvent,
	type FormEvent,
	memo,
	useCallback,
	useRef,
	useState,
} from "react";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuItemIndicator,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import BtnLoginOrChild from "./btn-login-or-child";
import SharedIcon from "./shared-icon";

interface AiPromptInputProps extends PromptInputProps {
	isInputStatusLoading: boolean;
	type?: Infer<typeof streamSectionValidator>;
}

export const AiPromptInput = memo(
	({
		type = "thread",
		onSubmit,
		onChange,
		isInputStatusLoading,
		...props
	}: AiPromptInputProps) => {
		const MODE = [
			{
				type: "agent",
				icon: Infinity01Icon as IconSvgElement,
				label: "Agent",
			},
			{
				type: "ask",
				icon: Message01Icon as IconSvgElement,
				label: "Ask",
			},
		] as const;

		const textareaRef = useRef<HTMLTextAreaElement>(null);

		const [value, setValue] = useState("");
		const [mode, setMode] = useState<(typeof MODE)[number]["type"]>("agent");

		const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
			const { value } = e.target;

			setValue(value);
		}, []);

		const handleSubmit = useCallback(
			(message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
				if (!onSubmit) return;
				if (!value.trim() && !isInputStatusLoading) return;
				onSubmit(message, event);
				setValue("");
			},
			[onSubmit, value, isInputStatusLoading],
		);

		return (
			<PromptInput {...props} onSubmit={handleSubmit}>
				<PromptInputBody className="border-none px-2.5 min-h-14 justify-center">
					<PromptInputAttachments>
						{(attachment) => <PromptInputAttachment data={attachment} />}
					</PromptInputAttachments>

					<PromptInputTextarea
						ref={textareaRef}
						onChange={handleChange}
						value={value}
						className="p-2.5 text-base"
					/>
				</PromptInputBody>

				<PromptInputToolbar className="p-2.5 pt-0">
					<PromptInputTools>
						<PromptInputActionMenu>
							<PromptInputActionMenuTrigger className="rounded-full! cursor-pointer" />
							<PromptInputActionMenuContent className="rounded-tmedium p-1.5">
								<PromptInputActionAddAttachments className="rounded-lg py-1.5 px-2.5 text-sm cursor-pointer" />
								<Separator className="my-1.5" />
								<DropdownMenuItem className="rounded-lg py-1.5 px-2.5 text-sm cursor-pointer">
									<SharedIcon icon={ShapeCollectionIcon} className="mr-2" />
									Change composition
								</DropdownMenuItem>
							</PromptInputActionMenuContent>
						</PromptInputActionMenu>

						{type === "learning-creation" && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="rounded-tlarge px-5">
										<SharedIcon
											icon={
												MODE.find((item) => item.type === mode)
													?.icon as IconSvgElement
											}
										/>
										{MODE.find((item) => item.type === mode)?.label}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									className="w-fit rounded-tmedium p-1"
									align="start"
								>
									<DropdownMenuRadioGroup
										value={mode}
										onValueChange={(value) =>
											setMode(value as (typeof MODE)[number]["type"])
										}
									>
										{MODE.map((item) => (
											<DropdownMenuRadioItem
												key={item.type}
												value={item.type}
												withIcon={false}
												className="justify-between rounded-tmedium"
											>
												<div className="flex items-center gap-2">
													<SharedIcon icon={item.icon} />
													<p>{item.label}</p>
												</div>

												<span className="pointer-events-none flex size-3.5 items-center justify-center">
													<DropdownMenuItemIndicator>
														<SharedIcon icon={Tick02Icon} size={8} />
													</DropdownMenuItemIndicator>
												</span>
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</PromptInputTools>
					<BtnLoginOrChild>
						<PromptInputSubmit
							status={isInputStatusLoading ? "streaming" : "ready"}
							className="rounded-full cursor-pointer"
						/>
					</BtnLoginOrChild>
				</PromptInputToolbar>
			</PromptInput>
		);
	},
);
