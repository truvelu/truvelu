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
	UndoIcon,
	Upload04Icon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation as useConvexDirectMutation } from "convex/react";
import type { PublishedStatus } from "convex/schema";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../provider/auth-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
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
	_id: Id<"urlToMap">;
	url?: string;
	search?: string;
	limit?: number;
	ignoreSitemap?: boolean;
	includeSubdomains?: boolean;
	publishedStatus?: PublishedStatus;
	pendingDelete?: boolean;
	replacesId?: Id<"urlToMap">;
};

type FileItemData = {
	_id: Id<"files">;
	fileName: string;
	fileSize: number;
	url: string | null;
	publishedStatus?: PublishedStatus;
	pendingDelete?: boolean;
	replacesId?: Id<"files">;
};

type UrlItemData = {
	_id: Id<"webSearch">;
	url?: string;
	publishedStatus?: PublishedStatus;
	pendingDelete?: boolean;
	replacesId?: Id<"webSearch">;
};

// Helper to determine item status for styling
type ItemStatus = "published" | "draft" | "modified" | "pending-delete";

const getItemStatus = (item: {
	publishedStatus?: PublishedStatus;
	pendingDelete?: boolean;
	replacesId?: string;
}): ItemStatus => {
	if (item.pendingDelete) return "pending-delete";
	if (item.replacesId) return "modified";
	if (item.publishedStatus?.type === "published") return "published";
	return "draft";
};

