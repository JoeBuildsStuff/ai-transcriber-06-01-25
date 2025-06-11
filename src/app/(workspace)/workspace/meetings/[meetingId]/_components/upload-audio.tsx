'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileAudio, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DeepgramTranscription, DeepgramWord, FormattedTranscriptGroup } from '@/types'

interface UploadAudioProps {
  meetingId: string
  onUploadSuccess?: (fileInfo: { fileName: string; filePath: string; meetingId: string }) => void
}

export default function UploadAudio({ meetingId, onUploadSuccess }: UploadAudioProps) {

  const supabase = createClient()

  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = [
    'audio/mpeg',
    'audio/mp3', 
    'audio/wav',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/flac'
  ]

  const isValidAudioFile = (file: File): boolean => {
    // Check MIME type
    if (acceptedTypes.includes(file.type)) {
      return true
    }
    
    // Fallback: check file extension
    const extension = file.name.toLowerCase().split('.').pop()
    const validExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac']
    return validExtensions.includes(extension || '')
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 1) {
      toast.error('Please select only one audio file')
      return
    }

    const file = files[0]
    if (!file) return

    if (!isValidAudioFile(file)) {
      toast.error('Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, WebM, FLAC)')
      return
    }

    setSelectedFile(file)
    console.log('Audio file selected:', file.name, file.type, file.size)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isValidAudioFile(file)) {
      toast.error('Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, WebM, FLAC)')
      return
    }

    setSelectedFile(file)
    console.log('Audio file selected:', file.name, file.type, file.size)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setIsUploading(true)
    try {
      // Step 1: Upload file to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User must be authenticated to upload files')
      }
      
      const uploadPath = user.id
      const filePath = `${uploadPath}/${Date.now()}-${selectedFile.name}`
      
      console.log('Starting upload for:', selectedFile.name)
      
      const { error: uploadError } = await supabase.storage
        .from('ai-transcriber-audio')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })
  
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
  
      // Step 2: Update the existing meeting record with file information
      const { error: meetingUpdateError } = await supabase
        .schema('ai_transcriber')
        .from('meetings')
        .update({
          audio_file_path: filePath,
          original_file_name: selectedFile.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .eq('user_id', user.id) // Ensure user owns this meeting
  
      if (meetingUpdateError) {
        // If meeting update fails, clean up the uploaded file
        await supabase.storage
          .from('ai-transcriber-audio')
          .remove([filePath])
        
        throw new Error(`Failed to update meeting record: ${meetingUpdateError.message}`)
      }
  
      toast.success(`File "${selectedFile.name}" uploaded successfully! Starting transcription...`)
  
      // Step 3: Call transcription API
      console.log('Starting transcription for meeting:', meetingId)
      
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          originalFileName: selectedFile.name,
          meetingAt: new Date().toISOString(),
          meetingId: meetingId,
        }),
      })
  
      if (!transcribeResponse.ok || !transcribeResponse.body) {
        const errorBody = await transcribeResponse.text()
        throw new Error(`Transcription API request failed: ${errorBody}`)
      }
  
     // Step 3: Handle transcription streaming response
     const reader = transcribeResponse.body.getReader()
     const decoder = new TextDecoder()
     let accumulatedData = ''
     let transcriptionMeetingId: string | null = null
     let fullTranscriptionResponse: DeepgramTranscription | null = null
 
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
               
               if (eventData.meetingId && !transcriptionMeetingId) {
                 transcriptionMeetingId = eventData.meetingId
                 console.log("Received meetingId from transcription:", eventData.meetingId)
               }
               
               if (eventData.status) {
                 console.log('Transcription status:', eventData.status)
                 if (eventData.status === 'Processing completed') {
                   toast.success('Transcription completed! Starting summarization...')
                 }
               }
               
               if (eventData.results) {
                 console.log('Received transcription results')
                 fullTranscriptionResponse = eventData
               }
               
               if (eventData.error) {
                 throw new Error(`Transcription error: ${eventData.error}`)
               }
             } catch (e) {
               console.error('Error parsing transcription SSE:', e)
             }
           }
         }
       }
     }
 
     // Step 4: Format transcript and call summarization API
     if (fullTranscriptionResponse && fullTranscriptionResponse.results) {
       console.log('Formatting transcript and starting summarization...')
       
              // Format the transcript (same logic as in upload-audio-process.tsx)
       const words = fullTranscriptionResponse.results?.channels?.[0]?.alternatives?.[0]?.words
       let formattedTranscript: FormattedTranscriptGroup[] = []

       if (words && words.length > 0) {
         formattedTranscript = words.reduce((acc: FormattedTranscriptGroup[], word: DeepgramWord) => {
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
         }, [])
       }
 
       if (formattedTranscript.length > 0) {
         // Step 5: Call summarization API
         const summarizeResponse = await fetch('/api/summarize', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             transcript: formattedTranscript, 
             meetingId: transcriptionMeetingId || meetingId 
           }),
         })
 
         if (!summarizeResponse.ok || !summarizeResponse.body) {
           const errorBody = await summarizeResponse.text()
           throw new Error(`Summarization API request failed: ${errorBody}`)
         }
 
         // Step 6: Handle summarization streaming response
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
                     console.log('Summarization status:', eventData.message)
                     // You could update UI with status here
                   }
                   
                   if (eventData.status === 'Processing completed') {
                     toast.success('Summary generated successfully!')
                   }
                   
                   if (eventData.error) {
                     throw new Error(`Summarization error: ${eventData.error}`)
                   }
                 } catch (e) {
                   console.error('Error parsing summary SSE:', e)
                 }
               }
             }
           }
         }
       } else {
         console.log('No transcript to summarize')
         toast.success('Transcription completed, but no content to summarize')
       }
     }
 
     // Success callback
     if (onUploadSuccess) {
       onUploadSuccess({
         fileName: selectedFile.name,
         filePath: filePath,
         meetingId: transcriptionMeetingId || meetingId
       })
     }

     setSelectedFile(null)
     
   } catch (error) {
     console.error('Upload/transcription/summarization error:', error)
     const errorMessage = error instanceof Error ? error.message : 'Processing failed'
     toast.error(errorMessage)
   } finally {
     setIsUploading(false)
   }
 }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="mx-auto flex flex-col space-y-4 p-6 max-w-2xl">
      {!selectedFile ? (
        <Card
          className={`
            border-2 border-dashed p-8 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Upload Audio File</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop an audio file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: MP3, WAV, M4A, AAC, OGG, WebM, FLAC
              </p>
            </div>

            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-muted">
                <FileAudio className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Audio file'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload and Transcribe'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}