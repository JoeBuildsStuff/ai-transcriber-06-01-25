import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseSummaryAutoSaveOptions {
  /** The ID of the meeting */
  meetingId: string
  /** Initial summary content */
  initialSummary: Record<string, string>
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceDelay?: number
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean
}

export function useSummaryAutoSave({
  meetingId,
  initialSummary,
  debounceDelay = 1000,
  showToasts = true
}: UseSummaryAutoSaveOptions) {
  const [summary, setSummary] = useState(initialSummary)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedSummary, setLastSavedSummary] = useState(initialSummary)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  const justSavedRef = useRef(false)

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(summary) !== JSON.stringify(lastSavedSummary)

  // Save function that updates the meeting summary
  const saveSummary = useCallback(async (newSummary: Record<string, string>) => {
    const client = createClient()
    
    try {
      // Update the meeting's summary_jsonb field
      const { error } = await client
        .from("meetings")
        .update({ 
          summary_jsonb: newSummary,
          summary: newSummary.executive_summary || newSummary.discussion_outline || ''
        })
        .eq("id", meetingId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving summary:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [meetingId])

  // Debounced save function
  const debouncedSave = useCallback(async (newSummary: Record<string, string>) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current || JSON.stringify(newSummary) === JSON.stringify(lastSavedSummary)) {
        return
      }

      isSavingRef.current = true
      setSaveStatus('saving')

      try {
        const result = await saveSummary(newSummary)
        
        if (result.success) {
          setSaveStatus('saved')
          setLastSavedSummary(newSummary)
          justSavedRef.current = true
          
          // Auto-hide the saved status after 2 seconds
          setTimeout(() => {
            setSaveStatus('idle')
            justSavedRef.current = false
          }, 2000)
        } else {
          console.error('Error auto-saving summary:', result.error)
          setSaveStatus('error')
          if (showToasts) {
            toast.error('Failed to auto-save summary', {
              description: result.error
            })
          }
        }
      } catch (error) {
        console.error('Unexpected error auto-saving summary:', error)
        setSaveStatus('error')
        if (showToasts) {
          toast.error('Failed to auto-save summary', {
            description: 'An unexpected error occurred'
          })
        }
      } finally {
        isSavingRef.current = false
      }
    }, debounceDelay)
  }, [saveSummary, lastSavedSummary, debounceDelay, showToasts])

  // Handle section content changes with auto-save
  const handleSectionChange = useCallback((sectionKey: string, newContent: string) => {
    const newSummary = { ...summary, [sectionKey]: newContent }
    setSummary(newSummary)
    
    // Reset save status when user starts making changes
    if (saveStatus === 'saved' || saveStatus === 'error') {
      setSaveStatus('idle')
    }

    // Reset just saved flag when user starts making changes
    justSavedRef.current = false

    // Trigger auto-save
    debouncedSave(newSummary)
  }, [summary, debouncedSave, saveStatus])

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
      const result = await saveSummary(summary)
      
      if (result.success) {
        setSaveStatus('saved')
        setLastSavedSummary(summary)
        justSavedRef.current = true
        if (showToasts) {
          toast.success('Summary saved successfully')
        }
        
        // Auto-hide the saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle')
          justSavedRef.current = false
        }, 3000)
      } else {
        console.error('Error saving summary:', result.error)
        setSaveStatus('error')
        if (showToasts) {
          toast.error('Failed to save summary', {
            description: result.error
          })
        }
      }
    } catch (error) {
      console.error('Unexpected error saving summary:', error)
      setSaveStatus('error')
      if (showToasts) {
        toast.error('Failed to save summary', {
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
    
    setSummary(lastSavedSummary)
    setSaveStatus('idle')
    if (showToasts) {
      toast.info('Changes discarded')
    }
  }, [lastSavedSummary, showToasts])

  // Update summary when prop changes, but only if we're not in the middle of saving or just saved
  useEffect(() => {
    if (JSON.stringify(initialSummary) !== JSON.stringify(lastSavedSummary) && !isSavingRef.current && !justSavedRef.current) {
      setSummary(initialSummary)
      setLastSavedSummary(initialSummary)
      setSaveStatus('idle')
      
      // Clear any pending auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [initialSummary, lastSavedSummary])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    summary,
    saveStatus,
    hasUnsavedChanges,
    handleSectionChange,
    handleManualSave,
    handleReset,
    isSaving: isSavingRef.current
  }
}