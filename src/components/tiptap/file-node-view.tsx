'use client'

import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { 
  Download, 
  File, 
  X,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { FileNodeAttributes } from './file-node'

export const FileNodeView = ({ node, updateAttributes, deleteNode }: ReactNodeViewProps) => {
  const attrs = node.attrs as FileNodeAttributes
  const [error, setError] = useState<string | null>(null)

  const handleDownload = () => {
    if (!attrs.fileData) return
    
    try {
      const byteCharacters = atob(attrs.fileData.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: attrs.fileType })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attrs.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      setError('Download failed')
    }
  }

  const handleOpenInBrowser = () => {
    if (!attrs.fileData) return
    
    try {
      const byteCharacters = atob(attrs.fileData.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: attrs.fileType })
      
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Note: We don't revoke the URL immediately as the browser needs it
      // The browser will handle cleanup when the tab is closed
    } catch (err) {
      console.error('Open in browser failed:', err)
      setError('Failed to open file in browser')
    }
  }

  const handleDelete = () => {
    deleteNode()
  }

  // Handle upload status
  useEffect(() => {
    if (attrs.uploadStatus === 'pending') {
      // Simulate upload completion
      setTimeout(() => {
        updateAttributes({ uploadStatus: 'completed' })
      }, 1000)
    }
  }, [attrs.uploadStatus, updateAttributes])

  return (
    <NodeViewWrapper>
      <div className="my-4 max-w-4xl">
        <Card className="overflow-hidden px-2 m-0 py-1 rounded-lg">
          {/* Header with file info and actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate text">{attrs.filename}</span>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center">
                {attrs.uploadStatus === 'uploading' && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {attrs.uploadStatus === 'error' && (
                  <AlertCircle className="size-4 text-destructive" />
                )}
                {error && (
                  <span className="text-xs text-destructive mr-2">{error}</span>
                )}
                {attrs.fileData && (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleOpenInBrowser}>
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload}>
                      <Download className="size-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
        </Card>
      </div>
    </NodeViewWrapper>
  )
}