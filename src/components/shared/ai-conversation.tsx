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
import { useSidebar } from "../ui/sidebar";
import {
  Copy01Icon,
  Message01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import SharedIcon from "./shared-icon";
import { MESSAGES } from "@/constants/messages";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import { useShallow } from "zustand/react/shallow";
import { useGetRoomId } from "@/hooks/use-get-room-id";

const AiConversation = memo(() => {
  const {
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    setPretendIsMobile,
  } = useSidebar();
  const roomId = useGetRoomId();
  const { upsertCanvas, getCanvas, clearCanvas } = useCanvasStore(
    useShallow(({ upsertCanvas, getCanvas, clearCanvas }) => ({
      upsertCanvas,
      getCanvas,
      clearCanvas,
    }))
  );

  const inputRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState(0);

  const handleInputReady = () => {
    if (inputRef.current) {
      setInputHeight(inputRef.current.offsetHeight);
    }
  };

  const selectedCanvas = getCanvas({ roomId: roomId ?? "" })?.find(
    (canvas) => canvas.type === CanvasType.CONTENT
  );

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
      <Conversation className="h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))] flex-1 bg-white">
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
                                console.log({
                                  selectedCanvas,
                                  messageId: message.id,
                                  equal:
                                    selectedCanvas?.data?.threadId ===
                                    message.id,
                                });

                                if (
                                  selectedCanvas?.data?.threadId === message.id
                                ) {
                                  clearCanvas();
                                  setPretendIsMobile(false);
                                }

                                if (
                                  selectedCanvas?.data?.threadId !== message.id
                                ) {
                                  upsertCanvas({
                                    type: CanvasType.CONTENT,
                                    data: { threadId: message.id, roomId },
                                  });
                                  setPretendIsMobile(true);
                                }

                                if (
                                  selectedCanvas?.data?.threadId ===
                                    message.id &&
                                  sidebarOpen
                                )
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
            bottom: `calc(${inputHeight}px + 1.5rem)`,
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

export default AiConversation;
