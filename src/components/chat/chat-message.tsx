'use client'

import { formatDistanceToNow } from 'date-fns'
import { Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ChatMessage as ChatMessageType, ChatAction } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
        {/* Message bubble */}
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          "break-words",
          isUser && [
            "bg-primary text-primary-foreground",
            "rounded-br-sm"
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
              isUser ? "prose-invert" : "dark:prose-invert",
              // Override prose colors for user messages
              isUser && [
                "prose-p:text-primary-foreground",
                "prose-ul:text-primary-foreground",
                "prose-ol:text-primary-foreground",
                "prose-li:text-primary-foreground",
                "prose-h1:text-primary-foreground",
                "prose-h2:text-primary-foreground",
                "prose-h3:text-primary-foreground",
                "prose-strong:text-primary-foreground",
                "prose-em:text-primary-foreground",
                "prose-blockquote:text-primary-foreground/80",
                "prose-blockquote:border-primary-foreground/30",
                "prose-hr:border-primary-foreground/20",
                "prose-table:border-primary-foreground/20",
                "prose-th:border-primary-foreground/20",
                "prose-th:bg-primary-foreground/10",
                "prose-th:text-primary-foreground",
                "prose-td:border-primary-foreground/20",
                "prose-td:text-primary-foreground"
              ]
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
                        isUser
                          ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                          : "bg-muted/60 border-muted-foreground/20"
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
                      isUser
                        ? "bg-primary-foreground/10 border-primary-foreground/20"
                        : "bg-muted/60 border-muted-foreground/20"
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

        {/* Timestamp */}
        {!isSystem && (
          <div className={cn(
            "text-xs text-muted-foreground px-1",
            isUser && "text-right"
          )}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </div>
        )}

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