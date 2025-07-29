'use client'

import { Editor } from '@tiptap/react'
import { FileHandler } from '@tiptap/extension-file-handler'
import { FileNodeAttributes } from './file-node'

interface FileHandlerConfigProps {
  onFileDrop?: (files: File[]) => void
}

export const createFileHandlerConfig = ({ onFileDrop }: FileHandlerConfigProps = {}) => {
  const handleFiles = (currentEditor: Editor, files: File[]) => {
    if (onFileDrop) {
      onFileDrop(files)
    }
    
    files.forEach((file) => {
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

        if (file.type.startsWith('image/')) {
          previewType = 'image'
        } else if (
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
    })
  }

  return FileHandler.configure({
    onDrop: (currentEditor, files) => {
      handleFiles(currentEditor, files)
    },
    onPaste: (currentEditor, files) => {
      handleFiles(currentEditor, files)
    },
  })
}