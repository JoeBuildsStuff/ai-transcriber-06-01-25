import { ChatMessage } from "@/types/chat";
import { Button } from "../ui/button";
import { CopyIcon, Pencil, RotateCcw } from "lucide-react";
import { useChatStore } from "@/lib/chat/chat-store";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface ChatMessageActionsProps {
  message: ChatMessage;
  onEdit?: () => void;
}

export default function ChatMessageActions({ message, onEdit }: ChatMessageActionsProps) {
  const { copyMessage, retryMessage } = useChatStore()
  const { sendMessage } = useChat()

  const handleCopy = () => {
    copyMessage(message.id)
    toast.success("Message copied to clipboard")
  }

  const handleRetry = () => {
    retryMessage(message.id, (content) => {
      sendMessage(content)
    })
    toast.success("Retrying message...")
  }

  return (
    <TooltipProvider>
      <div className="flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
              onClick={handleCopy}
            >
              <CopyIcon className="size-4 shrink-0" strokeWidth={1.5}/>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
            Copy
          </TooltipContent>
        </Tooltip>
        
        {/* Show Retry for assistant messages */}
        {message.role === 'assistant' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
                onClick={handleRetry}
              >
                <RotateCcw className="size-4 shrink-0" strokeWidth={1.5}/>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
              Retry
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Show Edit for user messages */}
        {message.role === 'user' && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
                onClick={onEdit}
              >
                <Pencil className="size-4 shrink-0" strokeWidth={1.5}/>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
              Edit
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}   