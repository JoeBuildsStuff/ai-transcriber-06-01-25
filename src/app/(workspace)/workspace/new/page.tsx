'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'

import { useAuth } from "@/contexts/auth-context"


export default function New() {

    const { user } = useAuth()

    console.log(user?.id)

  const maxFileSize = user ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB if user, 10MB if no user
  const uploadPath = user?.id ? user.id : 'anonymous';

  console.log(uploadPath)

  const props = useSupabaseUpload({
    bucketName: 'ai-transcriber-audio', // Replace with your actual bucket name
    path: uploadPath, // Optional: specify a path within the bucket
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'],
    maxFiles: 5, // Allow up to 5 audio files
    maxFileSize: maxFileSize,
  })

  return (
    <div className="p-4 md:p-8">
      <div className="w-full max-w-xl mx-auto">
        <Dropzone {...props}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      </div>
    </div>
  )
}