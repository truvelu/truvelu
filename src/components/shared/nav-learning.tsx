import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useEditableTitle } from "@/hooks/use-editable-title";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { createArrayMock } from "@/lib/array-utils";
import { cn } from "@/lib/utils";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import {
	useConvexMutation,
	useConvexPaginatedQuery,
} from "@convex-dev/react-query";
import {
	Archive03Icon,
	ArrowRight01Icon,
	Delete02Icon,
	Edit03Icon,
	Folder01Icon,
	FolderAddIcon,
	FolderOpenIcon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { AuthLoading, Authenticated } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../provider/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useSidebar } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import SharedIcon from "./shared-icon";

const NavNewLearningItem = () => {
	const navigate = useNavigate();

	const { setOpen: setSidebarOpen, setOpenMobile: setSidebarOpenMobile } =
		useSidebar();
	const { upsertCanvas } = useCanvasStore(
		useShallow(({ upsertCanvas }) => ({
			upsertCanvas,
		})),
	);

	const [openDialog, setOpenDialog] = useState(false);
	const [isAutogenerateTitle, setIsAutogenerateTitle] = useState(true);
	const [manualTitle, setManualTitle] = useState("");

	const { userId } = useAuth();

	const createLearningPanel = useMutation({
		mutationFn: useConvexMutation(api.learning.mutations.createLearningPanel),
	});

	return (
		<SidebarMenuItem>
			<Dialog open={openDialog} onOpenChange={setOpenDialog}>
				<DialogTrigger asChild>
					<SidebarMenuButton
						tooltip="Learning"
						className="cursor-pointer rounded-tlarge py-0"
					>
						<SharedIcon icon={FolderAddIcon} />
						<span>New learning</span>
					</SidebarMenuButton>
				</DialogTrigger>
				<DialogContent className="rounded-tmedium">
					<DialogHeader>
						<DialogTitle>Learning name</DialogTitle>
						<DialogDescription />
					</DialogHeader>

					<div className="flex flex-col gap-3 items-start">
						<Label className="flex items-start gap-2">
							<Checkbox
								id="toggle-2"
								className="border-sidebar-border data-[state=checked]:border-black data-[state=checked]:bg-sidebar-primary data-[state=checked]:text-white"
								checked={isAutogenerateTitle}
								onCheckedChange={(checked) => {
									setIsAutogenerateTitle(
										checked === "indeterminate" ? false : checked,
									);

									if (checked) {
										setManualTitle("");
									}
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										setIsAutogenerateTitle((prev) => !prev);
										e.preventDefault();
										e.stopPropagation();
									}
								}}
							/>

							<p className="text-sm leading-none font-medium">
								Auto generate my learning title.
							</p>
						</Label>

						{!isAutogenerateTitle && (
							<Input
								placeholder="Enter a title for the learning"
								className="rounded-tlarge px-2.5"
								value={manualTitle}
								onChange={(e) => setManualTitle(e.target.value)}
							/>
						)}
					</div>

					<Alert>
						<SharedIcon icon={FolderAddIcon} />
						<AlertTitle>Almost there!</AlertTitle>
						<AlertDescription>
							<p>
								After creating the learning, you will be assisted to generate
								your course content. You also can manually provide specific
								knowledge base to be added to the learning, later on.
							</p>
						</AlertDescription>
					</Alert>

					<DialogFooter>
						<Button
							className="rounded-tlarge"
							disabled={!isAutogenerateTitle && !manualTitle}
							onClick={() => {
								if (!userId) return;
								createLearningPanel.mutate(
									{
										userId,
										title: isAutogenerateTitle ? undefined : manualTitle,
										type: "plan",
									},
									{
										onSuccess: (data) => {
											setOpenDialog(false);
											upsertCanvas({
												type: CanvasType.LEARNING_CREATION,
												data: {
													title: isAutogenerateTitle ? undefined : manualTitle,
													roomId: data?.uuid,
													threadId: data?.threadId,
												},
											});
											navigate({
												to: "/l/{-$learningId}",
												params: { learningId: data.uuid },
											});

											setSidebarOpen(false);
											setSidebarOpenMobile(false);
										},
									},
								);
							}}
						>
							I'm ready!
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SidebarMenuItem>
	);
};

