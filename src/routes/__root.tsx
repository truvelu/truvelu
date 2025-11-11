import { TanstackDevtools } from "@tanstack/react-devtools";
import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

import ConvexProvider from "../integrations/convex/provider";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

import AuthModal from "@/components/shared/auth-modal";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import {
	fetchSession,
	getCookieName,
} from "@convex-dev/better-auth/react-start";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import type { ConvexReactClient } from "convex/react";
import { useEffect } from "react";
import { scan } from "react-scan";

interface MyRouterContext {
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}

// Get auth information for SSR using available cookies
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { createAuth } = await import("../../convex/auth");
	const { session } = await fetchSession(getRequest());
	const sessionCookieName = getCookieName(createAuth);
	const token = getCookie(sessionCookieName);
	return {
		userId: session?.user.id,
		token,
	};
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	beforeLoad: async (ctx) => {
		// all queries, mutations and action made with TanStack Query will be
		// authenticated by an identity token.
		const { userId, token } = await fetchAuth();
		// During SSR only (the only time serverHttpClient exists),
		// set the auth token to make HTTP queries with.
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}
		return { userId, token };
	},

	shellComponent: RootShell,

	component: RootComponent,

	errorComponent: (e) => <div>{JSON.stringify(e)}</div>,

	notFoundComponent: () => <div>Not found</div>,
});

function RootShell({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	const context = useRouteContext({ from: Route.id });

	useEffect(() => {
		// Make sure to run this only after hydration
		scan({
			enabled: true,
		});
	}, []);

	return (
		<ConvexBetterAuthProvider
			client={context.convexClient}
			authClient={authClient}
		>
			<ConvexProvider>
				<Outlet />
				<Toaster position="top-center" />
				<AuthModal />
				<TanstackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
			</ConvexProvider>
		</ConvexBetterAuthProvider>
	);
}
