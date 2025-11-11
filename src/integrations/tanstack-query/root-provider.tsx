import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

export function getContext() {
	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
	if (!CONVEX_URL) {
		throw new Error("missing VITE_CONVEX_URL envar");
	}
	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
	});
	const convexQueryClient = new ConvexQueryClient(convex);

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
				gcTime: 60 * 60 * 1000,
			},
		},
	});
	convexQueryClient.connect(queryClient);

	return {
		queryClient,
		convexClient: convex,
		convexQueryClient,
	};
}

const asyncStoragePersister = createAsyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : null,
})

export function Provider({
	children,
	queryClient,
}: {
	children: React.ReactNode;
	queryClient: QueryClient;
}) {
	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
			{children}
		</PersistQueryClientProvider>
	);
}
