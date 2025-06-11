'use client'

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { updateMeetingNotes } from "@/actions/meetings"
import { toast } from "sonner"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
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

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      
      return (notesToSave: string) => {
        clearTimeout(timeoutId)
        setSaveStatus('saving')
        
        timeoutId = setTimeout(async () => {
          try {
            const result = await updateMeetingNotes(meetingId, notesToSave)
            
            if (result.error) {
              console.error('Error saving notes:', result.error)
              setSaveStatus('error')
              toast.error('Failed to save notes', {
                description: result.error
              })
            } else {
              setSaveStatus('saved')
              setLastSavedNotes(notesToSave)
              // Auto-hide the saved status after 2 seconds
              setTimeout(() => {
                setSaveStatus('idle')
              }, 2000)
            }
          } catch (error) {
            console.error('Unexpected error saving notes:', error)
            setSaveStatus('error')
            toast.error('Failed to save notes', {
              description: 'An unexpected error occurred'
            })
          }
        }, 2000) // 2 second delay
      }
    })(),
    [meetingId]
  )

  // Handle text changes
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value
    setNotes(newNotes)
    
    // Only trigger save if notes actually changed from last saved version
    if (newNotes !== lastSavedNotes) {
      debouncedSave(newNotes)
    } else {
      setSaveStatus('idle')
    }
  }

  // Update local state when prop changes (e.g., from external updates)
  useEffect(() => {
    if (userNotes !== notes && saveStatus === 'idle') {
      setNotes(userNotes || '')
      setLastSavedNotes(userNotes || '')
    }
  }, [userNotes, notes, saveStatus])

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'saved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return 'Saved'
      case 'error':
        return 'Error saving'
      default:
        return notes !== lastSavedNotes ? 'Unsaved changes' : ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Notes</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {getSaveStatusIcon()}
            <span className={cn(
              "text-muted-foreground",
              saveStatus === 'error' && "text-destructive",
              saveStatus === 'saved' && "text-green-600"
            )}>
              {getSaveStatusText()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Add your notes about this meeting..."
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Changes are automatically saved as you type.
        </p>
      </CardContent>
    </Card>
  )
}