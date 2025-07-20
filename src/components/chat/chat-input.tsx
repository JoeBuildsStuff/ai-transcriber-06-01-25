'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Loader2, CornerRightUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChat } from '@/hooks/use-chat'
import { useChatStore } from '@/lib/chat/chat-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ChatInput() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage } = useChat()
  const { isLoading } = useChatStore()
  const [selectedModel, setSelectedModel] = useState('sonnet')

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    setInput('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await sendMessage(trimmedInput)
    } finally {
      // Focus back to input
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    
    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className="p-2 space-y-2">
      <div className="flex gap-2 items-center relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your data..."
            disabled={isLoading}
            rows={1}
            className="resize-none rounded-xl border-none pb-12"
            // pr-20 and pb-8 add right and bottom padding to avoid overlap with floating buttons
          />
          {/* Actions */}
          <div className="flex gap-2 items-center absolute bottom-2 right-2">
            {/* TODO: Enable model selection in the api route */}
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={isLoading}
            >
              <SelectTrigger size="sm" className="w-fit border-none text-muted-foreground" >
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haiku">Haiku 3.5</SelectItem>
                <SelectItem value="sonnet">Sonnet 4</SelectItem>
                <SelectItem value="opus">Opus 4</SelectItem>
                <SelectItem value="gemini">Gemini 2.5</SelectItem>
                <SelectItem value="4o">4o</SelectItem>
              </SelectContent>
            </Select>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="rounded-full border-none w-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerRightUp className="size-4 shrink-0" strokeWidth={1.5}/>
              )}
            </Button>
          </div>
      </div>
    </div>
  )
} 