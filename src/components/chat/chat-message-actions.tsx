import { ChatMessage } from "@/types/chat";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { useChatStore } from "@/lib/chat/chat-store";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";
import { CopyButton } from "@/components/ui/copy-button";
import { RotateCCWIcon } from "@/components/icons/rotate-ccw";
import { UpvoteIcon } from "@/components/icons/upvote";
import { DownvoteIcon } from "@/components/icons/downvote";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface ChatMessageActionsProps {
  message: ChatMessage;
  onEdit?: () => void;
}

export default function ChatMessageActions({ message, onEdit }: ChatMessageActionsProps) {
  const { retryMessage } = useChatStore()
  const { sendMessage } = useChat()

  const handleRetry = () => {
    retryMessage(message.id, (content) => {
      sendMessage(content)
    })
    toast.success("Retrying message...")
  }

  const handleUpvote = () => {
    // TODO: Implement upvote functionality
    toast.success("Message upvoted")
  }

  const handleDownvote = () => {
    // TODO: Implement downvote functionality  
    toast.success("Message downvoted")
  }

  return (
    <TooltipProvider>
      <div className="flex">
        <CopyButton
          textToCopy={message.content}
          successMessage="Message copied to clipboard"
          tooltipText="Copy"
          tooltipCopiedText="Copied!"
          iconSize={16}
          className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
        />
        
        {/* Show Retry, Upvote, and Downvote for assistant messages */}
        {message.role === 'assistant' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-2 m-0 h-fit w-fit text-muted-foreground"
                  onClick={handleUpvote}
                >
                  <UpvoteIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
                Upvote
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-2 m-0 h-fit w-fit text-muted-foreground"
                  onClick={handleDownvote}
                >
                  <DownvoteIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
                Downvote
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
                  onClick={handleRetry}
                >
                  <RotateCCWIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
                Retry
              </TooltipContent>
            </Tooltip>
          </>
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