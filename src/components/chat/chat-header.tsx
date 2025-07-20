'use client'

import { X, Trash2, ChevronLeft, SquarePen, Download, Ellipsis, PanelRight, PictureInPicture2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/lib/chat/chat-store'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useState, useRef, useEffect } from 'react'

export function ChatHeader() {
  const { setOpen, setMinimized, clearMessages, setShowHistory, createSession, currentSession, updateSessionTitle, layoutMode, setLayoutMode } = useChatStore()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [showClearDialog, setShowClearDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setOpen(false)
    setMinimized(false)
  }



  const handleConfirmClear = () => {
    clearMessages()
    setShowClearDialog(false)
  }

  const handleCancelClear = () => {
    setShowClearDialog(false)
  }

  const handleNewChat = () => {
    createSession()
  }

  const handleDownloadChat = () => {
    console.log("Download chat")
  }

  const handleShowHistory = () => {
    setShowHistory(true)
  }

  const handleLayoutChange = (mode: 'floating' | 'inset') => {
    setLayoutMode(mode)
  }

  const handleTitleClick = () => {
    if (currentSession) {
      setEditTitle(currentSession.title)
      setIsEditingTitle(true)
    }
  }

  const handleTitleSubmit = () => {
    if (currentSession && editTitle.trim()) {
      updateSessionTitle(currentSession.id, editTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setIsEditingTitle(false)
    setEditTitle('')
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingTitle])

  return (
    <div className={cn(
      "flex items-center justify-between",
      "p-2 border-b",
      "rounded-t-xl"
    )}>
      {/* Left section - Navigate to historical chats */}
      <div className="flex items-center flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={handleShowHistory}
          title="View chat history"
        >
          <ChevronLeft className="size-5 text-primary flex-shrink-0" />
        </Button>

        {/* Chat Title */}
        <div className="flex-1 min-w-0 ml-2">
          {isEditingTitle ? (
            <Input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="h-7 text-sm font-medium border-none shadow-none px-1 py-0 focus-visible:ring-0 focus-visible:border-none bg-transparent"
              placeholder="Enter chat title..."
            />
          ) : (
            <Button
              variant="ghost"
              onClick={handleTitleClick}
              className="h-7 w-full justify-start text-left truncate text-sm font-medium px-1 py-0 hover:bg-muted/50"
              title={currentSession?.title || 'New Chat'}
            >
              {currentSession?.title || 'New Chat'}
            </Button>
          )}
        </div>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center space-x-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="More actions"
            >
              <Ellipsis className="size-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleNewChat}>
                <SquarePen className="mr-2 size-4" />
                New chat
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadChat}>
                <Download className="mr-2 size-4" />
                Download chat
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {layoutMode === 'inset' ? (
                    <>
                      <PanelRight className="mr-4 size-4 text-muted-foreground" />Inset
                    </>
                  ) : (
                    <>
                      <PictureInPicture2 className="mr-4 size-4 text-muted-foreground" />Floating
                    </>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={layoutMode} onValueChange={(value) => handleLayoutChange(value as 'floating' | 'inset')}>
                      <DropdownMenuRadioItem value="inset">
                        <PanelRight className="size-4 shrink-0 text-muted-foreground" />
                        Inset
                        <DropdownMenuShortcut>⌘↑</DropdownMenuShortcut>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="floating">
                        <PictureInPicture2 className="size-4 shrink-0 text-muted-foreground" />
                        Floating
                        <DropdownMenuShortcut>⌘↓</DropdownMenuShortcut>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 size-4" />
                    Clear chat
                    <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to clear the chat history? This action cannot be undone and will permanently remove all messages in this conversation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancelClear}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleClose}
          title="Close"
        >
          <X className="size-4 shrink-0" />
        </Button>
      </div>
    </div>
  )
} 