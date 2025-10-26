import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { AiPromptInput } from "@/components/shared/ai-prompt-input";
import {
	ContainerWithMargin,
	ContainerWithMaxWidth,
} from "@/components/shared/container";
import { cn } from "@/lib/utils";
import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { type FormEvent, useState } from "react";
import { v7 as uuid } from "uuid";

export const Route = createFileRoute("/_chatLayout/")({
	component: App,
	loader: async (context) => {
		await context.context.queryClient.prefetchQuery(
			convexQuery(api.auth.getCurrentUser, {}),
		);
	},
});

function App() {
	const navigate = useNavigate();

	const [isInputStatusLoading, setIsInputStatusLoading] = useState(false);

	const { data } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const createChat = useMutation({
		mutationKey: ["createChat"],
		mutationFn: useConvexMutation(api.chat.createChat),
	});
	const sendChatMessage = useMutation({
		mutationKey: ["sendChatMessage"],
		mutationFn: useConvexMutation(
			api.chat.sendChatMessage,
		).withOptimisticUpdate(
			optimisticallySendMessage(api.chat.listThreadMessages),
		),
	});

	const handleSubmit = async (
		message: PromptInputMessage,
		event: FormEvent<HTMLFormElement>,
	) => {
		setIsInputStatusLoading(true);
		const prompt = message.text ?? "";
		createChat.mutate(
			{
				modelKey: "minimax/minimax-m2:free",
				uuid: uuid(),
				userId: data?._id.toString() ?? "",
			},
			{
				onSuccess: ({ threadId, roomId }) => {
					navigate({
						to: "/c/{-$chatId}",
						params: {
							chatId: roomId.toString(),
						},
					}).finally(() => {
						setIsInputStatusLoading(false);
					});
					sendChatMessage.mutate({
						threadId,
						roomId,
						prompt,
						modelKey: "minimax/minimax-m2:free",
						userId: data?._id.toString() ?? "",
					});
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
						<AiPromptInput
							onSubmit={handleSubmit}
							isInputStatusLoading={isInputStatusLoading}
						/>
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</div>
	);
}
