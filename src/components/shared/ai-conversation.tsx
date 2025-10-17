import { Fragment, memo, useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent } from "../ai-elements/message";
import { Response } from "../ai-elements/response";
import { AiPromptInput } from "./ai-prompt-input";
import { cn } from "@/lib/utils";
import { Action, Actions } from "../ai-elements/actions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { useSidebar } from "../ui/sidebar";
import {
  Copy01Icon,
  Message01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "../ui/drawer";
import Header from "./header";
import { Button } from "../ui/button";
import CloseButton from "./close-button";
import { useCanvas } from "@/contexts/canvas";
import SharedIcon from "./shared-icon";

const MESSAGES: {
  id: string;
  role: "user" | "assistant" | "system";
  parts: {
    type: string;
    text: string;
    canvas?: { title: string; value: string };
  }[];
}[] = [
  {
    id: "1",
    role: "user",
    parts: [{ type: "text", text: "Hello, how are you?" }],
  },
  {
    id: "2",
    role: "assistant",
    parts: [{ type: "text", text: "I am good, thank you!" }],
  },
  {
    id: "3",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of France?" }],
  },
  {
    id: "4",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of France is Paris." }],
  },
  {
    id: "5",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Germany?" }],
  },
  {
    id: "6",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Germany is Berlin." }],
  },
  {
    id: "7",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Italy?" }],
  },
  {
    id: "8",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Italy is Rome." }],
  },
  {
    id: "9",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Spain?" }],
  },
  {
    id: "10",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Spain is Madrid." }],
  },
  {
    id: "11",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Portugal?" }],
  },
  {
    id: "12",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
      },
    ],
  },
  {
    id: "13",
    role: "user",
    parts: [
      {
        type: "text",
        text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
      },
    ],
  },
  {
    id: "14",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I will explain how to calculate the cogs for a saas in canvas",
        canvas: {
          title: "COGS Calculation",
          value: `## Summary

Based on E2B’s official pricing, there are two primary tiers: Hobby, which is free per month with usage costs, and Pro, which is $150 per month plus usage costs ([E2B][1]). The Hobby tier includes a one-time $100 usage credit, community support, up to 1-hour sandbox sessions, and supports up to 20 concurrent sandboxes ([E2B][1]). The Pro tier adds another $100 credit, a dedicated Slack channel, prioritized features, customizable CPU & RAM, up to 24-hour sessions, and up to 100 concurrent sandboxes ([E2B][1]). Compute usage is billed per second: $0.000014 per vCPU and $0.0000045 per GiB of RAM ([E2B][1]), while storage is free up to the plan’s included allowance ([E2B][1]). By default, each sandbox comes with 2 vCPU and 512 MiB of RAM, yielding a base compute rate of $0.000028 per second ([E2B][1]). Using these parameters, we can calculate your COGS per user by modeling their average sandbox usage and then scale to different user counts.

## COGS Components

### Subscription Cost

* **Hobby tier subscription:** $0 per month ([E2B][1])
* **Pro tier subscription:** $150 per month ([E2B][1])

You’ll amortize the subscription cost across your total user base:
[
\text{Subscription COGS per user} = \frac{\text{Monthly plan fee}}{N_{\text{users}}}
]

### Usage Cost

E2B charges compute costs by second of sandbox uptime. For the default configuration:

* **vCPU:** 2 vCPU × $0.000014 /vCPU/s = $0.000028 per second ([E2B][1])
* **RAM:** 512 MiB (= 0.5 GiB) × $0.0000045 /GiB/s = $0.00000225 per second ([E2B][1])
* **Storage:** Free up to 1 GiB (Hobby) or 5 GiB (Pro) ([E2B][1])

Thus, **Total default compute cost** = $0.000028 (s) + $0.00000225 (s) = **$0.00003025 per second**.

### Other Considerations

* **One-time credits:** Each new account receives $100 free usage credit, which can offset early COGS ([E2B][1]).
* **Concurrency limits:** Hobby supports 20 concurrent sandboxes; Pro up to 100 ([E2B][1]). Plan accordingly if you run parallel sessions.

## Per-User COGS Example

Assume each user runs their sandbox for **1 hour** (3,600 s) per month on the default configuration:

1. **Compute cost per user per month**
   [
   3{,}600\ \text{s} \times $0.00003025/\text{s}
   = $0.1089
   ]

2. **Subscription cost per user**

   * Hobby: $0 (Hobby tier)
   * Pro: $150 / (N) users

3. **Total COGS per user**
   [
   \text{COGS} = $0.1089 + \frac{$150}{N}
   ]

## COGS at Different Scales

| Number of Users (N) | Subscription per User | Compute per User (1 h) | Total COGS per User |
| ------------------- | --------------------- | ---------------------- | ------------------- |
| 100                 | $1.50                 | $0.1089                | $1.6089             |
| 500                 | $0.30                 | $0.1089                | $0.4089             |
| 1,000               | $0.15                 | $0.1089                | $0.2589             |
| 5,000               | $0.03                 | $0.1089                | $0.1389             |

This illustrates how, as you scale, the fixed subscription cost per user diminishes, leaving compute consumption as the primary driver of COGS.

---

Feel free to adjust the assumed usage hours or sandbox configuration to match your specific SaaS workloads.

[1]: https://e2b.dev/docs/legacy/pricing "E2B - Code Interpreting for AI apps"
`,
        },
      },
    ],
  },
  {
    id: "15",
    role: "user",
    parts: [
      {
        type: "text",
        text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
      },
    ],
  },

  {
    id: "16",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
      },
    ],
  },
];

