'use client'

import { Editor } from '@tiptap/react'
import { FileHandler } from '@tiptap/extension-file-handler'
import { FileNodeAttributes } from './file-node'
import { uploadImageToSupabase } from './supabase-image-upload'

interface FileHandlerConfigProps {
  onFileDrop?: (files: File[]) => void
  imageUploadConfig?: {
    supabaseBucket?: string
    pathPrefix?: string
    maxFileSize?: number
    allowedMimeTypes?: string[]
  }
}

export const createFileHandlerConfig = ({ onFileDrop, imageUploadConfig }: FileHandlerConfigProps = {}) => {
  const handleFiles = async (currentEditor: Editor, files: File[], pos?: number) => {
    if (onFileDrop) {
      onFileDrop(files)
    }
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Handle image files - upload to Supabase
        try {
          const result = await uploadImageToSupabase(file, {
            bucket: imageUploadConfig?.supabaseBucket || 'ai-transcriber-images',
            pathPrefix: imageUploadConfig?.pathPrefix || 'notes',
            maxFileSize: imageUploadConfig?.maxFileSize,
            allowedMimeTypes: imageUploadConfig?.allowedMimeTypes
          })

          if (result.success && result.url) {
            // Insert image using the standard Image node
            const insertPos = pos ?? currentEditor.state.selection.anchor
            currentEditor.chain()
              .insertContentAt(insertPos, {
                type: 'image',
                attrs: {
                  src: result.url
                }
              })
              .focus()
              .run()
          } else {
            console.error('Image upload failed:', result.error)
            // Optionally show error to user
          }
        } catch (error) {
          console.error('Error uploading image:', error)
        }
      } else {
        // Handle non-image files
        const reader = new FileReader()
        
        reader.onload = () => {
          const fileData = reader.result as string
          
          // Determine preview type and attributes
          let previewType: FileNodeAttributes['previewType'] = 'file'
          const attributes: Partial<FileNodeAttributes> = {
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData,
            uploadStatus: 'completed'
          }

          if (
            file.type === 'text/plain' || 
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            previewType = 'document'
          }

          attributes.previewType = previewType

          // Insert the file node
          currentEditor.chain().focus().insertContent({
            type: 'fileNode',
            attrs: attributes,
          }).run()
        }
        
        reader.readAsDataURL(file)
      }
    }
  }

  return FileHandler.configure({
    onDrop: (currentEditor, files, pos) => {
      handleFiles(currentEditor, files, pos)
    },
    onPaste: (currentEditor, files) => {
      handleFiles(currentEditor, files)
    },
  })
}