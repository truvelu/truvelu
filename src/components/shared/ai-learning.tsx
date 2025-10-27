import { cn } from "@/lib/utils";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

function AiLearning() {
	return (
		<div className="flex min-h-full">
			<ContainerWithMargin>
				<ContainerWithMaxWidth
					className={cn(
						"flex-1 grid h-full grid-rows-[auto_min-content_min-content]",
					)}
				>
					<div className="flex min-w-0 flex-col gap-8 pb-6 mt-13 self-start max-md:mt-0">
						<div className="flex justify-between max-md:flex-col max-md:gap-4">
							<div className="flex items-center gap-1.5 max-md:-translate-x-1">
								<SharedIcon icon={Folder01Icon} size={36} className="size-7" />
								<h1 className="text-2xl">Learning</h1>
							</div>

							<Button
								variant="outline"
								className="rounded-tlarge text-gray-500"
							>
								Add Knowledge
							</Button>
						</div>

						<section>
							<ol
								className="divide-token-bg-tertiary group divide-y"
								aria-busy="false"
							>
								{[
									{
										learningId: "123",
										chatId: "123",
										title: "E2B SaaS COGS Calculation",
										description:
											"if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
										date: "Oct 9",
									},
									{
										learningId: "123",
										chatId: "456",
										title: "E2B SaaS COGS Calculation",
										description:
											"if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
										date: "Oct 20, 2025",
									},
									{
										learningId: "123",
										chatId: "789",
										title: "E2B SaaS COGS Calculation",
										description:
											"if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
										date: "Oct 20, 2025",
									},
								]?.map((item) => (
									<li
										key={`${item.learningId}-${item.chatId}`}
										className="group/project-item hover:bg-gray-50 active:bg-gray-50 flex min-h-16 cursor-pointer items-center p-3 text-sm select-none"
									>
										<Link
											to={"/l/{-$learningId}/c/{-$chatId}"}
											params={{
												learningId: item.learningId,
												chatId: item.chatId,
											}}
											className="w-full"
										>
											<div className="flex w-full items-center gap-4">
												<div className="grow overflow-hidden">
													<div className="text-sm font-medium">
														{item.title}
													</div>
													<div className="min-h-0 truncate text-sm">
														{item.description}
													</div>
												</div>

												<div className="relative flex min-h-10 min-w-10 items-center justify-between text-sm">
													<span className="whitespace-nowrap opacity-100 group-hover/project-item:opacity-0">
														{item.date}
													</span>
													<div className="absolute inset-0 flex items-center gap-1.5 translate-y-0 scale-95 opacity-0 group-hover/project-item:translate-y-0 group-hover/project-item:scale-100 group-hover/project-item:opacity-100"></div>
												</div>
											</div>
										</Link>
									</li>
								))}
							</ol>
						</section>
					</div>
				</ContainerWithMaxWidth>
			</ContainerWithMargin>
		</div>
	);
}

export default AiLearning;
