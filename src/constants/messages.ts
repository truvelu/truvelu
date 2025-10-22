export enum MessageType {
	TEXT = "text",
	CANVAS = "canvas",
}

export type MessagePartText = {
	type: MessageType.TEXT;
	text: string;
};

export type MessagePartCanvas = {
	type: MessageType.CANVAS;
	title: string;
	value: string;
};

export type MessagePart = MessagePartText | MessagePartCanvas;

export type Message = {
	id: string;
	role: "user" | "assistant" | "system";
	parts: MessagePart[];
}[];

export const MATH_MARKDOWN = `## Inline Math

The quadratic formula is $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ for solving $$ax^2 + bx + c = 0$$.

Euler's identity: $$e^{i\\pi} + 1 = 0$$ combines five fundamental mathematical constants.

## Block Math

The normal distribution probability density function:

$$
f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}
$$

## Summations and Integrals

The sum of the first $$n$$ natural numbers: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

Integration by parts: $$\\int u \\, dv = uv - \\int v \\, du$$
`;

export const MESSAGES: Message = [
	{
		id: "1",
		role: "user",
		parts: [{ type: MessageType.TEXT, text: "Hello, how are you?" }],
	},
	{
		id: "2",
		role: "assistant",
		parts: [{ type: MessageType.TEXT, text: "I am good, thank you!" }],
	},
	{
		id: "3",
		role: "user",
		parts: [{ type: MessageType.TEXT, text: "What is the capital of France?" }],
	},
	{
		id: "4",
		role: "assistant",
		parts: [
			{ type: MessageType.TEXT, text: "The capital of France is Paris." },
		],
	},
	{
		id: "5",
		role: "user",
		parts: [
			{ type: MessageType.TEXT, text: "What is the capital of Germany?" },
		],
	},
	{
		id: "6",
		role: "assistant",
		parts: [
			{ type: MessageType.TEXT, text: "The capital of Germany is Berlin." },
		],
	},
	{
		id: "7",
		role: "user",
		parts: [{ type: MessageType.TEXT, text: "What is the capital of Italy?" }],
	},
	{
		id: "8",
		role: "assistant",
		parts: [{ type: MessageType.TEXT, text: "The capital of Italy is Rome." }],
	},
	{
		id: "9",
		role: "user",
		parts: [{ type: MessageType.TEXT, text: "What is the capital of Spain?" }],
	},
	{
		id: "10",
		role: "assistant",
		parts: [
			{ type: MessageType.TEXT, text: "The capital of Spain is Madrid." },
		],
	},
	{
		id: "11",
		role: "user",
		parts: [
			{ type: MessageType.TEXT, text: "What is the capital of Portugal?" },
		],
	},
	{
		id: "12",
		role: "assistant",
		parts: [
			{
				type: MessageType.TEXT,
				text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
			},
		],
	},
	{
		id: "13",
		role: "user",
		parts: [
			{
				type: MessageType.TEXT,
				text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
			},
		],
	},
	{
		id: "14",
		role: "assistant",
		parts: [
			{
				type: MessageType.TEXT,
				text: "I will explain how to calculate the cogs for a saas in canvas",
			},
			{
				type: MessageType.CANVAS,
				title: "COGS Calculation",
				value: MATH_MARKDOWN,
			},
		],
	},
	{
		id: "15",
		role: "user",
		parts: [
			{
				type: MessageType.TEXT,
				text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
			},
		],
	},

	{
		id: "16",
		role: "assistant",
		parts: [
			{
				type: MessageType.TEXT,
				text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
			},
		],
	},
];

export const MESSAGES_THREAD: { id: string; messages: Message }[] = [
	{
		id: "16",
		messages: [
			{
				id: "1",
				role: "user",
				parts: [{ type: MessageType.TEXT, text: "Hello, how are you?" }],
			},
			{
				id: "2",
				role: "assistant",
				parts: [{ type: MessageType.TEXT, text: "I am good, thank you!" }],
			},
			{
				id: "3",
				role: "user",
				parts: [
					{ type: MessageType.TEXT, text: "What is the capital of France?" },
				],
			},
			{
				id: "4",
				role: "assistant",
				parts: [
					{ type: MessageType.TEXT, text: "The capital of France is Paris." },
				],
			},
		],
	},
];
