import { useConvexMutation } from "@convex-dev/react-query";
import {
	Add01Icon,
	Delete01Icon,
	File02Icon,
	Link01Icon,
	Loading03Icon,
	Settings04Icon,
	Settings05Icon,
	StopIcon,
} from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation as useConvexDirectMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
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
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
	FieldTitle,
} from "../ui/field";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import SharedIcon from "./shared-icon";

const userLevelEnum = z.enum(["beginner", "amateur", "professional", "expert"]);
const courseTypeEnum = z.enum(["crash_course", "full_course"]);

const formSchema = z.object({
	topic: z
		.string()
		.min(1, "Topic is required.")
		.max(32, "Topic must be at most 32 characters."),
	userLevel: z.union([
		userLevelEnum,
		z.string().min(1, "Level of understanding is required."),
	]),
	goal: z.string().min(1, "Goal is required."),
	courseType: z.union([
		courseTypeEnum,
		z.string().min(1, "Type of course is required."),
	]),
	resources: z.array(z.any()),
	simpleUrls: z.array(
		z.object({
			url: z.string().url("Please enter a valid URL"),
		}),
	),
	advancedUrls: z.array(
		z.object({
			url: z.string().url("Please enter a valid URL"),
			ignoreSitemap: z.boolean().optional(),
			includeSubdomains: z.boolean().optional(),
			search: z.string().optional(),
			limit: z.number().optional(),
		}),
	),
});

// Type for uploaded file resource
type UploadedFileResource = {
	storageId: Id<"_storage">;
	fileName: string;
	fileSize: number;
	mimeType: string;
};

