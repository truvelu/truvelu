import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ShapeCollectionIcon } from "@hugeicons/core-free-icons";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import BtnLoginOrChild from "./btn-login-or-child";
import SharedIcon from "./shared-icon";

export const AiPromptInput = ({ onReady }: { onReady: () => void }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [value, setValue] = useState("");

  useEffect(() => {
    onReady?.();
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;

    setValue(value);
  }, []);

  return (
    <PromptInput onSubmit={() => {}}>
      <PromptInputBody className="border-none px-2.5 min-h-14 justify-center">
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>

        <PromptInputTextarea
          ref={textareaRef}
          onChange={handleChange}
          value={value}
          className="p-2.5 text-base"
        />
      </PromptInputBody>

      <PromptInputToolbar className="p-2.5 pt-0">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger className="!rounded-full cursor-pointer" />
            <PromptInputActionMenuContent className="rounded-tmedium p-1.5">
              <PromptInputActionAddAttachments className="rounded-lg py-1.5 px-2.5 text-sm cursor-pointer" />
              <Separator className="my-1.5" />
              <DropdownMenuItem className="rounded-lg py-1.5 px-2.5 text-sm cursor-pointer">
                <SharedIcon icon={ShapeCollectionIcon} className="mr-2" />
                Change composition
              </DropdownMenuItem>
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <BtnLoginOrChild>
          <PromptInputSubmit
            disabled={false}
            status={"ready"}
            className="rounded-full cursor-pointer"
          />
        </BtnLoginOrChild>
      </PromptInputToolbar>
    </PromptInput>
  );
};
