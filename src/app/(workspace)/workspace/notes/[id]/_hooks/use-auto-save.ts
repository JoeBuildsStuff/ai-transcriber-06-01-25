import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseContentAutoSaveOptions {
  /** The ID of the note (can be temporary) */
  noteId: string
  /** Initial content */
  initialContent: string
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceDelay?: number
  /** Callback when note is created */
  onNoteCreated?: (noteId: string) => void
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean
}

// Helper function to check if an ID is temporary
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-') || id === ''
}

export function useAutoSave({
  noteId,
  initialContent,
  debounceDelay = 1000,
  onNoteCreated,
  showToasts = true
}: UseContentAutoSaveOptions) {
  const [content, setContent] = useState(initialContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedContent, setLastSavedContent] = useState(initialContent)
  const [realNoteId, setRealNoteId] = useState<string | null>(isTemporaryId(noteId) ? null : noteId)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  const justSavedRef = useRef(false)

  // Check if there are unsaved changes
  const hasUnsavedChanges = content !== lastSavedContent

  // Update real note ID when prop changes
  useEffect(() => {
    if (!isTemporaryId(noteId)) {
      setRealNoteId(noteId)
    }
  }, [noteId])

  // Save function that can create or update notes
  const saveContent = useCallback(async (newContent: string) => {
    const client = createClient()
    
    try {
      // If it's a temporary ID and we don't have a real ID yet, create the note
      if (isTemporaryId(noteId) && !realNoteId) {
        // Create the note with the content
        const { data, error } = await client
          .from("notes")
          .insert({ content: newContent })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Update the real ID
        setRealNoteId(data.id)
        onNoteCreated?.(data.id)
        return { success: true, data: data.id }
      }

      // Use the real ID for updates
      const targetId = realNoteId || noteId
      
      if (!targetId) {
        throw new Error('No valid note ID available')
      }

      const { error } = await client
        .from("notes")
        .update({ content: newContent })
        .eq("id", targetId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving content:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [noteId, realNoteId, onNoteCreated])

  // Debounced save function
  const debouncedSave = useCallback(async (newContent: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current || newContent === lastSavedContent) {
        return
      }

      isSavingRef.current = true
      setSaveStatus('saving')

      try {
        const result = await saveContent(newContent)
        
        if (result.success) {
          setSaveStatus('saved')
          setLastSavedContent(newContent)
          justSavedRef.current = true
          
          // Auto-hide the saved status after 2 seconds
          setTimeout(() => {
            setSaveStatus('idle')
            justSavedRef.current = false
          }, 2000)
        } else {
          console.error('Error auto-saving content:', result.error)
          setSaveStatus('error')
          if (showToasts) {
            toast.error('Failed to auto-save content', {
              description: result.error
            })
          }
        }
      } catch (error) {
        console.error('Unexpected error auto-saving content:', error)
        setSaveStatus('error')
        if (showToasts) {
          toast.error('Failed to auto-save content', {
            description: 'An unexpected error occurred'
          })
        }
      } finally {
        isSavingRef.current = false
      }
    }, debounceDelay)
  }, [saveContent, lastSavedContent, debounceDelay, showToasts])

  // Handle content changes with auto-save
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    
    // Reset save status when user starts making changes
    if (saveStatus === 'saved' || saveStatus === 'error') {
      setSaveStatus('idle')
    }

    // Reset just saved flag when user starts making changes
    justSavedRef.current = false

    // Trigger auto-save
    debouncedSave(newContent)
  }, [debouncedSave, saveStatus])

  // Manual save function (for button click)
  const handleManualSave = async () => {
    if (!hasUnsavedChanges || isSavingRef.current) {
      if (!hasUnsavedChanges && showToasts) {
        toast.info('No changes to save')
      }
      return
    }

    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    isSavingRef.current = true
    setSaveStatus('saving')
    
    try {
      const result = await saveContent(content)
      
      if (result.success) {
        setSaveStatus('saved')
        setLastSavedContent(content)
        justSavedRef.current = true
        if (showToasts) {
          toast.success('Content saved successfully')
        }
        
        // Auto-hide the saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle')
          justSavedRef.current = false
        }, 3000)
      } else {
        console.error('Error saving content:', result.error)
        setSaveStatus('error')
        if (showToasts) {
          toast.error('Failed to save content', {
            description: result.error
          })
        }
      }
    } catch (error) {
      console.error('Unexpected error saving content:', error)
      setSaveStatus('error')
      if (showToasts) {
        toast.error('Failed to save content', {
          description: 'An unexpected error occurred'
        })
      }
    } finally {
      isSavingRef.current = false
    }
  }

  // Handle reset/discard changes
  const handleReset = useCallback(() => {
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    setContent(lastSavedContent)
    setSaveStatus('idle')
    if (showToasts) {
      toast.info('Changes discarded')
    }
  }, [lastSavedContent, showToasts])

  // Update content when prop changes, but only if we're not in the middle of saving or just saved
  useEffect(() => {
    if (initialContent !== lastSavedContent && !isSavingRef.current && !justSavedRef.current) {
      setContent(initialContent)
      setLastSavedContent(initialContent)
      setSaveStatus('idle')
      
      // Clear any pending auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [initialContent, lastSavedContent])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    content,
    saveStatus,
    hasUnsavedChanges,
    handleContentChange,
    handleManualSave,
    handleReset,
    isSaving: isSavingRef.current,
    realNoteId
  }
} 