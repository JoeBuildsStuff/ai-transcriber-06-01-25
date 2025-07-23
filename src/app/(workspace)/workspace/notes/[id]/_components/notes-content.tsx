'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { updateNote } from "../../_lib/actions"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw, Check } from "lucide-react"
import Tiptap from "@/components/tiptap/tiptap"
import { Badge } from "@/components/ui/badge"

interface NotesContentProps {
  noteContent: string | null | undefined
  noteId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function NotesContent({ noteContent, noteId }: NotesContentProps) {
  const [content, setContent] = useState(noteContent || '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedContent, setLastSavedContent] = useState(noteContent || '')

  // Check if there are unsaved changes
  const hasUnsavedChanges = content !== lastSavedContent

  // Handle text changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    // Reset save status when user starts typing
    if (saveStatus === 'saved' || saveStatus === 'error') {
      setSaveStatus('idle')
    }
  }

  // Handle save button click
  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast.info('No changes to save')
      return
    }

    setSaveStatus('saving')
    
    try {
      const result = await updateNote(noteId, { content })
      
      if (result.success) {
        setSaveStatus('saved')
        setLastSavedContent(content)
        toast.success('Note content saved successfully')
        
        // Auto-hide the saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle')
        }, 3000)
      } else {
        console.error('Error saving note content:', result.error)
        setSaveStatus('error')
        toast.error('Failed to save note content', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Unexpected error saving note content:', error)
      setSaveStatus('error')
      toast.error('Failed to save note content', {
        description: 'An unexpected error occurred'
      })
    }
  }

  // Handle reset/discard changes
  const handleReset = () => {
    setContent(lastSavedContent)
    setSaveStatus('idle')
    toast.info('Changes discarded')
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
    // Escape to discard changes
    if (e.key === 'Escape' && hasUnsavedChanges) {
      handleReset()
    }
  }

  // Only update local state when prop changes and we're not actively editing
  useEffect(() => {
    if (noteContent !== lastSavedContent) {
      setContent(noteContent || '')
      setLastSavedContent(noteContent || '')
      setSaveStatus('idle')
    }
  }, [noteContent])

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
          onChange={handleContentChange}
          showFixedMenu={true}
          showBubbleMenu={true}
        />
      </div>
      
      {noteId && (
        <>
          <div className="flex items-center justify-end">
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button
                  variant="red"
                  size="sm"
                  onClick={handleReset}
                  disabled={saveStatus === 'saving'}
                >
                  <RotateCcw className="size-4 shrink-0" />
                  Discard
                </Button>
              )}
              
              <Button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !hasUnsavedChanges}
                size="sm"
                variant={saveStatus === 'saved' ? 'blue' : 'green'}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <Save className="size-4 shrink-0" />
                )}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Content'}
              </Button>
            </div>
          </div>
          
          <div className="absolute top-14 right-2 z-10 flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="orange">
                Unsaved changes
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="blue">
                Saved
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
