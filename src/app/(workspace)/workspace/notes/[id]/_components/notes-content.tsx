'use client'

import { useEffect } from "react"
import Tiptap from "@/components/tiptap/tiptap"
import { Badge } from "@/components/ui/badge"
import { useAutoSave } from "../_hooks/use-auto-save"

interface NotesContentProps {
  noteContent: string | null | undefined
  noteId: string
  onNoteIdChange?: (newNoteId: string) => void
}

export default function NotesContent({ noteContent, noteId, onNoteIdChange }: NotesContentProps) {
  // Helper function to check if an ID is temporary
  const isTemporaryId = (id: string) => id.startsWith('temp-') || id === ''

  const {
    content,
    saveStatus,
    hasUnsavedChanges,
    handleContentChange,
    handleManualSave,
    handleReset
  } = useAutoSave({
    noteId,
    initialContent: noteContent || '',
    onNoteCreated: onNoteIdChange,
    showToasts: !isTemporaryId(noteId)
  })

  // Don't show status badges if the note hasn't been created yet
  const shouldShowStatus = !isTemporaryId(noteId)

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleManualSave()
    }
    // Escape to discard changes
    if (e.key === 'Escape' && hasUnsavedChanges) {
      handleReset()
    }
  }

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <div className="relative h-full">
      <div onKeyDown={noteId ? handleKeyDown : undefined} className="h-full">
        <Tiptap
          content={content}
          onChange={(newContent: string) => handleContentChange(newContent)}
          showFixedMenu={true}
          showBubbleMenu={true}
        />
      </div>
      
      {noteId && shouldShowStatus && (
        <>
          <div className="absolute top-14 right-2 z-10 flex items-center gap-2">
            {hasUnsavedChanges && saveStatus === 'idle' && (
              <Badge variant="orange">
                Unsaved changes
              </Badge>
            )}
            {saveStatus === 'saving' && (
              <Badge variant="yellow">
                Auto-saving...
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="blue">
                Auto-saved
              </Badge>
            )}
            {saveStatus === 'error' && (
              <Badge variant="red">
                Error saving
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  )
}
