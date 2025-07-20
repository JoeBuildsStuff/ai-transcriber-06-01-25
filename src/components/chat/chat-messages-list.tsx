'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/lib/chat/chat-store'
import { ChatMessage, ChatMessageLoading } from './chat-message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessagesSquare } from 'lucide-react'

export function ChatMessagesList() {
  const { messages, isLoading } = useChatStore()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-2">
        <MessagesSquare className="size-8 text-muted-foreground mb-2" strokeWidth={1.5}/>
        <p className="text-sm text-muted-foreground mb-4">Start a conversation</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-1 px-0"
    >
      <div className="space-y-0">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message}
          />
        ))}
        
        {/* Show loading placeholder while waiting for API response */}
        {isLoading && <ChatMessageLoading />}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
    </ScrollArea>
  )
} 