const AiConversation = memo(() => {
  const {
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    setPretendIsMobile,
  } = useSidebar();
  const { selectedCanvasId, onSelectCanvas } = useCanvas();

  const inputRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState(0);

  console.log({ inputHeight });

  const handleInputReady = () => {
    if (inputRef.current) {
      setInputHeight(inputRef.current.offsetHeight);
    }
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const updateHeight = () => {
      setInputHeight(input.offsetHeight);
    };

    const ro = new ResizeObserver(updateHeight);
    ro.observe(input);

    window.addEventListener("resize", updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <>
      <Conversation className="h-full flex-1 bg-white">
        <ConversationContent
          className={cn(
            "w-full [--thread-content-max-width:40rem] lg:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width)",
            "[--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(8)] lg:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)"
          )}
          style={{
            paddingBottom: `calc(${inputHeight}px + 0.5rem + env(safe-area-inset-bottom) + 8rem)`,
          }}
        >
          {!MESSAGES.length ? (
            <ConversationEmptyState
              icon={<SharedIcon icon={Message01Icon} size={48} />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
            />
          ) : (
            MESSAGES.map((message) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message
                            from={message.role}
                            className={
                              message.role === "user" ? "first:pt-0 pt-12" : ""
                            }
                          >
                            <MessageContent variant="flat">
                              <Response>{part.text}</Response>
                            </MessageContent>
                          </Message>

                          {part.canvas && (
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex flex-col gap-1 rounded-2.5xl px-4 py-3 text-sm border border-border w-full mt-3 cursor-pointer"
                              onClick={() => {
                                if (selectedCanvasId === message.id) {
                                  onSelectCanvas(null);
                                  setPretendIsMobile(false);
                                }

                                if (selectedCanvasId !== message.id) {
                                  onSelectCanvas(message.id);
                                  setPretendIsMobile(true);
                                }

                                if (selectedCanvasId !== null && sidebarOpen)
                                  return;
                                setSidebarOpen(false);
                              }}
                            >
                              <h1 className="text-base font-semibold">
                                {part.canvas.title}
                              </h1>
                              <p className="text-sm text-gray-400">
                                Interactive canvas
                              </p>
                            </div>
                          )}
                          {message.role === "user" && (
                            <Actions className="justify-end">
                              <Action onClick={() => {}} label="Retry">
                                <SharedIcon icon={RefreshIcon} size={18} />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <SharedIcon icon={Copy01Icon} size={18} />
                              </Action>
                            </Actions>
                          )}
                          {message.role === "assistant" && (
                            <Actions>
                              <Action onClick={() => {}} label="Retry">
                                <SharedIcon icon={RefreshIcon} />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <SharedIcon icon={Copy01Icon} />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );
                    default:
                      return null;
                  }
                })}
              </Fragment>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton
          style={{
            bottom: `calc(${inputHeight}px + 4.5rem)`,
          }}
        />
      </Conversation>

      <div ref={inputRef} className={cn("absolute inset-x-0 bottom-0")}>
        <div
          className={cn(
            "w-full [--thread-content-max-width:40rem] lg:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width)",
            "[--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(6)] px-(--thread-content-margin)"
          )}
        >
          <div className="pb-2 bg-white">
            <AiPromptInput onReady={handleInputReady} />
          </div>
        </div>
      </div>
    </>
  );
});

AiConversation.displayName = "AiConversation";

const AiConversationCanvas = memo(
  ({ onCloseCanvas }: { onCloseCanvas: () => void }) => {
    const { selectedCanvasId } = useCanvas();

    const canvasOpenedMessageList =
      MESSAGES.find((message) => message.id === selectedCanvasId)
        ?.parts?.map((part) => part.canvas)
        ?.flat()
        ?.filter((part) => part !== undefined) ?? [];
    const canvasOpenedMessage = canvasOpenedMessageList[0];

    return (
      <>
        <div className="flex items-center gap-1 h-header px-2 bg-white">
          <CloseButton
            buttonProps={{
              onClick: () => onCloseCanvas(),
            }}
          />

          <div>
            <h1 className="text-base pl-3 pr-2">
              {canvasOpenedMessage?.title}
            </h1>
          </div>
        </div>
        <div
          className={cn(
            "flex-1 h-full overflow-y-auto pt-3",
            "[--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(6)] px-(--thread-content-margin)"
          )}
        >
          <Response>{canvasOpenedMessage?.value}</Response>
        </div>
      </>
    );
  }
);

AiConversationCanvas.displayName = "AiConversationCanvas";

export const AiConversationResponsive = memo(() => {
  const isMobile = useIsMobile();
  const { setPretendIsMobile } = useSidebar();
  const { open: canvasOpen, selectedCanvasId, onSelectCanvas } = useCanvas();

  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const onCloseCanvas = () => {
    onSelectCanvas(null);
    setPretendIsMobile(false);
  };

  // Animate panel size based on canvasOpenedId
  useEffect(() => {
    if (rightPanelRef.current) {
      if (selectedCanvasId === null) {
        rightPanelRef.current.collapse();
      } else {
        rightPanelRef.current.expand();
      }
    }
  }, [selectedCanvasId]);

  if (isMobile) {
    return (
      <>
        <Header />
        <div
          className={cn(
            "relative h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))]"
          )}
        >
          <AiConversation />

          <Drawer
            open={canvasOpen}
            onOpenChange={(open) => {
              if (!open) {
                onCloseCanvas();
              }
            }}
          >
            <DrawerContent>
              <AiConversationCanvas onCloseCanvas={onCloseCanvas} />
            </DrawerContent>
          </Drawer>
        </div>
      </>
    );
  }

  return (
    <ResizablePanelGroup id="resizable-panel-group" direction="horizontal">
      <ResizablePanel
        id="resizable-panel-left-panel"
        className={cn("relative h-svh lg:h-dvh")}
        defaultSize={65}
        minSize={35}
      >
        <Header />

        <AiConversation />
      </ResizablePanel>

      <ResizableHandle
        id="resizable-handle"
        withHandle
        className={cn(!canvasOpen && "pointer-events-none opacity-0")}
      />

      <ResizablePanel
        ref={rightPanelRef}
        id="resizable-panel-right-panel"
        defaultSize={35}
        collapsible
        collapsedSize={0}
        minSize={0}
        className={cn(
          !canvasOpen && "!hidden",
          "flex flex-col relative h-svh lg:h-dvh pb-3 transition-all duration-100 ease-in-out overflow-hidden",
          "shadow-[0_0_18px_rgba(0,0,0,0.12)] dark:shadow-[0_0_18px_rgba(0,0,0,0.48)] z-30"
        )}
      >
        <AiConversationCanvas onCloseCanvas={onCloseCanvas} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});

AiConversationResponsive.displayName = "AiConversationResponsive";
