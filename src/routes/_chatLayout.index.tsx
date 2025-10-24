import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { AiPromptInput } from "@/components/shared/ai-prompt-input";
import {
	ContainerWithMargin,
	ContainerWithMaxWidth,
} from "@/components/shared/container";
import { cn } from "@/lib/utils";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import type { FormEvent } from "react";
import { v7 as uuid } from "uuid";

export const Route = createFileRoute("/_chatLayout/")({
	component: App,
	beforeLoad: async (context) => {
		await context.context.queryClient.ensureQueryData(
			convexQuery(api.auth.getCurrentUser, {}),
		);
	},
});

function App() {
	const navigate = useNavigate();
	const { data } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const createChat = useMutation({
		mutationKey: ["createChat"],
		mutationFn: useConvexMutation(api.chat.createChat),
	});
	const sendChatMessage = useMutation({
		mutationKey: ["sendChatMessage"],
		mutationFn: useConvexMutation(api.chat.sendChatMessage),
	});

	const handleSubmit = async (
		message: PromptInputMessage,
		event: FormEvent<HTMLFormElement>,
	) => {
		const prompt = message.text ?? "";
		createChat.mutate(
			{
				modelKey: "x-ai/grok-4-fast",
				uuid: uuid(),
				userId: data?._id.toString() ?? "",
			},
			{
				onSuccess: ({ threadId, roomId }) => {
					sendChatMessage.mutate(
						{
							threadId,
							roomId,
							prompt,
							modelKey: "x-ai/grok-4-fast",
							userId: data?._id.toString() ?? "",
						},
						{
							onSuccess: () => {
								navigate({
									to: "/c/{-$chatId}",
									params: {
										chatId: roomId.toString(),
									},
								});
							},
						},
					);
				},
			},
		);
		event.preventDefault();
	};

	return (
		<div className="flex-1 bg-white">
			<div className={cn("top-0 translate-y-[calc((100vh/3)-52px)]")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth>
						<AiPromptInput onSubmit={handleSubmit} />
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</div>
	);
}
