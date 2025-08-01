'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Loader2, CornerRightUp, Paperclip, X, FileText, FileImage, FileAudio, FileVideo, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChat } from '@/hooks/use-chat'
import { useChatStore } from '@/lib/chat/chat-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '../ui/card'

export interface Attachment {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export function ChatInput() {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage } = useChat()
  const { isLoading } = useChatStore()
  const [selectedModel, setSelectedModel] = useState('sonnet')

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if ((!trimmedInput && attachments.length === 0) || isLoading) return

    const messageContent = trimmedInput || 'Sent with attachments'
    const currentAttachments = [...attachments]
    
    setInput('')
    setAttachments([])
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await sendMessage(messageContent, currentAttachments)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const newAttachments: Attachment[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }))
    
    setAttachments(prev => [...prev, ...newAttachments])
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id))
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="size-4" />
    if (type.startsWith('audio/')) return <FileAudio className="size-4" />
    if (type.startsWith('video/')) return <FileVideo className="size-4" />
    if (type.startsWith('text/')) return <FileText className="size-4" />
    return <File className="size-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading

  return (
    <div className="p-2 space-y-2">
      <div className="flex flex-col gap-2 items-center relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your data..."
            disabled={isLoading}
            rows={1}
            className="resize-none rounded-xl border-none pb-12 bg-muted/50"
            // pr-20 and pb-8 add right and bottom padding to avoid overlap with floating buttons
          />
          {/* Actions */}
          <div className="flex gap-2 items-center absolute bottom-2 right-2 w-full justify-between">
            {/* Left side buttons */}
            <div className="flex gap-2 items-center ml-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-none w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="size-4 shrink-0" strokeWidth={1.5}/>
              </Button>
            </div>

            {/* Right side buttons */}
            {/* TODO: Enable model selection in the api route */}
            <div className="flex gap-2 items-center">
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isLoading}
              >
                <SelectTrigger size="sm" className="w-fit border-none text-muted-foreground shadow-none" >
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
                disabled={!canSend}
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

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="w-full p-2">
          <div className="flex flex-col gap-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="w-full p-3 relative bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {attachment.type} • {formatFileSize(attachment.size)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-6 w-6 p-0"
                    onClick={() => removeAttachment(attachment.id)}
                    disabled={isLoading}
                  >
                    <X className="size-3" strokeWidth={1.5}/>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 