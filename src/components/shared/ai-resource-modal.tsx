import { useResourceModalStore } from "@/zustand/resource-modal";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import {
	Add01Icon,
	Cancel01Icon,
	Delete01Icon,
	Edit01Icon,
	File02Icon,
	Link01Icon,
	Loading03Icon,
	Search01Icon,
	Tick01Icon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation as useConvexDirectMutation } from "convex/react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../provider/auth-provider";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import SharedIcon from "./shared-icon";

// ============================================================================
// Types
// ============================================================================

type AdvancedUrl = {
	url: string;
	ignoreSitemap?: boolean;
	includeSubdomains?: boolean;
	search?: string;
	limit?: number;
};

type MappedUrlItemData = {
	_id: Id<"mappedSearchResults">;
	url?: string;
	search?: string;
	limit?: number;
	ignoreSitemap?: boolean;
	includeSubdomains?: boolean;
};

// ============================================================================
// Shared Sub-Components
// ============================================================================

const MappedUrlForm = ({
	urlData,
	onUrlChange,
	onSearchChange,
	onIgnoreSitemapChange,
	onIncludeSubdomainsChange,
	onLimitChange,
	idPrefix,
}: {
	urlData: AdvancedUrl;
	onUrlChange: (value: string) => void;
	onSearchChange: (value: string) => void;
	onIgnoreSitemapChange: (checked: boolean) => void;
	onIncludeSubdomainsChange: (checked: boolean) => void;
	onLimitChange: (value: number | undefined) => void;
	idPrefix: string;
}) => (
	<div className="flex flex-col gap-3 flex-1">
		<div className="flex items-center gap-2 flex-col sm:flex-row">
			<div className="relative flex-1 basis-1 sm:basis-3/4">
				<div className="absolute left-2.5 top-2 text-muted-foreground">
					<SharedIcon icon={Link01Icon} className="size-4.5" />
				</div>
				<Input
					value={urlData.url}
					onChange={(e) => onUrlChange(e.target.value)}
					placeholder="https://example.com"
					className="pl-8 h-8"
					autoFocus
				/>
			</div>

			<div className="relative flex-1 w-full basis-1 sm:basis-1/4">
				<div className="absolute left-2.5 top-2 text-muted-foreground">
					<SharedIcon icon={Search01Icon} className="size-4.5" />
				</div>
				<Input
					value={urlData.search || ""}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="blog"
					className="pl-8 h-8"
				/>
			</div>
		</div>

		<div className="flex flex-wrap gap-3">
			<div className="flex items-center gap-1.5 cursor-pointer">
				<Checkbox
					id={`${idPrefix}-ignoreSitemap`}
					checked={urlData.ignoreSitemap || false}
					onCheckedChange={(checked) => onIgnoreSitemapChange(!!checked)}
					className="size-4.5"
				/>
				<label
					htmlFor={`${idPrefix}-ignoreSitemap`}
					className="text-muted-foreground cursor-pointer text-sm"
				>
					Ignore Sitemap
				</label>
			</div>

			<div className="flex items-center gap-1.5 cursor-pointer">
				<Checkbox
					id={`${idPrefix}-includeSubdomains`}
					checked={urlData.includeSubdomains || false}
					onCheckedChange={(checked) => onIncludeSubdomainsChange(!!checked)}
					className="size-4.5"
				/>
				<label
					htmlFor={`${idPrefix}-includeSubdomains`}
					className="text-muted-foreground cursor-pointer text-sm"
				>
					Include Subdomains
				</label>
			</div>

			<div className="flex items-center gap-1.5">
				<label
					htmlFor={`${idPrefix}-limit`}
					className="text-muted-foreground text-sm"
				>
					Limit:
				</label>
				<Input
					id={`${idPrefix}-limit`}
					type="number"
					value={urlData.limit || ""}
					onChange={(e) =>
						onLimitChange(Number.parseInt(e.target.value) || undefined)
					}
					className="h-6 w-16 text-xs"
					placeholder="5000"
				/>
			</div>
		</div>
	</div>
);

const MappedUrlBadges = ({ mappedUrl }: { mappedUrl: MappedUrlItemData }) => (
	<div className="flex gap-1 shrink-0">
		{mappedUrl.search && (
			<span className="text-sm bg-muted px-1 rounded">
				{`/${mappedUrl.search}`}
			</span>
		)}
		{mappedUrl.includeSubdomains && (
			<span className="text-sm bg-muted px-1 rounded">Subdomains</span>
		)}
		{mappedUrl.limit && (
			<span className="text-sm bg-muted px-1 rounded">
				Limit: {mappedUrl.limit}
			</span>
		)}
		{mappedUrl.ignoreSitemap && (
			<span className="text-sm bg-muted px-1 rounded">No Sitemap</span>
		)}
	</div>
);