const NavLearningItem = ({
	learning,
}: {
	learning: (typeof api.learning.queries.getLearnings._returnType)["page"][number];
}) => {
	const navigate = useNavigate();
	const roomId = useGetRoomId();

	const [collapsibleOpen, setCollapsibleOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const { userId } = useAuth();

	const { results: learningChatsContent } = useConvexPaginatedQuery(
		api.learning.queries.getLearningChatsContentByLearningId,
		learning?._id
			? {
					userId,
					learningId: learning?._id,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	const updateLearningTitle = useMutation({
		mutationFn: useConvexMutation(api.learning.mutations.updateLearningTitle),
	});

	const archiveLearning = useMutation({
		mutationFn: useConvexMutation(api.learning.mutations.archiveLearning),
	});

	const deleteLearning = useMutation({
		mutationFn: useConvexMutation(api.learning.mutations.deleteLearning),
	});

	const { editableRef, isEditing, startEditing, handleKeyDown, handleBlur } =
		useEditableTitle({
			onSave: (newTitle) => {
				if (!learning?._id) return;
				updateLearningTitle.mutate({
					learningId: learning._id,
					title: newTitle,
				});
			},
			onStartEdit: () => {
				// Close dropdown when starting to edit
				setDropdownOpen(false);
			},
		});

	return (
		<Collapsible
			asChild
			onOpenChange={setCollapsibleOpen}
			open={collapsibleOpen}
			className="group/collapsible"
		>
			<SidebarMenuItem>
				<div className="flex-1 justify-between flex flex-row items-center gap-1">
					<SidebarMenuButton
						tooltip={learning?.title ?? "Learning"}
						className="rounded-tlarge relative cursor-pointer py-0"
						asChild
					>
						<Link
							to={"/l/{-$learningId}"}
							params={{ learningId: learning?.uuid ?? "" }}
							className="flex-1"
							activeProps={{ className: "bg-sidebar-accent" }}
						>
							<Button
								variant="ghost"
								className="p-0 absolute left-0.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent hover:bg-secondary-foreground/20 size-7 flex items-center justify-center rounded-tlarge"
								onClick={(e) => {
									setCollapsibleOpen((prev) => !prev);
									e.stopPropagation();
									e.preventDefault();
								}}
							>
								{collapsibleOpen ? (
									<SharedIcon icon={FolderOpenIcon} />
								) : (
									<SharedIcon icon={Folder01Icon} />
								)}
							</Button>

							<span
								ref={editableRef}
								onKeyDown={handleKeyDown}
								onBlur={handleBlur}
								className={cn("pl-7", isEditing ? "outline-none" : "")}
							>
								{learning?.title ?? "Learning"}
							</span>
						</Link>
					</SidebarMenuButton>
				</div>

				<CollapsibleContent>
					<SidebarMenuSub className="mr-0 pr-0">
						{/* LEARNING CHATS */}
						{learningChatsContent?.map((learningChat) => (
							<SidebarMenuSubItem key={learningChat?._id}>
								<SidebarMenuSubButton
									className="cursor-pointer rounded-tlarge overflow-hidden"
									asChild
								>
									<Link
										to={"/l/{-$learningId}/c/{-$chatId}"}
										params={{
											learningId: learningChat?.learningData?.uuid,
											chatId: learningChat?.chatData?.uuid,
										}}
										activeProps={{ className: "bg-sidebar-accent" }}
									>
										<span>{learningChat?.metadata?.title}</span>
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>

				<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
					<DropdownMenuTrigger asChild>
						<SidebarMenuAction showOnHover>
							<SharedIcon icon={MoreHorizontalIcon} />
						</SidebarMenuAction>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="right"
						align="start"
						className="rounded-tmedium"
					>
						<DropdownMenuItem
							className="p-2.5 rounded-xl"
							onClick={startEditing}
						>
							<SharedIcon icon={Edit03Icon} />
							<span>Rename</span>
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							className="p-2.5 rounded-xl"
							onClick={() => {
								if (!learning?._id || !userId) return;
								archiveLearning.mutate(
									{
										learningId: learning?._id,
										userId,
									},
									{
										onSuccess: () => {
											if (roomId === learning?.uuid) {
												navigate({
													to: "/",
												})
													.then(() => {
														toast.success("Learning archived successfully");
													})
													.catch(() => {
														toast.error("Failed to archive learning");
													});
												return;
											}

											toast.success("Learning archived successfully");
										},
									},
								);
							}}
						>
							<SharedIcon icon={Archive03Icon} />
							<span>Archive</span>
						</DropdownMenuItem>

						<DropdownMenuItem
							className="text-destructive! p-2.5 rounded-xl"
							onClick={() => {
								if (!learning?._id || !userId) return;
								deleteLearning.mutate(
									{ learningId: learning?._id, userId },
									{
										onSuccess: () => {
											if (roomId === learning?.uuid) {
												navigate({
													to: "/",
												})
													.then(() => {
														toast.success("Learning deleted successfully");
													})
													.catch(() => {
														toast.error("Failed to delete learning");
													});
												return;
											}

											toast.success("Learning deleted successfully");
										},
									},
								);
							}}
						>
							<SharedIcon icon={Delete02Icon} className="text-destructive" />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</Collapsible>
	);
};

export function NavLearning() {
	const { userId } = useAuth();
	const { state } = useSidebar();

	const { results: learnings, status } = useConvexPaginatedQuery(
		api.learning.queries.getLearnings,
		{
			userId,
		},
		{ initialNumItems: 20 },
	);

	function NavLearningItemSkeleton({ length = 10 }: { length?: number }) {
		return createArrayMock(length).map((index) => (
			<div key={index} className="h-8 px-1.5 w-full gap-2 flex items-center">
				<Skeleton className="min-h-5 min-w-5 max-h-5 max-w-5 rounded-sm" />
				<Skeleton className="h-5 w-full rounded-sm" />
			</div>
		));
	}

	function NavLearningSkeleton({ length = 10 }: { length?: number }) {
		return (
			<div className="flex flex-col gap-1 p-2">
				<div className="h-8 px-2 w-full flex items-center gap-1">
					<Skeleton className="h-5 w-[60px] rounded-sm" />
					<Skeleton className="min-h-5 min-w-5 max-h-5 max-w-5 aspect-square shrink-0 rounded-sm" />
				</div>
				<NavLearningItemSkeleton length={length} />
			</div>
		);
	}

	if (status === "LoadingFirstPage" && state === "expanded") {
		return <NavLearningSkeleton length={20} />;
	}

	return (
		<>
			<Authenticated>
				<Collapsible defaultOpen className="group/collapsible">
					<SidebarGroup className="group-data-[collapsible=icon]:opacity-0">
						<SidebarGroupLabel asChild>
							<CollapsibleTrigger className="gap-1 cursor-pointer">
								Learnings
								<SharedIcon
									icon={ArrowRight01Icon}
									className="transition-transform group-data-[state=open]/collapsible:rotate-90"
								/>
							</CollapsibleTrigger>
						</SidebarGroupLabel>
						<CollapsibleContent>
							<SidebarGroupContent>
								<SidebarMenu>
									<NavNewLearningItem />
									{learnings?.map((learning) => (
										<NavLearningItem
											key={learning?._id ?? ""}
											learning={learning}
										/>
									))}
									{status === "LoadingMore" && (
										<NavLearningItemSkeleton length={20} />
									)}
								</SidebarMenu>
							</SidebarGroupContent>
						</CollapsibleContent>
					</SidebarGroup>
				</Collapsible>
			</Authenticated>
			<AuthLoading>
				{state === "expanded" && <NavLearningSkeleton length={20} />}
			</AuthLoading>
		</>
	);
}
