import { useResourceModalStore } from "@/zustand/resource-modal";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import {
	File02Icon,
	Link01Icon,
	Loading03Icon,
	Settings05Icon,
	StopIcon,
} from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { lazy, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useAuth } from "../provider/auth-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import SharedIcon from "./shared-icon";

const AiResourceModal = lazy(() => import("./ai-resource-modal"));

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
});

export const AiLearningPreferenceInput = ({
	threadId,
	isInputStatusLoading,
}: { threadId: string; isInputStatusLoading: boolean }) => {
	const [isOpen, setIsOpen] = useState(false);

	const { userId } = useAuth();

	const openResourceModal = useResourceModalStore(
		(state) => state.openResourceModal,
	);

	// Query for existing plan to enable resource management
	const { data: plan } = useQuery(
		convexQuery(
			api.plan.queries.getLastPlanByThreadId,
			threadId && userId
				? {
						threadId,
						userId,
					}
				: "skip",
		),
	);

	const sendLearningPreference = useMutation({
		mutationKey: ["sendLearningPreference", threadId],
		mutationFn: useConvexMutation(api.chat.mutations.sendLearningPreference),
	});

	const form = useForm({
		defaultValues: {
			topic: "",
			userLevel: "beginner",
			goal: "",
			courseType: "crash_course",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (!userId) return;

			sendLearningPreference.mutate(
				{
					threadId,
					userId,
					payload: {
						topic: value.topic,
						userLevel: value.userLevel,
						goal: value.goal,
						duration: value.courseType,
					},
				},
				{
					onSuccess: () => {
						toast("You successfully submitted your learning preferences!", {
							position: "top-center",
						});
						setIsOpen(false);
						form.reset();
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
				<DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:max-w-2xl rounded-tlarge">
					<DialogHeader className="p-6 pb-4 border-b border-border">
						<DialogTitle>Create new course</DialogTitle>
					</DialogHeader>

					<form
						id="learning-preference-form"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="flex-1 overflow-y-auto p-6 pt-2 space-y-4"
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

						{/* Manage Resources Section */}
						<FieldGroup>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">
												Learning Resources
											</span>
											<Badge
												variant="secondary"
												className="text-[10px] px-1.5 py-0"
											>
												Optional
											</Badge>
											<Badge
												variant="default"
												className="text-[10px] px-1.5 py-0"
											>
												Recommended
											</Badge>
										</div>
										<p className="text-xs text-muted-foreground">
											Add resources to make your learning course more accurate
											and personalized.
										</p>
									</div>
								</div>

								<div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
									<p className="text-sm text-muted-foreground">
										We recommend adding resources if you have them. You can
										always edit these anytime after creating the course.
									</p>

									<div className="flex flex-wrap gap-2">
										<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded-md px-2 py-1 border">
											<SharedIcon icon={File02Icon} className="size-3.5" />
											<span>PDF Documents</span>
										</div>
										<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded-md px-2 py-1 border">
											<SharedIcon icon={Link01Icon} className="size-3.5" />
											<span>URLs</span>
										</div>
										<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded-md px-2 py-1 border">
											<SharedIcon icon={Link01Icon} className="size-3.5" />
											<span>Mapped URLs</span>
										</div>
									</div>

									<div className="pt-2 border-t border-border/50">
										<Button
											type="button"
											variant="outline"
											className="w-full rounded-tlarge text-secondary-foreground"
											disabled={!plan?._id}
											onClick={() => {
												if (plan?._id && threadId) {
													openResourceModal(plan._id, threadId);
												}
											}}
										>
											{plan?._id
												? "Manage sources"
												: "Complete setup first to add sources"}
										</Button>
									</div>
								</div>
							</div>
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
													onValueChange={(value) => field.handleChange(value)}
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
														onChange={(e) => field.handleChange(e.target.value)}
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
											<FieldLabel htmlFor={field.name}>Your goal</FieldLabel>
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
													onValueChange={(value) => field.handleChange(value)}
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
														onChange={(e) => field.handleChange(e.target.value)}
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
					</form>

					<DialogFooter className="p-6 pt-2 border-t border-border">
						<div className="flex w-full justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset()}
								disabled={sendLearningPreference.isPending}
							>
								Reset
							</Button>
							<Button
								type="submit"
								disabled={sendLearningPreference.isPending}
								form="learning-preference-form"
							>
								{sendLearningPreference.isPending ? (
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

			<AiResourceModal />
		</>
	);
};
