import { ChatMessage } from "@/types/chat";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { useChatStore } from "@/lib/chat/chat-store";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";
import { CopyIcon } from "@/components/icons/copy";
import { CheckIcon } from "@/components/icons/check";
import { RotateCCWIcon } from "@/components/icons/rotate-ccw";
import { UpvoteIcon } from "@/components/icons/upvote";
import { DownvoteIcon } from "@/components/icons/downvote";
import { useState, useEffect } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface ChatMessageActionsProps {
  message: ChatMessage;
  onEdit?: () => void;
}

export default function ChatMessageActions({ message, onEdit }: ChatMessageActionsProps) {
  const { copyMessage, retryMessage } = useChatStore()
  const { sendMessage } = useChat()
  const [showCheck, setShowCheck] = useState(false)

  const handleCopy = () => {
    copyMessage(message.id)
    toast.success("Message copied to clipboard")
    setShowCheck(true)
  }

  useEffect(() => {
    if (showCheck) {
      const timer = setTimeout(() => {
        setShowCheck(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [showCheck])

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-2 m-0 h-fit w-fit text-muted-foreground hover:text-primary"
              onClick={handleCopy}
            >
              {showCheck ? (
                <CheckIcon className="" size={16} />
              ) : (
                <CopyIcon className="" size={16} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" sideOffset={4} className="border border-border text-secondary-foreground bg-secondary">
            {showCheck ? "Copied!" : "Copy"}
          </TooltipContent>
        </Tooltip>
        
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