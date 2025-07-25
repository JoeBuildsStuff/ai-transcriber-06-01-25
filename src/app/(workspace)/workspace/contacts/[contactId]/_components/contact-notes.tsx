'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { updateContactNotes } from "../../_lib/actions"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw, Check } from "lucide-react"
import Tiptap from "@/components/tiptap/tiptap"
import { Badge } from "@/components/ui/badge"

interface ContactNotesProps {
  contactNotes: string | null | undefined
  contactId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ContactNotes({ contactNotes, contactId }: ContactNotesProps) {
  const [notes, setNotes] = useState(contactNotes || '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedNotes, setLastSavedNotes] = useState(contactNotes || '')

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
      const result = await updateContactNotes(contactId, notes)
      
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
    if (contactNotes !== lastSavedNotes) {
      setNotes(contactNotes || '')
      setLastSavedNotes(contactNotes || '')
      setSaveStatus('idle')
    }
  }, [contactNotes])

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
    <div className="relative h-full ">
        <div onKeyDown={handleKeyDown} className="h-full">
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