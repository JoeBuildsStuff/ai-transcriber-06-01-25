'use client'

import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, CopyIcon, DraftingCompass, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ChatMessage as ChatMessageType, ChatAction } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import ChatMessageActions from './chat-message-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatToolCallArguments, formatToolCallResult } from '@/lib/chat/utils'
import { useState } from 'react'
import { useChatStore } from '@/lib/chat/chat-store'

// Import highlight.js styles
import 'highlight.js/styles/github-dark.css'

interface ChatMessageProps {
  message: ChatMessageType
  onActionClick?: (action: ChatAction) => void
}

// Loading placeholder component
export function ChatMessageLoading() {
  return (
    <div className="flex gap-1 px-0 py-2">
      <div className="flex flex-col gap-1 max-w-[85%]">
        {/* Loading message bubble */}
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          "bg-muted text-foreground",
          "rounded-bl-sm",
          "flex items-center gap-2"
        )}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  )
}

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const { editMessage } = useChatStore()

  // Debug tool calls
  if (message.toolCalls && message.toolCalls.length > 0) {
    console.log('🔧 Message has tool calls:', message.toolCalls)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleEditSave = () => {
    if (editContent.trim() !== message.content) {
      editMessage(message.id, editContent.trim())
      toast.success("Message updated")
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const handleEditCancel = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  return (
    <div className={cn(
      "flex gap-1 px-0 py-2",
      isUser && "flex-row-reverse",
      isSystem && "justify-center"
    )}>

      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isUser && "items-end",
        isSystem && "items-center max-w-full"
      )}>

        {/* Timestamp */}
        {!isSystem && (
          <div className={cn(
            "text-xs text-muted-foreground px-1",
            isUser && "text-right"
          )}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </div>
        )}

        {/* Tool calls - shown before the response for non-system messages */}
        {!isSystem && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 mb-2">
            {message.toolCalls.map((toolCall) => (
              <Collapsible key={toolCall.id} className="rounded-lg px-3 py-2 text-sm break-words bg-muted text-foreground rounded-bl-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <DraftingCompass className="size-4 shrink-0" strokeWidth={1.5}/>
                      <span className="text-muted-foreground font-medium group-hover:underline">
                        {toolCall.name}
                      </span>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" strokeWidth={1.5}/>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {/* Tool Arguments */}
                    <div className="flex flex-col gap-1 bg-background/30 p-2 rounded-md relative">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium">Request:</span>
                      </div>
                      <pre className="text-xs p-2 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                        {formatToolCallArguments(toolCall.arguments)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(formatToolCallArguments(toolCall.arguments))
                          toast.success("Arguments copied to clipboard")
                        }}
                      >
                        <CopyIcon className="size-3" strokeWidth={1.5}/>
                      </Button>
                    </div>

                    {/* Tool Result */}
                    {toolCall.result && (
                      <div className="flex flex-col gap-1 bg-background/30 p-2 rounded-md relative">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs font-medium">
                            Result: {toolCall.result.success ? 'Success' : 'Error'}
                          </span>
                        </div>
                        <pre className="text-xs p-2 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                          {formatToolCallResult(toolCall.result)}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => {
                            const content = formatToolCallResult(toolCall.result)
                            navigator.clipboard.writeText(content)
                            toast.success("Result copied to clipboard")
                          }}
                        >
                          <CopyIcon className="size-3" strokeWidth={1.5}/>
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Message bubble or editing textarea */}
        {isEditing && isUser ? (
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            "bg-muted text-foreground"
          )}>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent dark:bg-transparent shadow-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none p-0 resize-none"
              placeholder="Edit your message..."
              autoFocus
            />
            <div className="flex gap-2 items-center justify-end">
            <Button
                size="sm"
                onClick={handleEditCancel}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSave}
                variant="outline"
              >
                Send
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            "break-words",
            isUser && [
              "bg-muted text-foreground",
            ],
            !isUser && !isSystem && [
              "bg-muted text-foreground",
              "rounded-bl-sm"
            ],
            isSystem && [
              "bg-muted/50 text-muted-foreground text-xs",
              "italic px-4 py-1 rounded-full"
            ]
          )}>
            {isSystem ? (
              message.content
            ) : (
              <div className={cn(
                "prose prose-sm max-w-none",
                "dark:prose-invert"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Only override what's absolutely necessary
                    code: ({ children, ...props }) => {
                      const isInline = !props.className?.includes('language-')
                      return isInline ? (
                        <code className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-mono border",
                          "bg-muted/60 border-muted-foreground/20"
                        )} {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="text-xs font-mono" {...props}>
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className={cn(
                        "p-3 rounded-md overflow-x-auto my-2 border text-xs",
                        "bg-muted/60 border-muted-foreground/20"
                      )}>
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Only show actions when not editing */}
        {!isEditing && <ChatMessageActions message={message} onEdit={handleEdit} />}

        {/* Function result indicator */}
        {message.functionResult && (
          <Badge
            variant={message.functionResult.success ? "green" : "red"}
            className="mt-1"
          >
            {message.functionResult.success ? '✓ Action completed' : '✗ Action failed'}
          </Badge>
        )}

        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestedActions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  "text-xs px-2 py-1 rounded-md",
                  "bg-secondary text-secondary-foreground",
                  "hover:bg-secondary/80 transition-colors",
                  "border border-border"
                )}
                onClick={() => onActionClick?.(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 