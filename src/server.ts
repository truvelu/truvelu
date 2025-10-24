// src/server.ts
import {
	createStartHandler,
	defaultStreamHandler,
	defineHandlerCallback,
} from "@tanstack/react-start/server";

const customHandler = defineHandlerCallback((ctx) => {
	// add custom logic here
	return defaultStreamHandler(ctx);
});

const fetch = createStartHandler(customHandler);

export default {
	fetch,
};