// Status indicator styles (background-based, supports light/dark mode)
const statusStyles: Record<ItemStatus, string> = {
	published: "bg-background",
	draft: "bg-amber-100 dark:bg-amber-950/40",
	modified: "bg-blue-100 dark:bg-blue-950/40",
	"pending-delete": "bg-red-100 dark:bg-red-950/40",
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

	const { data: existingFiles, isLoading } = useQuery(
		convexQuery(api.files.queries.getByPlanId, { planId, userId }),
	);

	const generateUploadUrl = useConvexDirectMutation(
		api.files.mutations.generateUploadUrl,
	);

	const saveFile = useMutation({
		mutationKey: ["saveFile", planId],
		mutationFn: useConvexMutation(api.files.mutations.saveForPlan),
	});

	const markForDeletion = useMutation({
		mutationKey: ["markFileForDeletion", planId],
		mutationFn: useConvexMutation(api.files.mutations.markForDeletion),
	});

	const cancelDeletion = useMutation({
		mutationKey: ["cancelFileDeletion", planId],
		mutationFn: useConvexMutation(api.files.mutations.cancelDeletion),
	});

	const deleteDraft = useMutation({
		mutationKey: ["deleteFileDraft", planId],
		mutationFn: useConvexMutation(api.files.mutations.deleteDraft),
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

				await saveFile.mutateAsync({
					planId,
					userId,
					storageId,
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type,
				});
			}
			toast.success("Files uploaded (draft)", { position: "top-center" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to upload files",
				{ position: "top-center" },
			);
		} finally {
			setIsUploading(false);
		}
	};

	const handleDeleteFile = async (file: FileItemData) => {
		try {
			// If draft, delete immediately. If published, mark for deletion.
			if (file.publishedStatus?.type === "published") {
				await markForDeletion.mutateAsync({ fileId: file._id, userId });
				toast.success("File marked for deletion", { position: "top-center" });
			} else {
				await deleteDraft.mutateAsync({ fileId: file._id, userId });
				toast.success("File deleted", { position: "top-center" });
			}
		} catch (error) {
			toast.error("Failed to delete file", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to delete file",
			});
		}
	};

	const handleCancelDeletion = async (fileId: Id<"files">) => {
		try {
			await cancelDeletion.mutateAsync({ fileId, userId });
			toast.success("Deletion cancelled", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to cancel deletion", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to cancel deletion",
			});
		}
	};

	// Separate files by status
	const { publishedFiles, draftFiles } = useMemo(() => {
		if (!existingFiles) return { publishedFiles: [], draftFiles: [] };

		const published: typeof existingFiles = [];
		const draft: typeof existingFiles = [];

		for (const file of existingFiles) {
			// Skip files that have a draft replacement (they'll be hidden)
			const hasDraftReplacement = existingFiles.some(
				(f) => f.replacesId === file._id,
			);
			if (hasDraftReplacement) continue;

			if (
				file.publishedStatus?.type === "published" &&
				!file.pendingDelete &&
				!file.replacesId
			) {
				published.push(file);
			} else {
				draft.push(file);
			}
		}

		return { publishedFiles: published, draftFiles: draft };
	}, [existingFiles]);

	const renderFileItem = (file: FileItemData) => {
		const status = getItemStatus(file);
		const isPendingDelete = status === "pending-delete";

		return (
			<div
				key={file._id}
				className={`flex items-center justify-between gap-2 p-2 rounded-md border bg-card ${statusStyles[status]}`}
			>
				<div className="flex items-center gap-2 overflow-hidden">
					<SharedIcon
						icon={File02Icon}
						className={`size-4.5 shrink-0 ${isPendingDelete ? "text-destructive" : "text-muted-foreground"}`}
					/>
					<span
						className={`text-sm truncate ${isPendingDelete ? "line-through text-muted-foreground" : ""}`}
					>
						{file.fileName}
					</span>
					<span className="text-xs text-muted-foreground shrink-0">
						{(file.fileSize / 1024 / 1024).toFixed(2)} MB
					</span>
					{status === "draft" && (
						<Badge
							variant="outline"
							className="text-xs h-5 bg-amber-500/10 text-amber-600 border-amber-500/30"
						>
							Draft
						</Badge>
					)}
					{status === "modified" && (
						<Badge
							variant="outline"
							className="text-xs h-5 bg-blue-500/10 text-blue-600 border-blue-500/30"
						>
							Modified
						</Badge>
					)}
				</div>
				{isPendingDelete ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs"
						disabled={cancelDeletion.isPending}
						onClick={() => handleCancelDeletion(file._id)}
					>
						<SharedIcon icon={UndoIcon} className="size-3.5 mr-1" />
						Undo
					</Button>
				) : (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="size-6 p-0! hover:text-destructive"
						disabled={markForDeletion.isPending || deleteDraft.isPending}
						onClick={() => handleDeleteFile(file)}
					>
						<SharedIcon icon={Delete01Icon} className="size-4.5" />
					</Button>
				)}
			</div>
		);
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
			) : (
				<>
					{publishedFiles.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Published Files
							</p>
							{publishedFiles.map(renderFileItem)}
						</div>
					)}
					{draftFiles.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Draft Files
							</p>
							{draftFiles.map(renderFileItem)}
						</div>
					)}
				</>
			)}
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
	const [editingUrlId, setEditingUrlId] = useState<Id<"webSearch"> | null>(
		null,
	);
	const [editingUrlValue, setEditingUrlValue] = useState("");

	const { data: existingUrls, isLoading } = useQuery(
		convexQuery(api.webSearch.queries.getByPlanId, { planId, userId }),
	);

	const upsertWebSearch = useMutation({
		mutationKey: ["upsertWebSearch", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.upsertForPlan),
	});

	const markForDeletion = useMutation({
		mutationKey: ["markWebSearchForDeletion", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.markForDeletion),
	});

	const cancelDeletion = useMutation({
		mutationKey: ["cancelWebSearchDeletion", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.cancelDeletion),
	});

	const createModifiedCopy = useMutation({
		mutationKey: ["createWebSearchModifiedCopy", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.createModifiedCopy),
	});

	const cancelModification = useMutation({
		mutationKey: ["cancelWebSearchModification", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.cancelModification),
	});

	const deleteDraft = useMutation({
		mutationKey: ["deleteWebSearchDraft", planId],
		mutationFn: useConvexMutation(api.webSearch.mutations.deleteDraft),
	});

	const handleSaveUrls = async () => {
		const validUrls = newUrls.filter((url) => url.trim() !== "");
		if (validUrls.length === 0) {
			toast.error("No valid URLs to save", { position: "top-center" });
			return;
		}

		try {
			await upsertWebSearch.mutateAsync({
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
			toast.success("URLs saved (draft)", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to save URLs", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to save URLs",
			});
		}
	};

	const handleDeleteUrl = async (urlItem: UrlItemData) => {
		try {
			// If draft, delete immediately. If published, mark for deletion.
			if (urlItem.publishedStatus?.type === "published") {
				await markForDeletion.mutateAsync({ webSearchId: urlItem._id, userId });
				toast.success("URL marked for deletion", { position: "top-center" });
			} else {
				await deleteDraft.mutateAsync({ webSearchId: urlItem._id, userId });
				toast.success("URL deleted", { position: "top-center" });
			}
		} catch (error) {
			toast.error("Failed to delete URL", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to delete URL",
			});
		}
	};

	const handleCancelDeletion = async (webSearchId: Id<"webSearch">) => {
		try {
			await cancelDeletion.mutateAsync({ webSearchId, userId });
			toast.success("Deletion cancelled", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to cancel deletion", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to cancel deletion",
			});
		}
	};

	const handleStartEdit = (urlId: Id<"webSearch">, currentUrl: string) => {
		setEditingUrlId(urlId);
		setEditingUrlValue(currentUrl);
	};

	const handleCancelEdit = () => {
		setEditingUrlId(null);
		setEditingUrlValue("");
	};

	const handleSaveEdit = async () => {
		if (!editingUrlId || !editingUrlValue.trim()) return;

		const newUrl = editingUrlValue.trim();
		const urlItem = existingUrls?.find((u) => u._id === editingUrlId);
		if (!urlItem) return;

		const urlChanged = newUrl !== urlItem.url;

		try {
			if (urlChanged) {
				// For published items, create a modified copy
				if (urlItem.publishedStatus?.type === "published") {
					await createModifiedCopy.mutateAsync({
						webSearchId: editingUrlId,
						userId,
						newUrl,
					});
				} else {
					// For draft items, just update directly via upsert
					await upsertWebSearch.mutateAsync({
						planId,
						userId,
						data: [{ url: newUrl }],
					});
				}
			}
			handleCancelEdit();
			toast.success(urlChanged ? "URL updated (draft)" : "No changes made", {
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

	const handleCancelModification = async (webSearchId: Id<"webSearch">) => {
		try {
			await cancelModification.mutateAsync({ webSearchId, userId });
			toast.success("Modification cancelled", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to cancel modification", {
				position: "top-center",
				description:
					error instanceof Error
						? error.message
						: "Failed to cancel modification",
			});
		}
	};

	// Separate URLs by status
	const { publishedUrls, draftUrls } = useMemo(() => {
		if (!existingUrls) return { publishedUrls: [], draftUrls: [] };

		const published: typeof existingUrls = [];
		const draft: typeof existingUrls = [];

		for (const url of existingUrls) {
			// Skip items that have a draft replacement
			const hasDraftReplacement = existingUrls.some(
				(u) => u.replacesId === url._id,
			);
			if (hasDraftReplacement) continue;

			if (
				url.publishedStatus?.type === "published" &&
				!url.pendingDelete &&
				!url.replacesId
			) {
				published.push(url);
			} else {
				draft.push(url);
			}
		}

		return { publishedUrls: published, draftUrls: draft };
	}, [existingUrls]);

	const renderUrlItem = (urlItem: UrlItemData) => {
		const status = getItemStatus(urlItem);
		const isPendingDelete = status === "pending-delete";
		const isModified = status === "modified";
		const isEditing = editingUrlId === urlItem._id;

		return (
			<div
				key={urlItem._id}
				className={`flex items-center justify-between p-2 rounded-md border bg-card gap-2 ${statusStyles[status]}`}
			>
				{isEditing ? (
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
								disabled={
									upsertWebSearch.isPending || createModifiedCopy.isPending
								}
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
								className={`size-4.5 shrink-0 ${isPendingDelete ? "text-destructive" : "text-muted-foreground"}`}
							/>
							<span
								className={`text-sm truncate ${isPendingDelete ? "line-through text-muted-foreground" : ""}`}
							>
								{urlItem.url}
							</span>
							{status === "draft" && (
								<Badge
									variant="outline"
									className="text-xs h-5 bg-amber-500/10 text-amber-600 border-amber-500/30"
								>
									Draft
								</Badge>
							)}
							{isModified && (
								<Badge
									variant="outline"
									className="text-xs h-5 bg-blue-500/10 text-blue-600 border-blue-500/30"
								>
									Modified
								</Badge>
							)}
						</div>
						<div className="flex gap-1">
							{isPendingDelete ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-xs"
									disabled={cancelDeletion.isPending}
									onClick={() => handleCancelDeletion(urlItem._id)}
								>
									<SharedIcon icon={UndoIcon} className="size-3.5 mr-1" />
									Undo
								</Button>
							) : isModified ? (
								<>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-xs"
										disabled={cancelModification.isPending}
										onClick={() => handleCancelModification(urlItem._id)}
									>
										<SharedIcon icon={UndoIcon} className="size-3.5 mr-1" />
										Cancel
									</Button>
								</>
							) : (
								<>
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
										disabled={
											markForDeletion.isPending || deleteDraft.isPending
										}
										onClick={() => handleDeleteUrl(urlItem)}
									>
										<SharedIcon icon={Delete01Icon} className="size-4.5" />
									</Button>
								</>
							)}
						</div>
					</>
				)}
			</div>
		);
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
			) : (
				<>
					{publishedUrls.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Published URLs
							</p>
							{publishedUrls.map(renderUrlItem)}
						</div>
					)}
					{draftUrls.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Draft URLs
							</p>
							{draftUrls.map(renderUrlItem)}
						</div>
					)}
				</>
			)}

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
						disabled={upsertWebSearch.isPending}
						onClick={handleSaveUrls}
					>
						{upsertWebSearch.isPending ? (
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

			{newUrls.length === 0 &&
				publishedUrls.length === 0 &&
				draftUrls.length === 0 && (
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
		useState<Id<"urlToMap"> | null>(null);
	const [editingMappedUrl, setEditingMappedUrl] = useState<AdvancedUrl | null>(
		null,
	);

	const { data: existingMappedUrls, isLoading } = useQuery(
		convexQuery(api.urlToMap.queries.getUrlToMapByPlanId, { planId, userId }),
	);

	const upsertUrlToMap = useMutation({
		mutationKey: ["upsertUrlToMap", planId],
		mutationFn: useConvexMutation(
			api.urlToMap.mutations.upsertUrlToMapForPlanBatch,
		),
	});

	const markForDeletion = useMutation({
		mutationKey: ["markUrlToMapForDeletion", planId],
		mutationFn: useConvexMutation(api.urlToMap.mutations.markForDeletion),
	});

	const cancelDeletion = useMutation({
		mutationKey: ["cancelUrlToMapDeletion", planId],
		mutationFn: useConvexMutation(api.urlToMap.mutations.cancelDeletion),
	});

	const createModifiedCopy = useMutation({
		mutationKey: ["createUrlToMapModifiedCopy", planId],
		mutationFn: useConvexMutation(api.urlToMap.mutations.createModifiedCopy),
	});

	const cancelModification = useMutation({
		mutationKey: ["cancelUrlToMapModification", planId],
		mutationFn: useConvexMutation(api.urlToMap.mutations.cancelModification),
	});

	const deleteDraft = useMutation({
		mutationKey: ["deleteUrlToMapDraft", planId],
		mutationFn: useConvexMutation(api.urlToMap.mutations.deleteDraft),
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
			await upsertUrlToMap.mutateAsync({
				planId,
				userId,
				data: validUrls.map((u) => ({
					url: u.url,
					limit: u.limit,
					search: u.search,
					ignoreSitemap: u.ignoreSitemap,
					includeSubdomains: u.includeSubdomains,
				})),
			});
			setNewMappedUrls([]);
			toast.success("Mapped URLs saved (draft)", {
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

	const handleDeleteMappedUrl = async (mappedUrl: MappedUrlItemData) => {
		try {
			// If draft, delete immediately. If published, mark for deletion.
			if (mappedUrl.publishedStatus?.type === "published") {
				await markForDeletion.mutateAsync({
					urlToMapId: mappedUrl._id,
					userId,
				});
				toast.success("Mapped URL marked for deletion", {
					position: "top-center",
				});
			} else {
				await deleteDraft.mutateAsync({ urlToMapId: mappedUrl._id, userId });
				toast.success("Mapped URL deleted", { position: "top-center" });
			}
		} catch (error) {
			toast.error("Failed to delete mapped URL", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to delete",
			});
		}
	};

	const handleCancelDeletion = async (urlToMapId: Id<"urlToMap">) => {
		try {
			await cancelDeletion.mutateAsync({ urlToMapId, userId });
			toast.success("Deletion cancelled", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to cancel deletion", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to cancel deletion",
			});
		}
	};

	const handleStartEdit = (
		mappedUrlId: Id<"urlToMap">,
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

		const mappedUrlItem = existingMappedUrls?.find(
			(u) => u._id === editingMappedUrlId,
		);
		if (!mappedUrlItem) return;

		try {
			// For published items, create a modified copy
			if (mappedUrlItem.publishedStatus?.type === "published") {
				await createModifiedCopy.mutateAsync({
					urlToMapId: editingMappedUrlId,
					userId,
					url: editingMappedUrl.url.trim(),
					search: editingMappedUrl.search,
					limit: editingMappedUrl.limit,
					ignoreSitemap: editingMappedUrl.ignoreSitemap,
					includeSubdomains: editingMappedUrl.includeSubdomains,
				});
			} else {
				// For draft items, just update directly via upsert
				await upsertUrlToMap.mutateAsync({
					planId,
					userId,
					data: [
						{
							url: editingMappedUrl.url.trim(),
							search: editingMappedUrl.search,
							limit: editingMappedUrl.limit,
							ignoreSitemap: editingMappedUrl.ignoreSitemap,
							includeSubdomains: editingMappedUrl.includeSubdomains,
						},
					],
				});
			}
			handleCancelEdit();
			toast.success("Mapped URL updated (draft)", { position: "top-center" });
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

	const handleCancelModification = async (urlToMapId: Id<"urlToMap">) => {
		try {
			await cancelModification.mutateAsync({ urlToMapId, userId });
			toast.success("Modification cancelled", { position: "top-center" });
		} catch (error) {
			toast.error("Failed to cancel modification", {
				position: "top-center",
				description:
					error instanceof Error
						? error.message
						: "Failed to cancel modification",
			});
		}
	};

	// Separate mapped URLs by status
	const { publishedMappedUrls, draftMappedUrls } = useMemo(() => {
		if (!existingMappedUrls)
			return { publishedMappedUrls: [], draftMappedUrls: [] };

		const published: typeof existingMappedUrls = [];
		const draft: typeof existingMappedUrls = [];

		for (const url of existingMappedUrls) {
			// Skip items that have a draft replacement
			const hasDraftReplacement = existingMappedUrls.some(
				(u) => u.replacesId === url._id,
			);
			if (hasDraftReplacement) continue;

			if (
				url.publishedStatus?.type === "published" &&
				!url.pendingDelete &&
				!url.replacesId
			) {
				published.push(url);
			} else {
				draft.push(url);
			}
		}

		return { publishedMappedUrls: published, draftMappedUrls: draft };
	}, [existingMappedUrls]);

	const renderMappedUrlItem = (mappedUrl: MappedUrlItemData) => {
		const status = getItemStatus(mappedUrl);
		const isPendingDelete = status === "pending-delete";
		const isModified = status === "modified";
		const isEditing = editingMappedUrlId === mappedUrl._id && editingMappedUrl;

		return (
			<div
				key={mappedUrl._id}
				className={`flex items-start justify-between p-2 rounded-md border bg-card gap-2 ${statusStyles[status]}`}
			>
				{isEditing ? (
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
								disabled={
									upsertUrlToMap.isPending || createModifiedCopy.isPending
								}
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
						<div className="flex items-center gap-1">
							<MappedUrlBadges mappedUrl={mappedUrl} />
							{status === "draft" && (
								<Badge
									variant="outline"
									className="text-xs h-5 bg-amber-500/10 text-amber-600 border-amber-500/30"
								>
									Draft
								</Badge>
							)}
							{isModified && (
								<Badge
									variant="outline"
									className="text-xs h-5 bg-blue-500/10 text-blue-600 border-blue-500/30"
								>
									Modified
								</Badge>
							)}
						</div>
						<div className="flex justify-between gap-2">
							<div className="flex items-center gap-2 overflow-hidden flex-1">
								<SharedIcon
									icon={Link01Icon}
									className={`size-4.5 shrink-0 ${isPendingDelete ? "text-destructive" : "text-muted-foreground"}`}
								/>
								<span
									className={`text-sm truncate ${isPendingDelete ? "line-through text-muted-foreground" : ""}`}
								>
									{mappedUrl.url}
								</span>
							</div>
							<div className="flex gap-1">
								{isPendingDelete ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-xs"
										disabled={cancelDeletion.isPending}
										onClick={() => handleCancelDeletion(mappedUrl._id)}
									>
										<SharedIcon icon={UndoIcon} className="size-3.5 mr-1" />
										Undo
									</Button>
								) : isModified ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-xs"
										disabled={cancelModification.isPending}
										onClick={() => handleCancelModification(mappedUrl._id)}
									>
										<SharedIcon icon={UndoIcon} className="size-3.5 mr-1" />
										Cancel
									</Button>
								) : (
									<>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => handleStartEdit(mappedUrl._id, mappedUrl)}
										>
											<SharedIcon icon={Edit01Icon} className="size-4.5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0 hover:text-destructive"
											disabled={
												markForDeletion.isPending || deleteDraft.isPending
											}
											onClick={() => handleDeleteMappedUrl(mappedUrl)}
										>
											<SharedIcon icon={Delete01Icon} className="size-4.5" />
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		);
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
			) : (
				<>
					{publishedMappedUrls.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Published Mapped URLs
							</p>
							{publishedMappedUrls.map(renderMappedUrlItem)}
						</div>
					)}
					{draftMappedUrls.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground font-medium">
								Draft Mapped URLs
							</p>
							{draftMappedUrls.map(renderMappedUrlItem)}
						</div>
					)}
				</>
			)}

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
						disabled={upsertUrlToMap.isPending}
						onClick={handleSaveMappedUrls}
					>
						{upsertUrlToMap.isPending ? (
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
				publishedMappedUrls.length === 0 &&
				draftMappedUrls.length === 0 && (
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

	const { data: pendingChanges } = useQuery(
		convexQuery(
			api.resources.queries.getPendingChangesCount,
			planId && userId ? { planId, userId } : "skip",
		),
	);

	const publishAll = useMutation({
		mutationKey: ["publishAll", planId],
		mutationFn: useConvexMutation(api.resources.mutations.publishAllForPlan),
	});

	const handlePublishAll = async () => {
		if (!planId || !userId) return;

		try {
			const result = await publishAll.mutateAsync({ planId, userId });
			const totalPublished =
				result.filesPublished +
				result.urlsPublished +
				result.mappedUrlsPublished;
			const totalDeleted =
				result.filesDeleted + result.urlsDeleted + result.mappedUrlsDeleted;

			let message = "";
			if (totalPublished > 0) message += `${totalPublished} item(s) published`;
			if (totalDeleted > 0) {
				if (message) message += ", ";
				message += `${totalDeleted} item(s) deleted`;
			}

			toast.success(message || "No changes to publish", {
				position: "top-center",
			});
		} catch (error) {
			toast.error("Failed to publish changes", {
				position: "top-center",
				description:
					error instanceof Error ? error.message : "Failed to publish",
			});
		}
	};

	if (!planId || !userId) return null;

	const hasPendingChanges = pendingChanges && pendingChanges.totalPending > 0;

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

				<DialogFooter className="p-4 border-t border-border flex-row justify-between items-center gap-2">
					<div className="text-sm text-muted-foreground">
						{hasPendingChanges ? (
							<span>
								{pendingChanges.drafts > 0 && (
									<span className="text-amber-600">
										{pendingChanges.drafts} draft
										{pendingChanges.drafts > 1 ? "s" : ""}
									</span>
								)}
								{pendingChanges.modifications > 0 && (
									<>
										{pendingChanges.drafts > 0 && ", "}
										<span className="text-blue-600">
											{pendingChanges.modifications} modification
											{pendingChanges.modifications > 1 ? "s" : ""}
										</span>
									</>
								)}
								{pendingChanges.pendingDeletes > 0 && (
									<>
										{(pendingChanges.drafts > 0 ||
											pendingChanges.modifications > 0) &&
											", "}
										<span className="text-destructive">
											{pendingChanges.pendingDeletes} pending delete
											{pendingChanges.pendingDeletes > 1 ? "s" : ""}
										</span>
									</>
								)}
							</span>
						) : (
							<span>No pending changes</span>
						)}
					</div>
					<Button
						type="button"
						disabled={!hasPendingChanges || publishAll.isPending}
						onClick={handlePublishAll}
					>
						{publishAll.isPending ? (
							<>
								<SharedIcon
									icon={Loading03Icon}
									className="size-4 mr-1.5 animate-spin"
								/>
								Publishing...
							</>
						) : (
							<>
								<SharedIcon icon={Upload04Icon} className="size-4 mr-1.5" />
								Publish All
								{hasPendingChanges && (
									<Badge
										variant="secondary"
										className="ml-1.5 h-5 px-1.5 text-xs"
									>
										{pendingChanges.totalPending}
									</Badge>
								)}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default memo(AiResourceModal);
