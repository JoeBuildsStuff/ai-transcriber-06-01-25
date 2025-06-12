'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateMeetingNotes } from "@/actions/meetings"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Notes</CardTitle>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-destructive">
                Error saving
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          onKeyDown={handleKeyDown}
          placeholder="Add your notes about this meeting..."
          className="min-h-[120px] resize-y"
        />
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+S</kbd> to save or{' '}
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Esc</kbd> to discard changes
          </p>
          
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                variant="outline"
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
              className={cn(
                hasUnsavedChanges && "bg-primary",
                saveStatus === 'saved' && "bg-green-600 hover:bg-green-700"
              )}
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveStatus === 'saving' ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}