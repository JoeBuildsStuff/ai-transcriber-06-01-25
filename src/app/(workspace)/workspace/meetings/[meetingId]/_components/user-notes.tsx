'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { updateMeetingNotes } from "@/actions/meetings"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw, Check } from "lucide-react"
import Tiptap from "@/components/tiptap"
import { Badge } from "@/components/ui/badge"

interface UserNotesProps {
  userNotes: string | null | undefined
  meetingId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function UserNotes({ userNotes, meetingId }: UserNotesProps) {
  const [notes, setNotes] = useState(userNotes || '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedNotes, setLastSavedNotes] = useState(userNotes || '')

  // Check if there are unsaved changes
  const hasUnsavedChanges = notes !== lastSavedNotes

  // Handle text changes
  const handleNotesChange = (content: string) => {
    setNotes(content)
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
      const result = await updateMeetingNotes(meetingId, notes)
      
      if (result.error) {
        console.error('Error saving notes:', result.error)
        setSaveStatus('error')
        toast.error('Failed to save notes', {
          description: result.error
        })
      } else {
        setSaveStatus('saved')
        setLastSavedNotes(notes)
        toast.success('Notes saved successfully')
        
        // Auto-hide the saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle')
        }, 3000)
      }
    } catch (error) {
      console.error('Unexpected error saving notes:', error)
      setSaveStatus('error')
      toast.error('Failed to save notes', {
        description: 'An unexpected error occurred'
      })
    }
  }

  // Handle reset/discard changes
  const handleReset = () => {
    setNotes(lastSavedNotes)
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
    if (userNotes !== lastSavedNotes) {
      setNotes(userNotes || '')
      setLastSavedNotes(userNotes || '')
      setSaveStatus('idle')
    }
  }, [userNotes]) // Remove notes and saveStatus from dependencies

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
    <div className="relative h-full bg-card rounded-md border border-border">
        <div onKeyDown={handleKeyDown}>
          <Tiptap
            content={notes}
            onChange={handleNotesChange}
          />
        </div>
        
        <div className="flex items-center justify-end">

          
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                variant="red"
                size="sm"
                onClick={handleReset}
                disabled={saveStatus === 'saving'}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Notes'}
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
    </div>
  )
}