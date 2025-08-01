'use client'

import { formatDistanceToNow } from 'date-fns'
import { Trash2, ChevronRight, MessagesSquare, SquarePen } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { useChatStore } from '@/lib/chat/chat-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function ChatHistory() {
  const { 
    getSessions, 
    currentSessionId, 
    switchToSession, 
    deleteSession, 
    createSession, 
    setShowHistory 
  } = useChatStore()
  
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  const sessions = getSessions()

  const handleSessionClick = (sessionId: string) => {
    switchToSession(sessionId)
  }

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setSessionToDelete(sessionId)
  }

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete)
      setSessionToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setSessionToDelete(null)
  }

  const handleNewChat = () => {
    createSession()
  }

  const handleBackToChat = () => {
    setShowHistory(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-1">
        <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            title="New chat"
          >
            <SquarePen className="size-4" strokeWidth={1.5}/>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleBackToChat}
            title="Back to current chat"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessagesSquare className="size-8 text-muted-foreground mb-2" strokeWidth={1.5}/>
              <p className="text-sm text-muted-foreground mb-4">No chat history yet</p>
              <Button className="flex items-center" variant="outline" size="sm" onClick={handleNewChat}>
                <span>Start chat</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group relative flex flex-col p-2 rounded-lg cursor-pointer",
                    "hover:bg-accent/50 transition-colors",
                    "border border-transparent",
                    session.id === currentSessionId && "bg-accent border-border"
                  )}
                  onClick={() => handleSessionClick(session.id)}
                >
                  {/* Session Title */}
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-medium text-sm line-clamp-2 flex-1",
                      session.id === currentSessionId && "text-accent-foreground"
                    )}>
                      {session.title}
                    </h3>
                    
                    {/* Delete Button with AlertDialog */}
                    <AlertDialog open={sessionToDelete === session.id} onOpenChange={(open) => !open && handleCancelDelete()}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "opacity-0 group-hover:opacity-100",
                            "transition-opacity shrink-0"
                          )}
                          onClick={(e) => handleDeleteClick(e, session.id)}
                          title="Delete chat"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this chat? This action cannot be undone and will permanently remove all messages in this conversation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })} >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Session Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 