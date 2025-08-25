'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { 
  Loader2, 
  CornerRightUp, 
  Paperclip, 
  X, 
  FileText, 
  FileVideo, 
  File,
  FileArchive,
  FileSpreadsheet,
  Headphones,
  Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChat } from '@/hooks/use-chat'
import { useChatStore } from '@/lib/chat/chat-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'

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
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage } = useChat()
  const { isLoading } = useChatStore()
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')

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
      await sendMessage(messageContent, currentAttachments, selectedModel)
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

  const openAttachmentModal = (attachment: Attachment) => {
    setSelectedAttachment(attachment)
  }

  const closeAttachmentModal = () => {
    setSelectedAttachment(null)
  }

  const getFileIcon = (attachment: Attachment) => {
    const fileType = attachment.type
    const fileName = attachment.name

    const iconMap = {
      pdf: {
        icon: FileText,
        conditions: (type: string, name: string) =>
          type.includes("pdf") ||
          name.endsWith(".pdf") ||
          type.includes("word") ||
          name.endsWith(".doc") ||
          name.endsWith(".docx"),
      },
      archive: {
        icon: FileArchive,
        conditions: (type: string, name: string) =>
          type.includes("zip") ||
          type.includes("archive") ||
          name.endsWith(".zip") ||
          name.endsWith(".rar"),
      },
      excel: {
        icon: FileSpreadsheet,
        conditions: (type: string, name: string) =>
          type.includes("excel") ||
          name.endsWith(".xls") ||
          name.endsWith(".xlsx"),
      },
      video: {
        icon: FileVideo,
        conditions: (type: string) => type.includes("video/"),
      },
      audio: {
        icon: Headphones,
        conditions: (type: string) => type.includes("audio/"),
      },
      image: {
        icon: Image,
        conditions: (type: string) => type.startsWith("image/"),
      },
    }

    for (const { icon: Icon, conditions } of Object.values(iconMap)) {
      if (conditions(fileType, fileName)) {
        return <Icon className="size-5 opacity-60" />
      }
    }

    return <File className="size-5 opacity-60" />
  }

  const getFilePreview = (attachment: Attachment) => {
    const fileType = attachment.type

    return (
      <div className="bg-accent flex aspect-square items-center justify-center overflow-hidden rounded-t-[inherit]">
        {fileType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={URL.createObjectURL(attachment.file)}
            alt={attachment.name}
            className="size-full rounded-t-[inherit] object-cover"
          />
        ) : (
          getFileIcon(attachment)
        )}
      </div>
    )
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
    <div className="p-2">
      <div className="border border-border rounded-xl">
        <div className="flex flex-col gap-2 items-center relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask question..."
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
                    <SelectItem value="claude-3-5-haiku-20241022">Haiku 3.5</SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                    <SelectItem value="claude-opus-4-1-20250805">Opus 4.1</SelectItem>
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
            <div className="flex w-full flex-col">
                          <div className="flex gap-4 overflow-x-auto pt-2 pb-1">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="bg-background relative flex flex-col rounded-md border group min-w-[120px] max-w-[120px] flex-shrink-0 cursor-pointer"
                  onClick={() => openAttachmentModal(attachment)}
                >
                  {getFilePreview(attachment)}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeAttachment(attachment.id)
                    }}
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 -right-2 size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Remove file"
                    disabled={isLoading}
                  >
                    <X className="size-3.5" />
                  </Button>
                  <div className="flex min-w-0 flex-col gap-0.5 border-t p-2">
                    <p className="truncate text-[11px] font-medium">
                      {attachment.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachment Preview Modal */}
      <Dialog open={!!selectedAttachment} onOpenChange={closeAttachmentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            {selectedAttachment && (
              <div className="flex flex-col">
                {/* File Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium truncate">
                      {selectedAttachment.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAttachment.type} • {formatFileSize(selectedAttachment.size)}
                    </p>
                  </div>
                </div>

                {/* File Content */}
                <div className="flex-1 overflow-auto">
                  {selectedAttachment.type.startsWith('image/') ? (
                    <div className="flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(selectedAttachment.file)}
                        alt={selectedAttachment.name}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        {getFileIcon(selectedAttachment)}
                        <p className="mt-2 text-sm text-muted-foreground">
                          Preview not available for this file type
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedAttachment.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 