// ============================================================================
// File Upload Section
// ============================================================================

const FileUploadSection = ({
	planId,
	userId,
}: {
	planId: Id<"plans">;
	userId: string;
}) => {
	const [isUploading, setIsUploading] = useState(false);

	const { data: existingResources, isLoading } = useQuery(
		convexQuery(api.plan.queries.getResources, { planId, userId }),
	);

	const generateUploadUrl = useConvexDirectMutation(
		api.plan.mutations.generateUploadUrl,
	);

	const saveResource = useMutation({
		mutationKey: ["saveResource", planId],
		mutationFn: useConvexMutation(api.plan.mutations.saveResource),
	});

	const deleteResource = useMutation({
		mutationKey: ["deleteResource", planId],
		mutationFn: useConvexMutation(api.plan.mutations.deleteResource),
	});

	const handleFileUpload = async (files: FileList) => {
		const pdfFiles = Array.from(files).filter(
			(file) => file.type === "application/pdf",
		);
		const validFiles = pdfFiles.filter((file) => file.size <= 10 * 1024 * 1024);

		if (pdfFiles.length !== files.length) {
			toast.error("Only PDF files are allowed", { position: "top-center" });
		}
		if (validFiles.length !== pdfFiles.length) {
			toast.error("Some files exceed the 10MB size limit", {
				position: "top-center",
			});
		}

		if (validFiles.length === 0) return;

		setIsUploading(true);
		try {
			for (const file of validFiles) {
				const uploadUrl = await generateUploadUrl();
				const result = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				});

				if (!result.ok) {
					throw new Error(`Failed to upload ${file.name}`);
				}

				const { storageId } = await result.json();

				await saveResource.mutateAsync({
					planId,
					userId,
					storageId,
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type,
				});
			}
			toast.success("Files uploaded successfully", { position: "top-center" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to upload files",
				{ position: "top-center" },
			);
		} finally {
			setIsUploading(false);
		}
	};

	const handleDeleteResource = async (resourceId: Id<"resources">) => {
		try {
			await deleteResource.mutateAsync({ resourceId, userId });
			toast.success("File deleted", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to delete file", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to delete file",
			});
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-1">
				<h3 className="text-sm font-medium">Upload Documents</h3>
				<p className="text-xs text-muted-foreground">
					Upload PDF files to help provide context for your course.
				</p>
			</div>

			<div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center hover:bg-accent/50 transition-colors cursor-pointer relative">
				<input
					type="file"
					multiple
					accept="application/pdf"
					className="absolute inset-0 opacity-0 cursor-pointer"
					disabled={isUploading}
					onChange={(e) => {
						if (e.target.files) {
							handleFileUpload(e.target.files);
						}
					}}
				/>
				<div className="size-10 rounded-full bg-secondary flex items-center justify-center">
					{isUploading ? (
						<SharedIcon
							icon={Loading03Icon}
							className="size-5 text-muted-foreground animate-spin"
						/>
					) : (
						<SharedIcon
							icon={File02Icon}
							className="size-5 text-muted-foreground"
						/>
					)}
				</div>
				<div className="space-y-0.5">
					<p className="text-sm font-medium">
						{isUploading ? "Uploading..." : "Click to upload or drag and drop"}
					</p>
					<p className="text-xs text-muted-foreground">
						PDF only (max 10MB per file)
					</p>
				</div>
			</div>

			{isLoading ? (
				<div className="text-center py-4 text-sm text-muted-foreground">
					Loading files...
				</div>
			) : existingResources && existingResources.length > 0 ? (
				<div className="space-y-2">
					{existingResources.map((resource) => (
						<div
							key={resource._id}
							className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card"
						>
							<div className="flex items-center gap-2 overflow-hidden">
								<SharedIcon
									icon={File02Icon}
									className="size-4.5 shrink-0 text-muted-foreground"
								/>
								<span className="text-sm truncate">{resource.fileName}</span>
								<span className="text-xs text-muted-foreground shrink-0">
									{(resource.fileSize / 1024 / 1024).toFixed(2)} MB
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="size-6 p-0! hover:text-destructive"
								disabled={deleteResource.isPending}
								onClick={() => handleDeleteResource(resource._id)}
							>
								<SharedIcon icon={Delete01Icon} className="size-4.5" />
							</Button>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
};

// ============================================================================
// Simple URLs Section
// ============================================================================

const SimpleUrlsSection = ({
	planId,
	userId,
}: {
	planId: Id<"plans">;
	userId: string;
}) => {
	const [newUrls, setNewUrls] = useState<string[]>([]);
	const [editingUrlId, setEditingUrlId] =
		useState<Id<"searchResults"> | null>(null);
	const [editingUrlValue, setEditingUrlValue] = useState("");
	const [editingUrlOriginal, setEditingUrlOriginal] = useState("");

	const { data: existingUrls, isLoading } = useQuery(
		convexQuery(api.plan.queries.getSearchResults, { planId, userId }),
	);

	const upsertSearchResults = useMutation({
		mutationKey: ["upsertSearchResults", planId],
		mutationFn: useConvexMutation(api.plan.mutations.upsertSearchResults),
	});

	const deleteSearchResult = useMutation({
		mutationKey: ["deleteSearchResult", planId],
		mutationFn: useConvexMutation(api.plan.mutations.deleteSearchResult),
	});

	const handleSaveUrls = async () => {
		const validUrls = newUrls.filter((url) => url.trim() !== "");
		if (validUrls.length === 0) {
			toast.error("No valid URLs to save", { position: "top-center" });
			return;
		}

		try {
			await upsertSearchResults.mutateAsync({
				planId,
				userId,
				data: validUrls.map((url) => ({
					url,
					query: undefined,
					title: undefined,
					image: undefined,
					content: undefined,
					publishedDate: undefined,
					score: undefined,
					other: undefined,
				})),
			});
			setNewUrls([]);
			toast.success("URLs saved successfully", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to save URLs", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to save URLs",
			});
		}
	};

	const handleDeleteUrl = async (searchResultId: Id<"searchResults">) => {
		try {
			await deleteSearchResult.mutateAsync({ searchResultId, userId });
			toast.success("URL deleted", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to delete URL", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to delete URL",
			});
		}
	};

	const handleStartEdit = (
		urlId: Id<"searchResults">,
		currentUrl: string,
	) => {
		setEditingUrlId(urlId);
		setEditingUrlValue(currentUrl);
		setEditingUrlOriginal(currentUrl);
	};

	const handleCancelEdit = () => {
		setEditingUrlId(null);
		setEditingUrlValue("");
		setEditingUrlOriginal("");
	};

	const handleSaveEdit = async () => {
		if (!editingUrlId || !editingUrlValue.trim()) return;

		const newUrl = editingUrlValue.trim();
		const urlChanged = newUrl !== editingUrlOriginal;

		try {
			if (urlChanged) {
				await deleteSearchResult.mutateAsync({
					searchResultId: editingUrlId,
					userId,
				});
				await upsertSearchResults.mutateAsync({
					planId,
					userId,
					data: [{ url: newUrl }],
				});
			}
			handleCancelEdit();
			toast.success(urlChanged ? "URL updated" : "No changes made", {
				position: "top-center",
			});
		} catch (error) {
			toast.error("Failed to update URL", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to update URL",
			});
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-1">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-medium">URL</h3>
					<p className="text-xs text-muted-foreground">
						Add URLs for content mapping.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					onClick={() => setNewUrls([...newUrls, ""])}
				>
					<SharedIcon icon={Add01Icon} className="size-4 mr-1" />
					Add URL
				</Button>
			</div>

			{isLoading ? (
				<div className="text-center py-4 text-sm text-muted-foreground">
					Loading URLs...
				</div>
			) : existingUrls && existingUrls.length > 0 ? (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground font-medium">
						Saved URLs
					</p>
					{existingUrls.map((urlItem) => (
						<div
							key={urlItem._id}
							className="flex items-center justify-between p-2 rounded-md border bg-card gap-2"
						>
							{editingUrlId === urlItem._id ? (
								<>
									<div className="flex items-center gap-2 flex-1">
										<SharedIcon
											icon={Link01Icon}
											className="size-4.5 shrink-0 text-muted-foreground"
										/>
										<Input
											value={editingUrlValue}
											onChange={(e) => setEditingUrlValue(e.target.value)}
											placeholder="https://example.com"
											className="h-7 text-sm"
											autoFocus
										/>
									</div>
									<div className="flex gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0! text-green-600 hover:text-green-700"
											disabled={upsertSearchResults.isPending}
											onClick={handleSaveEdit}
										>
											<SharedIcon icon={Tick01Icon} className="size-4.5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0!"
											onClick={handleCancelEdit}
										>
											<SharedIcon icon={Cancel01Icon} className="size-4.5" />
										</Button>
									</div>
								</>
							) : (
								<>
									<div className="flex items-center gap-2 overflow-hidden flex-1">
										<SharedIcon
											icon={Link01Icon}
											className="size-4.5 shrink-0 text-muted-foreground"
										/>
										<span className="text-sm truncate">{urlItem.url}</span>
									</div>
									<div className="flex gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0!"
											onClick={() =>
												handleStartEdit(urlItem._id, urlItem.url || "")
											}
										>
											<SharedIcon icon={Edit01Icon} className="size-4.5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0! hover:text-destructive"
											disabled={deleteSearchResult.isPending}
											onClick={() => handleDeleteUrl(urlItem._id)}
										>
											<SharedIcon icon={Delete01Icon} className="size-4.5" />
										</Button>
									</div>
								</>
							)}
						</div>
					))}
				</div>
			) : null}

			{newUrls.length > 0 && (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground font-medium">New URLs</p>
					{newUrls.map((url, index) => (
						<div key={index} className="flex items-start gap-2">
							<div className="grid gap-2 flex-1">
								<div className="relative">
									<div className="absolute left-2.5 top-2.5 text-muted-foreground">
										<SharedIcon icon={Link01Icon} className="size-4.5" />
									</div>
									<Input
										value={url}
										onChange={(e) => {
											const updated = [...newUrls];
											updated[index] = e.target.value;
											setNewUrls(updated);
										}}
										placeholder="https://example.com"
										className="pl-8"
									/>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => {
									const updated = [...newUrls];
									updated.splice(index, 1);
									setNewUrls(updated);
								}}
							>
								<SharedIcon icon={Delete01Icon} className="size-4.5" />
							</Button>
						</div>
					))}
					<Button
						type="button"
						size="sm"
						className="w-full"
						disabled={upsertSearchResults.isPending}
						onClick={handleSaveUrls}
					>
						{upsertSearchResults.isPending ? (
							<>
								<SharedIcon
									icon={Loading03Icon}
									className="size-4 mr-1.5 animate-spin"
								/>
								Saving...
							</>
						) : (
							"Save URLs"
						)}
					</Button>
				</div>
			)}

			{newUrls.length === 0 && (!existingUrls || existingUrls.length === 0) && (
				<div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
					No URLs added yet.
				</div>
			)}
		</div>
	);
};

// ============================================================================
// Mapped URLs Section
// ============================================================================

const MappedUrlsSection = ({
	planId,
	userId,
}: {
	planId: Id<"plans">;
	userId: string;
}) => {
	const [newMappedUrls, setNewMappedUrls] = useState<AdvancedUrl[]>([]);
	const [editingMappedUrlId, setEditingMappedUrlId] =
		useState<Id<"mappedSearchResults"> | null>(null);
	const [editingMappedUrl, setEditingMappedUrl] = useState<AdvancedUrl | null>(
		null,
	);

	const { data: existingMappedUrls, isLoading } = useQuery(
		convexQuery(
			api.mappedSearchResults.queries.getMappedSearchResultsByPlanId,
			{ planId, userId },
		),
	);

	const upsertMappedSearchResults = useMutation({
		mutationKey: ["upsertMappedSearchResults", planId],
		mutationFn: useConvexMutation(
			api.mappedSearchResults.mutations.upsertMappedSearchResultsForPlan,
		),
	});

	const deleteMappedSearchResult = useMutation({
		mutationKey: ["deleteMappedSearchResult", planId],
		mutationFn: useConvexMutation(
			api.mappedSearchResults.mutations.deleteMappedSearchResult,
		),
	});

	const handleAddMappedUrl = () => {
		setNewMappedUrls([
			...newMappedUrls,
			{
				url: "",
				ignoreSitemap: false,
				includeSubdomains: false,
				limit: 5000,
			},
		]);
	};

	const handleUpdateNewMappedUrl = (
		index: number,
		data: Partial<AdvancedUrl>,
	) => {
		const updated = [...newMappedUrls];
		updated[index] = { ...updated[index], ...data };
		setNewMappedUrls(updated);
	};

	const handleRemoveNewMappedUrl = (index: number) => {
		const updated = [...newMappedUrls];
		updated.splice(index, 1);
		setNewMappedUrls(updated);
	};

	const handleSaveMappedUrls = async () => {
		const validUrls = newMappedUrls.filter((u) => u.url.trim() !== "");
		if (validUrls.length === 0) {
			toast.error("No valid mapped URLs to save", { position: "top-center" });
			return;
		}

		try {
			await upsertMappedSearchResults.mutateAsync({
				planId,
				userId,
				data: validUrls.map((u) => ({
					url: u.url,
					limit: u.limit,
					ignoreSitemap: u.ignoreSitemap,
					includeSubdomains: u.includeSubdomains,
				})),
			});
			setNewMappedUrls([]);
			toast.success("Mapped URLs saved successfully", {
				position: "top-center",
			});
		} catch (error) {
			toast.error("Failed to save mapped URLs", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to save mapped URLs",
			});
		}
	};

	const handleDeleteMappedUrl = async (
		mappedSearchResultId: Id<"mappedSearchResults">,
	) => {
		try {
			await deleteMappedSearchResult.mutateAsync({
				mappedSearchResultId,
				userId,
			});
			toast.success("Mapped URL deleted", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to delete mapped URL", {
				position: "top-center",
				description:
					error instanceof Error
						? error.message
						: "Failed to delete mapped URL",
			});
		}
	};

	const handleStartEdit = (
		mappedUrlId: Id<"mappedSearchResults">,
		mappedUrl: MappedUrlItemData,
	) => {
		setEditingMappedUrlId(mappedUrlId);
		setEditingMappedUrl({
			url: mappedUrl.url || "",
			limit: mappedUrl.limit,
			ignoreSitemap: mappedUrl.ignoreSitemap,
			includeSubdomains: mappedUrl.includeSubdomains,
			search: mappedUrl.search,
		});
	};

	const handleCancelEdit = () => {
		setEditingMappedUrlId(null);
		setEditingMappedUrl(null);
	};

	const handleSaveEdit = async () => {
		if (!editingMappedUrlId || !editingMappedUrl?.url.trim()) return;

		const newUrl = editingMappedUrl.url.trim();

		try {
			await deleteMappedSearchResult.mutateAsync({
				mappedSearchResultId: editingMappedUrlId,
				userId,
			});
			await upsertMappedSearchResults.mutateAsync({
				planId,
				userId,
				data: [
					{
						url: newUrl,
						search: editingMappedUrl.search,
						limit: editingMappedUrl.limit,
						ignoreSitemap: editingMappedUrl.ignoreSitemap,
						includeSubdomains: editingMappedUrl.includeSubdomains,
					},
				],
			});
			handleCancelEdit();
			toast.success("Mapped URL updated", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to update mapped URL", {
				position: "top-center",
				description:
					error instanceof Error
						? error.message
						: "Failed to update mapped URL",
			});
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-1">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-medium">Mapped URL</h3>
					<p className="text-xs text-muted-foreground">
						Add URLs with specific focused paths.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					onClick={handleAddMappedUrl}
				>
					<SharedIcon icon={Add01Icon} className="size-3.5 mr-1" />
					Add Mapped URL
				</Button>
			</div>

			{isLoading ? (
				<div className="text-center py-4 text-sm text-muted-foreground">
					Loading mapped URLs...
				</div>
			) : existingMappedUrls && existingMappedUrls.length > 0 ? (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground font-medium">
						Saved Mapped URLs
					</p>
					{existingMappedUrls.map((mappedUrl) => (
						<div
							key={mappedUrl._id}
							className="flex items-start justify-between p-2 rounded-md border bg-card gap-2"
						>
							{editingMappedUrlId === mappedUrl._id && editingMappedUrl ? (
								<>
									<MappedUrlForm
										urlData={editingMappedUrl}
										onUrlChange={(value) =>
											setEditingMappedUrl((prev) =>
												prev ? { ...prev, url: value } : null,
											)
										}
										onSearchChange={(value) =>
											setEditingMappedUrl((prev) =>
												prev ? { ...prev, search: value } : null,
											)
										}
										onIgnoreSitemapChange={(checked) =>
											setEditingMappedUrl((prev) =>
												prev ? { ...prev, ignoreSitemap: checked } : null,
											)
										}
										onIncludeSubdomainsChange={(checked) =>
											setEditingMappedUrl((prev) =>
												prev ? { ...prev, includeSubdomains: checked } : null,
											)
										}
										onLimitChange={(value) =>
											setEditingMappedUrl((prev) =>
												prev ? { ...prev, limit: value } : null,
											)
										}
										idPrefix={`edit-${mappedUrl._id}`}
									/>
									<div className="flex gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0 text-green-600 hover:text-green-700"
											disabled={upsertMappedSearchResults.isPending}
											onClick={handleSaveEdit}
										>
											<SharedIcon icon={Tick01Icon} className="size-4.5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="size-6 p-0"
											onClick={handleCancelEdit}
										>
											<SharedIcon icon={Cancel01Icon} className="size-4.5" />
										</Button>
									</div>
								</>
							) : (
								<div className="flex flex-col gap-2 grow">
									<MappedUrlBadges mappedUrl={mappedUrl} />
									<div className="flex justify-between gap-2">
										<div className="flex items-center gap-2 overflow-hidden flex-1">
											<SharedIcon
												icon={Link01Icon}
												className="size-4.5 shrink-0 text-muted-foreground"
											/>
											<span className="text-sm truncate">{mappedUrl.url}</span>
										</div>
										<div className="flex gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0"
												onClick={() =>
													handleStartEdit(mappedUrl._id, mappedUrl)
												}
											>
												<SharedIcon icon={Edit01Icon} className="size-4.5" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0 hover:text-destructive"
												disabled={deleteMappedSearchResult.isPending}
												onClick={() => handleDeleteMappedUrl(mappedUrl._id)}
											>
												<SharedIcon icon={Delete01Icon} className="size-4.5" />
											</Button>
										</div>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			) : null}

			{newMappedUrls.length > 0 ? (
				<div className="space-y-3">
					<p className="text-xs text-muted-foreground font-medium">
						New Mapped URLs
					</p>
					{newMappedUrls.map((urlItem, index) => (
						<div
							key={index}
							className="flex items-start justify-between p-2 rounded-md border bg-card gap-2"
						>
							<MappedUrlForm
								urlData={urlItem}
								onUrlChange={(value) =>
									handleUpdateNewMappedUrl(index, { url: value })
								}
								onSearchChange={(value) =>
									handleUpdateNewMappedUrl(index, { search: value })
								}
								onIgnoreSitemapChange={(checked) =>
									handleUpdateNewMappedUrl(index, { ignoreSitemap: checked })
								}
								onIncludeSubdomainsChange={(checked) =>
									handleUpdateNewMappedUrl(index, {
										includeSubdomains: checked,
									})
								}
								onLimitChange={(value) =>
									handleUpdateNewMappedUrl(index, { limit: value })
								}
								idPrefix={`add-${index}`}
							/>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="size-6 p-0 hover:text-destructive"
								onClick={() => handleRemoveNewMappedUrl(index)}
							>
								<SharedIcon icon={Delete01Icon} className="size-4.5" />
							</Button>
						</div>
					))}
					<Button
						type="button"
						size="sm"
						className="w-full"
						disabled={upsertMappedSearchResults.isPending}
						onClick={handleSaveMappedUrls}
					>
						{upsertMappedSearchResults.isPending ? (
							<>
								<SharedIcon
									icon={Loading03Icon}
									className="size-4 mr-1.5 animate-spin"
								/>
								Saving...
							</>
						) : (
							"Save Mapped URLs"
						)}
					</Button>
				</div>
			) : null}

			{newMappedUrls.length === 0 &&
				(!existingMappedUrls || existingMappedUrls.length === 0) && (
					<div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
						No mapped URLs added yet.
					</div>
				)}
		</div>
	);
};

// ============================================================================
// Main Component
// ============================================================================

const AiResourceModal = () => {
	const { userId } = useAuth();
	const { isOpen, planId, closeResourceModal } = useResourceModalStore(
		useShallow(({ isOpen, planId, closeResourceModal }) => ({
			isOpen,
			planId,
			closeResourceModal,
		})),
	);

	if (!planId || !userId) return null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => !open && closeResourceModal()}
		>
			<DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:max-w-2xl rounded-tlarge">
				<DialogHeader className="p-6 pb-4 border-b border-border">
					<DialogTitle>Manage Sources</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] p-4 space-y-6 pb-6">
					<FileUploadSection planId={planId} userId={userId} />
					<Separator />
					<SimpleUrlsSection planId={planId} userId={userId} />
					<Separator />
					<MappedUrlsSection planId={planId} userId={userId} />
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default memo(AiResourceModal);
