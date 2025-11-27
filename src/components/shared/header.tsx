import { useActiveCanvasId } from "@/hooks/use-canvas";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/zustand/canvas";
import { convexQuery } from "@convex-dev/react-query";
import {
	Home07Icon,
	MoreHorizontalIcon,
	Share03Icon,
	SidebarBottomIcon,
	SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useMatchRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { memo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../provider/auth-provider";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import SharedIcon from "./shared-icon";

export const HeaderBreadcrumbs = () => {
	const matchRoute = useMatchRoute();
	const { userId } = useAuth();
	const params = useParams({
		strict: false,
		structuralSharing: true,
	});

	const currentLearningContentRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningContentRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentLearningContentRoute = currentLearningContentRoute !== false;
	const isPendingLearningContentRoute = pendingLearningContentRoute !== false;
	const isLearningContentRoute =
		isCurrentLearningContentRoute || isPendingLearningContentRoute;

	const { data: learning } = useQuery(
		convexQuery(
			api.learning.queries.getLearningByRoomId,
			isLearningContentRoute && !!params?.learningId && !!userId
				? {
						userId,
						uuid: params?.learningId,
					}
				: "skip",
		),
	);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/">
							<SharedIcon icon={Home07Icon} size={5} className="size-5" />
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>

				{isLearningContentRoute && <BreadcrumbSeparator />}

				{isLearningContentRoute && (
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link
								to="/l/{-$learningId}"
								params={{ learningId: learning?.uuid }}
							>
								{learning?.title}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export const Header = () => {
	const roomId = useGetRoomId();
	const matchRoute = useMatchRoute();
	const { isMobile } = useSidebar();
	const activeCanvasId = useActiveCanvasId();

	const { toggleCanvas, setActiveCanvasId } = useCanvasStore(
		useShallow(({ toggleCanvas, setActiveCanvasId }) => ({
			toggleCanvas,
			setActiveCanvasId,
		})),
	);

	const learningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const chatRoute = matchRoute({ to: "/c/{-$chatId}" });
	const currentLearningContentRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningContentRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentLearningContentRoute = currentLearningContentRoute !== false;
	const isPendingLearningContentRoute = pendingLearningContentRoute !== false;
	const isLearningRoute = learningRoute !== false;
	const isChatRoute = chatRoute !== false;

	const isLearningContentRoute =
		isCurrentLearningContentRoute || isPendingLearningContentRoute;
	const isIndexRoute = !isLearningRoute && !isChatRoute;

	const onOpenCanvas = useCallback(() => {
		if (!roomId) return;
		if (!activeCanvasId) {
			setActiveCanvasId(roomId, "list");
		}

		toggleCanvas(roomId);
	}, [roomId, activeCanvasId, setActiveCanvasId, toggleCanvas]);

	return (
		<div
			className={cn(
				"sticky top-0 z-10 h-header bg-background flex items-center border-b border-sidebar-border p-2.5",
				isMobile || isLearningContentRoute ? "justify-between" : "justify-end",
			)}
		>
			<Authenticated>
				{isMobile && <SidebarTrigger className="p-2 cursor-pointer" />}

				{!(isMobile || !isLearningContentRoute) && <HeaderBreadcrumbs />}

				{!isIndexRoute && (
					<div className="flex gap-0.5 items-center">
						<Button
							variant="ghost"
							className="flex gap-1.5 rounded-tlarge cursor-pointer"
						>
							<SharedIcon icon={Share03Icon} size={5} className="size-5" />
							Share
						</Button>

						<Button
							variant="ghost"
							className="rounded-full has-[>svg]:p-0 size-7 cursor-pointer"
						>
							<SharedIcon icon={MoreHorizontalIcon} className="size-5" />
						</Button>

						<Separator
							orientation="vertical"
							className="min-h-7 w-px bg-sidebar-border mx-1"
						/>

						<Button
							variant="ghost"
							className="rounded-full has-[>svg]:p-0 size-7 cursor-pointer"
							onClick={onOpenCanvas}
						>
							<SharedIcon
								icon={isMobile ? SidebarBottomIcon : SidebarRightIcon}
								className="size-5"
							/>
						</Button>
					</div>
				)}
			</Authenticated>
			<Unauthenticated>
				<Button className="rounded-tlarge px-3 h-9 cursor-pointer" asChild>
					<Link to="/auth">Log in</Link>
				</Button>
			</Unauthenticated>
		</div>
	);
};

export default memo(Header);
