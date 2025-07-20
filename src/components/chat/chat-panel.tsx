'use client'

import { useChatStore } from '@/lib/chat/chat-store'
import { cn } from '@/lib/utils'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatMessagesList } from '@/components/chat/chat-messages-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatHistory } from '@/components/chat/chat-history'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ChatPanel() {
  const { isOpen, isMinimized, isMaximized, showHistory } = useChatStore()

  // Don't render if not open or minimized
  if (!isOpen || isMinimized) {
    return null
  }

  return (
    <div 
      className={cn(
        "z-40 bg-background border border-border shadow-2xl flex flex-col transition-all duration-300 ease-in-out",
        // Maximized state - takes up right side of layout
        isMaximized && [
          "fixed top-0 right-0 h-full w-96",
          "border-l border-t-0 border-r-0 border-b-0 rounded-none"
        ],
        // Normal state - floating panel
        !isMaximized && [
          "fixed bottom-2 right-2",
          "w-full sm:w-96 h-full sm:h-[600px]",
          "rounded-2xl shadow-2xl"
        ]
      )}
    >
      {showHistory ? (
        // Chat History View
        <ChatHistory />
      ) : (
        // Regular Chat View
        <>
          {/* Chat Header */}
          <ChatHeader />
          
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-3">
                <ChatMessagesList />
              </div>
            </ScrollArea>
          </div>
          
          {/* Input Area */}
          <div className="bg-transparent">
            <ChatInput />
          </div>
        </>
      )}
    </div>
  )
} 