'use client'

import { useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Upload, X, AudioLines, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from '@/lib/utils'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const supabase = createClient()

// --- Interfaces from useTranscription ---
interface WordDetail {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  speaker_confidence?: number;
  punctuated_word: string;
}

export interface TranscriptionData {
  results?: {
    channels?: {
      alternatives?: {
        words: WordDetail[];
        transcript: string;
        confidence: number;
      }[];
    }[];
  };
  meetingId?: string;
}

export interface FormattedTranscriptGroup {
  speaker: number;
  start: number;
  text: string;
}

interface FileWithPreview extends File {
  preview?: string
}

// --- New State Management ---
interface FileProcessingState {
  id: string
  file: FileWithPreview
  status: 'queued' | 'uploading' | 'transcribing' | 'summarizing' | 'complete' | 'error'
  summaryStatus: string
  meetingId?: string | null
  errorMessage?: string
}

export default function UploadAudioProcess({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileProcessingState[]>([])
  const router = useRouter()

  const updateFileState = useCallback((id: string, updates: Partial<FileProcessingState>) => {
    setFiles(currentFiles =>
      currentFiles.map(f => (f.id === id ? { ...f, ...updates } : f))
    )
  }, [])

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileProcessingState[] = acceptedFiles.map((file, index) => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
      return {
        id: `${Date.now()}-${file.name}-${index}`,
        file: fileWithPreview,
        status: 'queued',
        summaryStatus: 'Ready to process'
      }
    })

    setFiles(currentFiles => {
      const combined = [...currentFiles, ...newFiles]
      if (combined.length > 5) {
        toast.error("You can only upload a maximum of 5 files at a time.")
        return combined.slice(0, 5)
      }
      return combined
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/aac': ['.aac'],
      'audio/flac': ['.flac'],
      'audio/m4a': ['.m4a'],
      'audio/mp4': ['.mp4'],
      'audio/x-m4a': ['.m4a']
    },
    maxFiles: 5,
    maxSize: 100 * 1024 * 1024,
    onDrop
  })

  const uploadFile = useCallback(async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uploadPath = user?.id ? user.id : 'anonymous'
      const filePath = `${uploadPath}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from('ai-transcriber-audio')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error
      return filePath
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }, [])
  
  const transcribeAndSummarize = useCallback(async (fileState: FileProcessingState, filePath: string) => {
    const { id, file } = fileState
    
    // --- Transcription ---
    updateFileState(id, { status: 'transcribing', summaryStatus: "Initiating transcription..." })
    try {
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, originalFileName: file.name }),
      })

      if (!transcribeResponse.ok || !transcribeResponse.body) {
        const errorBody = await transcribeResponse.text()
        throw new Error(`Transcription API request failed: ${errorBody}`)
      }

      const reader = transcribeResponse.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedData = ''
      let meetingId: string | null = null
      let fullTranscriptionResponse: TranscriptionData | null = null;

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        accumulatedData += decoder.decode(value, { stream: true })
        
        let eventSeparatorIndex
        while ((eventSeparatorIndex = accumulatedData.indexOf('\n\n')) !== -1) {
          const eventDataString = accumulatedData.substring(0, eventSeparatorIndex)
          accumulatedData = accumulatedData.substring(eventSeparatorIndex + 2)

          if (eventDataString.startsWith('data:')) {
            const jsonString = eventDataString.substring(5).trim()
            if (jsonString) {
              try {
                const eventData = JSON.parse(jsonString)
                if (eventData.meetingId && !meetingId) {
                  meetingId = eventData.meetingId
                  updateFileState(id, { meetingId })
                }
                if(eventData.status) {
                    updateFileState(id, { summaryStatus: eventData.status })
                }
                if (eventData.results) {
                  fullTranscriptionResponse = eventData
                }
              } catch (e) {
                console.error('Error parsing transcription SSE:', e)
              }
            }
          }
        }
      }

      if (!meetingId) {
        throw new Error("Did not receive a meeting ID from the transcription process.")
      }

      if (!fullTranscriptionResponse || !fullTranscriptionResponse.results) {
          throw new Error("Did not receive transcription results from the stream.");
      }

      // --- Format Transcript ---
      updateFileState(id, { summaryStatus: 'Formatting transcript...' })
      const words = fullTranscriptionResponse.results?.channels?.[0]?.alternatives?.[0]?.words
      let formattedTranscript: FormattedTranscriptGroup[] = []

      if (words && words.length > 0) {
        formattedTranscript = words.reduce((acc: FormattedTranscriptGroup[], word: WordDetail) => {
            const lastGroup = acc[acc.length - 1]
            if (lastGroup && word.speaker !== undefined && lastGroup.speaker === word.speaker) {
                lastGroup.text += ` ${word.punctuated_word}`
            } else {
                acc.push({
                    speaker: word.speaker === undefined ? -1 : word.speaker,
                    start: word.start,
                    text: word.punctuated_word,
                })
            }
            return acc
        }, [] as FormattedTranscriptGroup[])
      } else {
        console.warn(`No words found in transcription for file ${file.name} to format.`)
      }

      // --- Summarization ---
      updateFileState(id, { status: 'summarizing', summaryStatus: 'Generating summary...' })

      const summarizeResponse = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: formattedTranscript, meetingId }),
      })

      if (!summarizeResponse.ok || !summarizeResponse.body) {
          const errorBody = await summarizeResponse.text()
          throw new Error(`Summarization API request failed: ${errorBody}`)
      }
      
      const summaryReader = summarizeResponse.body.getReader()
      let summaryAccumulatedData = ''

      while (true) {
        const { value, done } = await summaryReader.read()
        if (done) break
        summaryAccumulatedData += decoder.decode(value, { stream: true })
        
        let eventSeparatorIndex
        while ((eventSeparatorIndex = summaryAccumulatedData.indexOf('\n\n')) !== -1) {
          const eventDataString = summaryAccumulatedData.substring(0, eventSeparatorIndex)
          summaryAccumulatedData = summaryAccumulatedData.substring(eventSeparatorIndex + 2)

          if (eventDataString.startsWith('data:')) {
            const jsonString = eventDataString.substring(5).trim()
            if (jsonString) {
              try {
                const eventData = JSON.parse(jsonString)
                if (eventData.message) {
                  updateFileState(id, { summaryStatus: eventData.message })
                }
                 if (eventData.status === 'Processing completed') {
                   updateFileState(id, { status: 'complete', summaryStatus: 'Processing complete!' })
                }
              } catch (e) {
                console.error('Error parsing summary SSE:', e)
              }
            }
          }
        }
      }
      updateFileState(id, { status: 'complete', summaryStatus: 'Processing complete!' })

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      updateFileState(id, { status: 'error', errorMessage })
    }
  }, [updateFileState])


  const processFiles = useCallback(async () => {
    const filesToProcess = files.filter(f => f.status === 'queued')
    if (filesToProcess.length === 0) return

    filesToProcess.forEach(async (fileState) => {
      try {
        updateFileState(fileState.id, { status: 'uploading', summaryStatus: 'Uploading file...' })
        const filePath = await uploadFile(fileState.file)
        
        await transcribeAndSummarize(fileState, filePath)
      } catch (error) {
        console.error('File processing failed during upload:', error)
        const errorMessage = error instanceof Error ? error.message : "Upload failed"
        updateFileState(fileState.id, { status: 'error', errorMessage })
      }
    })
  }, [files, uploadFile, transcribeAndSummarize, updateFileState])

  const reset = useCallback(() => {
    files.forEach(file => {
      if(file.file.preview) URL.revokeObjectURL(file.file.preview)
    })
    setFiles([])
  }, [files])

  const removeFile = useCallback((id: string) => {
    setFiles(currentFiles => {
      const fileToRemove = currentFiles.find(f => f.id === id)
      if (fileToRemove?.file.preview) {
        URL.revokeObjectURL(fileToRemove.file.preview)
      }
      return currentFiles.filter(f => f.id !== id)
    })
  }, [])

  const getOverallStatus = () => {
    const statuses = files.map(f => f.status)
    if (files.length === 0 || statuses.every(s => s === 'queued')) return 'upload'
    if (statuses.every(s => s === 'complete' || s === 'error')) return 'complete'
    if (statuses.some(s => s === 'summarizing')) return 'summarize'
    if (statuses.some(s => s === 'transcribing' || s === 'uploading')) return 'transcribe'
    return 'upload'
  }
  const overallStatus = getOverallStatus()

  const getCurrentStep = () => {
    switch (overallStatus) {
      case 'upload': return 1
      case 'transcribe': return 2
      case 'summarize': return 3
      case 'complete': return 4
      default: return 1
    }
  }

  const steps = [
    {
      step: 1,
      title: "Upload",
      description: "Upload",
    },
    {
      step: 2,
      title: "Transcribe",
      description: "Transcribe",
    },
    {
      step: 3,
      title: "Summarize",
      description: "Summarize",
    },
    {
      step: 4,
      title: "Review",
      description: "Review",
    },
  ]

  const isProcessing = files.some(f => ['uploading', 'transcribing', 'summarizing'].includes(f.status))



    return (
        <Dialog>
        <DialogTrigger asChild>
             {children}
        </DialogTrigger>
        <DialogContent>
            <DialogHeader className="">

                {/* Title and description */}
                <DialogTitle>Upload Audio</DialogTitle>
                <DialogDescription>Upload your audio file to begin the transcription process.</DialogDescription>
                 
                 {/* Content */}
                <div className="flex flex-col items-center justify-center space-y-4 mt-4">
            

    <div className="w-full mx-auto space-y-10 mt-5">


      {/* Stepper */}
      <Stepper value={getCurrentStep()}>
        {steps.map(({ step, title }) => (
          <StepperItem
            key={step}
            step={step}
            className="relative flex-1 flex-col!"
          >
            <StepperTrigger className="flex-col gap-3 rounded">
              <StepperIndicator />
              <div className="">
                <StepperTitle className={cn(step !== getCurrentStep() && "text-muted-foreground")}>{title}</StepperTitle>
              </div>
            </StepperTrigger>
            {step < steps.length && (
              <StepperSeparator className="absolute inset-x-0 top-3 left-[calc(50%+0.75rem+0.125rem)] -order-1 m-0 -translate-y-1/2 group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:flex-none" />
            )}
          </StepperItem>
        ))}
      </Stepper>

      {/* Upload & File List */}
      <div className="space-y-4">
        {files.length < 5 && overallStatus === 'upload' && (
          <div
            {...getRootProps({
              className: cn(
                'border-1 border-dashed border-border rounded-lg p-8 text-center bg-card transition-colors duration-300 cursor-pointer',
                isDragActive && 'border-primary bg-primary/10'
              ),
            })}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-y-4">
              <Upload size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm">Upload Audio Files</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Drag and drop or click to select up to 5 audio files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports MP3, WAV, OGG, AAC, FLAC, M4A (max 100MB)
                </p>
              </div>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((fs) => (
              <div key={fs.id} className="flex items-start gap-3 p-3 border border-border rounded-md">
                <AudioLines size={20} />
                <div className="flex-1 text-left space-y-1">
                  <p className="text-sm font-medium">{fs.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fs.file.size / (1024 * 1024)).toFixed(2)} MB - <span className="capitalize">{fs.summaryStatus}</span>
                  </p>
                </div>

                {fs.status === 'queued' && (
                  <Button size="icon" variant="ghost" onClick={() => removeFile(fs.id)}><X size={16} /></Button>
                )}

                {['uploading', 'transcribing', 'summarizing'].includes(fs.status) && (
                  <Loader2 size={20} className="animate-spin" />
                )}

                {fs.status === 'complete' && fs.meetingId && (
                  <Button size="sm" variant="ghost" onClick={() => router.push(`/workspace/meetings/${fs.meetingId}`)}>
                    Review <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                {fs.status === 'error' && (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-destructive truncate" title={fs.errorMessage}>{fs.errorMessage}</span>
                     <Button size="icon" variant="ghost" onClick={() => removeFile(fs.id)}><X size={16} /></Button>
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {files.length > 0 && !isProcessing && overallStatus !== 'complete' && (
                <div className="space-y-4 text-end">
          <Button onClick={processFiles} variant="default" className="">
            Start Processing {files.filter(f => f.status === 'queued').length} File(s)
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          </div>
        )}
      </div>

      {/* Global Status/Actions */}
      {overallStatus === 'complete' && (
        <div className="space-y-4 text-start">
          <Button onClick={reset} variant="outline" className="">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Process More Files
          </Button>
        </div>
      )}
    </div>

                </div>
            </DialogHeader>
        </DialogContent>
    </Dialog>
    )
}