export const AiLearningPreferenceInput = ({
	threadId,
	isInputStatusLoading,
}: { threadId: string; isInputStatusLoading: boolean }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	const { userId } = useAuth();

	const generateUploadUrl = useConvexDirectMutation(
		api.plan.mutations.generateUploadUrl,
	);

	const sendLearningPreference = useMutation({
		mutationKey: ["sendLearningPreference", threadId],
		mutationFn: useConvexMutation(api.chat.mutations.sendLearningPreference),
	});

	// Upload a single file to Convex storage
	const uploadFile = async (file: File): Promise<UploadedFileResource> => {
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

		return {
			storageId,
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type,
		};
	};

	const form = useForm({
		defaultValues: {
			topic: "",
			userLevel: "beginner",
			goal: "",
			courseType: "crash_course",
			resources: [] as File[],
			simpleUrls: [] as { url: string }[],
			advancedUrls: [] as {
				url: string;
				ignoreSitemap?: boolean;
				includeSubdomains?: boolean;
				search?: string;
				limit?: number;
			}[],
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (!userId) return;

			const urls = [
				...value.simpleUrls
					.filter((u) => u.url.trim() !== "")
					.map((u) => ({
						url: u.url,
						search: "",
					})),
				...value.advancedUrls
					.filter((u) => u.url.trim() !== "")
					.map((u) => ({
						url: u.url,
						ignoreSitemap: u.ignoreSitemap,
						includeSubdomains: u.includeSubdomains,
						search: u.search,
						limit: u.limit,
					})),
			];

			// Upload PDF files to storage
			let fileResources: UploadedFileResource[] = [];
			if (value.resources.length > 0) {
				setIsUploading(true);
				try {
					fileResources = await Promise.all(
						value.resources.map((file) => uploadFile(file)),
					);
				} catch (error) {
					toast.error(
						error instanceof Error ? error.message : "Failed to upload files",
						{ position: "top-center" },
					);
					setIsUploading(false);
					return;
				}
				setIsUploading(false);
			}

			sendLearningPreference.mutate(
				{
					threadId,
					userId,
					payload: {
						topic: value.topic,
						userLevel: value.userLevel,
						goal: value.goal,
						duration: value.courseType,
						other: {
							urls,
							fileResources,
						},
					},
				},
				{
					onSuccess: () => {
						toast("You successfully submitted your learning preferences!", {
							position: "top-center",
						});
						setIsOpen(false);
						form.reset();
						setShowAdvancedMapping(false);
					},
				},
			);
		},
	});

	return (
		<>
			<div className="bg-background flex gap-1.5 p-2.5 rounded-tlarge border border-sidebar-border h-[102px] m-px">
				<div className="flex flex-col gap-0.5 px-2 pt-1 w-full">
					<h1 className="text-base font-medium">Settings for new course</h1>
					<p className="text-base text-muted-foreground">
						You can always edit these settings later.
					</p>
				</div>
				<div className="w-fit flex items-end">
					{isInputStatusLoading ? (
						<Button className="size-9 rounded-full cursor-pointer">
							<SharedIcon icon={StopIcon} className="animate-pulse" />
						</Button>
					) : (
						<Button
							onClick={() => setIsOpen(true)}
							className="rounded-tlarge px-2.5 gap-1 cursor-pointer animate-bounce"
						>
							<SharedIcon icon={Settings05Icon} className="size-5" />
							<span className="text-sm font-medium">Setup</span>
						</Button>
					)}
				</div>
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:max-w-2xl  rounded-tlarge">
					<DialogHeader className="p-6 pb-4 border-b border-border">
						<DialogTitle>Create new course</DialogTitle>
					</DialogHeader>

					<Tabs
						defaultValue="general"
						className="flex-1 flex flex-col overflow-hidden"
					>
						<div className="px-6 py-2 bg-muted border-b border-border">
							<TabsList className="w-full flex flex-wrap gap-1.5 p-0 bg-transparent rounded-none">
								<TabsTrigger value="general">General</TabsTrigger>
								<TabsTrigger value="resources">
									Add Resources
									<Badge variant="default">Recommended</Badge>
								</TabsTrigger>
							</TabsList>
						</div>

						<form
							id="learning-preference-form"
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="flex-1 overflow-y-auto"
						>
							<TabsContent
								value="general"
								className="h-full mt-0 p-6 pt-2 space-y-4"
							>
								<FieldGroup>
									<form.Field name="topic">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														Topic to learn
													</FieldLabel>
													<Textarea
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="Tell us about the topic you want to learn"
														autoComplete="off"
														className="min-h-[80px]"
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								</FieldGroup>

								<Separator />

								<FieldGroup>
									<form.Field name="userLevel">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											const levels = [
												"beginner",
												"amateur",
												"professional",
												"expert",
											];
											const isCustom =
												!levels.includes(field.state.value) &&
												field.state.value !== "";
											const radioValue = levels.includes(field.state.value)
												? field.state.value
												: isCustom
													? "custom"
													: "";

											return (
												<Field data-invalid={isInvalid}>
													<FieldSet className="w-full">
														<FieldLabel className="p-0! border-0!">
															Your level of understanding
														</FieldLabel>
														<RadioGroup
															value={radioValue}
															onValueChange={(value) =>
																field.handleChange(value)
															}
															className="gap-3"
														>
															{[
																{
																	value: "beginner",
																	title: "Beginner",
																	description: "I'm new to this topic",
																},
																{
																	value: "amateur",
																	title: "Amateur",
																	description: "I know the basics",
																},
																{
																	value: "professional",
																	title: "Professional",
																	description: "I use this professionally",
																},
																{
																	value: "expert",
																	title: "Expert",
																	description: "I'm an expert in this field",
																},
															].map((item) => (
																<FieldLabel
																	key={item.value}
																	htmlFor={`level-${item.value}`}
																>
																	<Field orientation="horizontal">
																		<FieldContent>
																			<FieldTitle>{item.title}</FieldTitle>
																			<FieldDescription>
																				{item.description}
																			</FieldDescription>
																		</FieldContent>
																		<RadioGroupItem
																			value={item.value}
																			id={`level-${item.value}`}
																		/>
																	</Field>
																</FieldLabel>
															))}

															<FieldLabel htmlFor="level-custom">
																<Field orientation="horizontal">
																	<FieldContent>
																		<FieldTitle>Custom</FieldTitle>
																		<FieldDescription>
																			Describe your own level
																		</FieldDescription>
																	</FieldContent>
																	<RadioGroupItem
																		value="custom"
																		id="level-custom"
																	/>
																</Field>
															</FieldLabel>
														</RadioGroup>

														{isCustom && (
															<Input
																value={
																	field.state.value === "custom"
																		? ""
																		: field.state.value
																}
																placeholder="Describe your level..."
																className="mt-2"
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
															/>
														)}
													</FieldSet>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								</FieldGroup>

								<Separator />

								<FieldGroup>
									<form.Field name="goal">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														Your goal
													</FieldLabel>
													<Textarea
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="Tell us about your goal"
														autoComplete="off"
														className="min-h-[80px]"
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								</FieldGroup>

								<Separator />

								<FieldGroup>
									<form.Field name="courseType">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											const types = ["crash_course", "full_course"];
											const isCustom =
												!types.includes(field.state.value) &&
												field.state.value !== "";
											const radioValue = types.includes(field.state.value)
												? field.state.value
												: isCustom
													? "custom"
													: "";

											return (
												<Field data-invalid={isInvalid}>
													<FieldSet className="w-full">
														<FieldLabel className="p-0! border-0!">
															Type of Course
														</FieldLabel>
														<RadioGroup
															value={radioValue}
															onValueChange={(value) =>
																field.handleChange(value)
															}
															className="gap-3"
														>
															{[
																{
																	value: "crash_course",
																	title: "Crash Course",
																	description: "Fast-paced overview",
																},
																{
																	value: "full_course",
																	title: "Full Course",
																	description: "Comprehensive deep dive",
																},
															].map((item) => (
																<FieldLabel
																	key={item.value}
																	htmlFor={`courseType-${item.value}`}
																>
																	<Field orientation="horizontal">
																		<FieldContent>
																			<FieldTitle>{item.title}</FieldTitle>
																			<FieldDescription>
																				{item.description}
																			</FieldDescription>
																		</FieldContent>
																		<RadioGroupItem
																			value={item.value}
																			id={`courseType-${item.value}`}
																		/>
																	</Field>
																</FieldLabel>
															))}

															<FieldLabel htmlFor="courseType-custom">
																<Field orientation="horizontal">
																	<FieldContent>
																		<FieldTitle>Custom</FieldTitle>
																		<FieldDescription>
																			Specify your own course type
																		</FieldDescription>
																	</FieldContent>
																	<RadioGroupItem
																		value="custom"
																		id="courseType-custom"
																	/>
																</Field>
															</FieldLabel>
														</RadioGroup>

														{isCustom && (
															<Input
																value={
																	field.state.value === "custom"
																		? ""
																		: field.state.value
																}
																placeholder="Describe your desired course type..."
																className="mt-2"
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
															/>
														)}
													</FieldSet>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								</FieldGroup>
							</TabsContent>

							<TabsContent
								value="resources"
								className="h-full mt-0 p-6 pt-2 space-y-6"
							>
								<div className="space-y-3">
									<div className="flex flex-col gap-1">
										<h3 className="text-sm font-medium">Upload Documents</h3>
										<p className="text-xs text-muted-foreground">
											Upload PDF files to help provide context for your course.
										</p>
									</div>

									<form.Field name="resources" mode="array">
										{(field) => (
											<div className="space-y-3">
												<div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center hover:bg-accent/50 transition-colors cursor-pointer relative">
													<input
														type="file"
														multiple
														accept="application/pdf"
														className="absolute inset-0 opacity-0 cursor-pointer"
														onChange={(e) => {
															if (e.target.files) {
																const newFiles = Array.from(e.target.files);
																// Filter for PDF files only
																const pdfFiles = newFiles.filter(
																	(file) => file.type === "application/pdf",
																);
																// Check file size (max 10MB)
																const validFiles = pdfFiles.filter(
																	(file) => file.size <= 10 * 1024 * 1024,
																);

																if (pdfFiles.length !== newFiles.length) {
																	toast.error("Only PDF files are allowed", {
																		position: "top-center",
																	});
																}
																if (validFiles.length !== pdfFiles.length) {
																	toast.error(
																		"Some files exceed the 10MB size limit",
																		{ position: "top-center" },
																	);
																}

																if (validFiles.length > 0) {
																	field.handleChange([
																		...(field.state.value || []),
																		...validFiles,
																	]);
																}
															}
														}}
													/>
													<div className="size-10 rounded-full bg-secondary flex items-center justify-center">
														<SharedIcon
															icon={File02Icon}
															className="size-5 text-muted-foreground"
														/>
													</div>
													<div className="space-y-0.5">
														<p className="text-sm font-medium">
															Click to upload or drag and drop
														</p>
														<p className="text-xs text-muted-foreground">
															PDF only (max 10MB per file)
														</p>
													</div>
												</div>

												{field.state.value && field.state.value.length > 0 && (
													<div className="space-y-2">
														{field.state.value.map(
															(file: File, index: number) => (
																<div
																	key={index}
																	className="flex items-center justify-between p-2 rounded-md border bg-card"
																>
																	<div className="flex items-center gap-2 overflow-hidden">
																		<SharedIcon
																			icon={File02Icon}
																			className="size-4 shrink-0 text-muted-foreground"
																		/>
																		<span className="text-sm truncate">
																			{file.name}
																		</span>
																		<span className="text-xs text-muted-foreground">
																			{(file.size / 1024 / 1024).toFixed(2)} MB
																		</span>
																	</div>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="h-6 w-6 p-0"
																		onClick={() => {
																			const newFiles = [...field.state.value];
																			newFiles.splice(index, 1);
																			field.handleChange(newFiles);
																		}}
																	>
																		<SharedIcon
																			icon={Delete01Icon}
																			className="size-3.5"
																		/>
																	</Button>
																</div>
															),
														)}
													</div>
												)}
											</div>
										)}
									</form.Field>
								</div>

								<div className="space-y-3">
									<div className="flex items-center justify-between gap-1">
										<div className="flex flex-col gap-1">
											<h3 className="text-sm font-medium">URL</h3>
											<p className="text-xs text-muted-foreground">
												Add URLs for content mapping.
											</p>
										</div>
										<form.Field name="simpleUrls" mode="array">
											{(field) => (
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="h-7 text-xs"
													onClick={() => field.pushValue({ url: "" })}
												>
													<SharedIcon
														icon={Add01Icon}
														className="size-3.5 mr-1"
													/>
													Add URL
												</Button>
											)}
										</form.Field>
									</div>

									<form.Field name="simpleUrls" mode="array">
										{(field) => (
											<div className="space-y-3">
												{field.state.value?.map((_, index) => (
													<div key={index} className="flex items-start gap-2">
														<div className="grid gap-2 flex-1">
															<form.Field name={`simpleUrls[${index}].url`}>
																{(subField) => (
																	<div className="space-y-1">
																		<div className="relative">
																			<div className="absolute left-2.5 top-2.5 text-muted-foreground">
																				<SharedIcon
																					icon={Link01Icon}
																					className="size-4"
																				/>
																			</div>
																			<Input
																				value={subField.state.value}
																				onChange={(e) =>
																					subField.handleChange(e.target.value)
																				}
																				placeholder="https://example.com"
																				className="pl-8"
																			/>
																		</div>
																		{subField.state.meta.isTouched &&
																			!subField.state.meta.isValid && (
																				<p className="text-[11px] text-destructive font-medium">
																					{subField.state.meta.errors.join(
																						", ",
																					)}
																				</p>
																			)}
																	</div>
																)}
															</form.Field>
														</div>

														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="shrink-0 text-muted-foreground hover:text-destructive"
															onClick={() => field.removeValue(index)}
														>
															<SharedIcon
																icon={Delete01Icon}
																className="size-4"
															/>
														</Button>
													</div>
												))}
												{(!field.state.value ||
													field.state.value.length === 0) && (
													<div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
														No URLs added yet.
													</div>
												)}
											</div>
										)}
									</form.Field>

									<div className="flex items-center gap-2 pt-2 border-t border-border mt-4">
										<Checkbox
											id="advanced-mapping"
											checked={showAdvancedMapping}
											onCheckedChange={(checked) =>
												setShowAdvancedMapping(!!checked)
											}
										/>
										<label
											htmlFor="advanced-mapping"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
										>
											Enable Advanced Mapping
										</label>
									</div>

									{showAdvancedMapping && (
										<div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
											<div className="flex items-center justify-between gap-1">
												<div className="flex flex-col gap-1">
													<h3 className="text-sm font-medium">Mapped URL</h3>
													<p className="text-xs text-muted-foreground">
														Add URLs with specific focused paths.
													</p>
												</div>
												<form.Field name="advancedUrls" mode="array">
													{(field) => (
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="h-7 text-xs"
															onClick={() =>
																field.pushValue({
																	url: "",
																	ignoreSitemap: false,
																	includeSubdomains: false,
																	limit: 5000,
																})
															}
														>
															<SharedIcon
																icon={Add01Icon}
																className="size-3.5 mr-1"
															/>
															Add Mapped URL
														</Button>
													)}
												</form.Field>
											</div>

											<form.Field name="advancedUrls" mode="array">
												{(field) => (
													<div className="space-y-3">
														{field.state.value?.map((_, index) => (
															<div
																key={index}
																className="flex items-start gap-2 p-3 border rounded-md bg-muted/20"
															>
																<div className="grid grid-cols-1 gap-3 flex-1">
																	<form.Field
																		name={`advancedUrls[${index}].url`}
																	>
																		{(subField) => (
																			<div className="space-y-1">
																				<div className="relative">
																					<div className="absolute left-2.5 top-2.5 text-muted-foreground">
																						<SharedIcon
																							icon={Link01Icon}
																							className="size-4"
																						/>
																					</div>
																					<Input
																						value={subField.state.value}
																						onChange={(e) =>
																							subField.handleChange(
																								e.target.value,
																							)
																						}
																						placeholder="https://example.com"
																						className="pl-8"
																					/>
																				</div>
																				{subField.state.meta.isTouched &&
																					!subField.state.meta.isValid && (
																						<p className="text-[11px] text-destructive font-medium">
																							{subField.state.meta.errors.join(
																								", ",
																							)}
																						</p>
																					)}
																			</div>
																		)}
																	</form.Field>
																</div>

																<Popover>
																	<PopoverTrigger asChild>
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon"
																			className="shrink-0 h-9 w-9"
																		>
																			<SharedIcon
																				icon={Settings04Icon}
																				className="size-4"
																			/>
																		</Button>
																	</PopoverTrigger>
																	<PopoverContent
																		className="w-80 p-4"
																		align="end"
																	>
																		<div className="space-y-4">
																			<div className="flex items-center justify-between">
																				<h4 className="font-medium leading-none">
																					Options
																				</h4>
																			</div>
																			<div className="space-y-3">
																				<form.Field
																					name={`advancedUrls[${index}].ignoreSitemap`}
																				>
																					{(subField) => (
																						<div className="flex items-center justify-between">
																							<label
																								htmlFor={`ignoreSitemap-${index}`}
																								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
																							>
																								Ignore sitemap
																							</label>
																							<Switch
																								id={`ignoreSitemap-${index}`}
																								checked={subField.state.value}
																								onCheckedChange={(checked) =>
																									subField.handleChange(checked)
																								}
																							/>
																						</div>
																					)}
																				</form.Field>

																				<form.Field
																					name={`advancedUrls[${index}].includeSubdomains`}
																				>
																					{(subField) => (
																						<div className="flex items-center justify-between">
																							<label
																								htmlFor={`includeSubdomains-${index}`}
																								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
																							>
																								Include subdomains
																							</label>
																							<Switch
																								id={`includeSubdomains-${index}`}
																								checked={subField.state.value}
																								onCheckedChange={(checked) =>
																									subField.handleChange(checked)
																								}
																							/>
																						</div>
																					)}
																				</form.Field>

																				<form.Field
																					name={`advancedUrls[${index}].search`}
																				>
																					{(subField) => (
																						<div className="grid gap-2">
																							<div className="flex items-center gap-2">
																								<SharedIcon
																									icon={Link01Icon}
																									className="size-4 text-muted-foreground"
																								/>
																								<label
																									htmlFor={`search-${index}`}
																									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
																								>
																									Search
																									<span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 uppercase">
																										Beta
																									</span>
																								</label>
																							</div>
																							<Input
																								id={`search-${index}`}
																								value={
																									subField.state.value || ""
																								}
																								onChange={(e) =>
																									subField.handleChange(
																										e.target.value,
																									)
																								}
																								placeholder="blog"
																								className="h-8"
																							/>
																						</div>
																					)}
																				</form.Field>

																				<form.Field
																					name={`advancedUrls[${index}].limit`}
																				>
																					{(subField) => (
																						<div className="grid gap-2">
																							<div className="flex items-center gap-2">
																								<SharedIcon
																									icon={Settings05Icon}
																									className="size-4 text-muted-foreground"
																								/>
																								<label
																									htmlFor={`limit-${index}`}
																									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
																								>
																									Limit
																								</label>
																							</div>
																							<Input
																								id={`limit-${index}`}
																								type="number"
																								value={
																									subField.state.value || 5000
																								}
																								onChange={(e) =>
																									subField.handleChange(
																										Number.parseInt(
																											e.target.value,
																										),
																									)
																								}
																								placeholder="5000"
																								className="h-8"
																							/>
																						</div>
																					)}
																				</form.Field>
																			</div>
																			<Button
																				variant="secondary"
																				size="sm"
																				className="w-full h-8 text-xs"
																				onClick={() => {
																					form.setFieldValue(
																						`advancedUrls[${index}].ignoreSitemap`,
																						false,
																					);
																					form.setFieldValue(
																						`advancedUrls[${index}].includeSubdomains`,
																						false,
																					);
																					form.setFieldValue(
																						`advancedUrls[${index}].search`,
																						"",
																					);
																					form.setFieldValue(
																						`advancedUrls[${index}].limit`,
																						5000,
																					);
																				}}
																			>
																				Reset settings
																			</Button>
																		</div>
																	</PopoverContent>
																</Popover>

																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9"
																	onClick={() => field.removeValue(index)}
																>
																	<SharedIcon
																		icon={Delete01Icon}
																		className="size-4"
																	/>
																</Button>
															</div>
														))}
														{(!field.state.value ||
															field.state.value.length === 0) && (
															<div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
																No mapped URLs added yet.
															</div>
														)}
													</div>
												)}
											</form.Field>
										</div>
									)}
								</div>
							</TabsContent>
						</form>
					</Tabs>

					<DialogFooter className="p-6 pt-2 border-t border-border">
						<div className="flex w-full justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset()}
								disabled={isUploading || sendLearningPreference.isPending}
							>
								Reset
							</Button>
							<Button
								type="submit"
								disabled={isUploading || sendLearningPreference.isPending}
								form="learning-preference-form"
							>
								{isUploading ? (
									<>
										<SharedIcon
											icon={Loading03Icon}
											className="size-4 mr-1.5 animate-spin"
										/>
										Uploading...
									</>
								) : sendLearningPreference.isPending ? (
									<>
										<SharedIcon
											icon={Loading03Icon}
											className="size-4 mr-1.5 animate-spin"
										/>
										Submitting...
									</>
								) : (
									"Submit"
								)}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
