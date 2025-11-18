import { useIsMobile } from "@/hooks/use-mobile";
import { Settings05Icon } from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import type { learningPreferenceValidator } from "convex/schema";
import type { Infer } from "convex/values";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "../ui/drawer";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";
import SharedIcon from "./shared-icon";

interface AiLearningPreferenceInputProps {
	onSubmit: (
		learningPreference: Infer<typeof learningPreferenceValidator>,
		callback?: {
			onSuccess?: (data: null) => void;
			onError?: (error: Error) => void;
			onSettled?: (data: null | undefined, error: Error | null) => void;
		},
	) => void;
}

const formSchema = z.object({
	topic: z
		.string()
		.min(5, "Topic must be at least 5 characters.")
		.max(32, "Topic must be at most 32 characters."),
	userLevel: z
		.string()
		.min(5, "Level understanding must be at least 5 characters."),
	goal: z.string().min(5, "Goal must be at least 5 characters."),
	duration: z.string().min(5, "Duration must be at least 5 characters."),
});

export const AiLearningPreferenceInput = ({
	onSubmit,
}: AiLearningPreferenceInputProps) => {
	const isMobile = useIsMobile();

	const [isOpen, setIsOpen] = useState(false);

	const form = useForm({
		defaultValues: {
			topic: "",
			userLevel: "",
			goal: "",
			duration: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			onSubmit(value, {
				onSuccess: () => {
					toast("You successfully submitted your learning preferences!", {
						position: "top-center",
					});
				},
			});
		},
	});

	return (
		<>
			<div className="bg-background flex flex-col gap-1.5 p-3 rounded-tlarge border border-sidebar-border">
				<div className="flex flex-col gap-0.5">
					<h1 className="text-base font-medium">Create new course</h1>
					<p className="text-sm text-muted-foreground">
						Course will be created based on your learning preferences. You can
						always edit it later.
					</p>
				</div>
				<div className="w-full flex justify-end">
					<Button
						onClick={() => setIsOpen(true)}
						className="rounded-tlarge px-2.5 gap-1"
					>
						<SharedIcon icon={Settings05Icon} className="size-4" />
						<span className="text-sm font-medium">Setup</span>
					</Button>
				</div>
			</div>

			{isMobile ? (
				<Drawer open={isOpen} onOpenChange={setIsOpen}>
					<DrawerContent className="h-svh">
						<DrawerTitle />
						<DrawerDescription />

						<form
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit();
							}}
							className="space-y-1.5"
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
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

							<FieldGroup>
								<form.Field name="userLevel">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Your level of understanding
												</FieldLabel>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Tell us about your level of understanding"
													autoComplete="off"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

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
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

							<FieldGroup>
								<form.Field name="duration">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Duration</FieldLabel>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Tell us about the duration you want to learn"
													autoComplete="off"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>
						</form>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogContent className="rounded-tmedium h-full max-h-svh md:max-h-[90lvh]">
						<DialogHeader className="sticky top-0 bg-background">
							<DialogTitle>Create new course</DialogTitle>
							<DialogDescription>
								Course will be created based on your learning preferences. You
								can always edit it later.
							</DialogDescription>
						</DialogHeader>

						<form
							id="learning-preference-form"
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit();
							}}
							className="space-y-1.5 overflow-y-auto"
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
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

							<FieldGroup>
								<form.Field name="userLevel">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Your level of understanding
												</FieldLabel>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Tell us about your level of understanding"
													autoComplete="off"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

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
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>

							<FieldGroup>
								<form.Field name="duration">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Duration</FieldLabel>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Tell us about the duration you want to learn"
													autoComplete="off"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>
						</form>

						<DialogFooter>
							<Field orientation="horizontal">
								<Button
									type="button"
									variant="outline"
									onClick={() => form.reset()}
								>
									Reset
								</Button>
								<Button type="submit" form="learning-preference-form">
									Submit
								</Button>
							</Field>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};
