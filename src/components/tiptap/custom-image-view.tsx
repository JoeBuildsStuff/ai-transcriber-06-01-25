'use client'

import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { ImageIcon, AlertCircle } from 'lucide-react'
import Spinner from '../ui/spinner'

export const CustomImageView = ({ node }: ReactNodeViewProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const src = node.attrs.src

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (!src) {
        setError('No image source provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // If it's already a full URL, use it directly
        if (src.startsWith('http')) {
          setImageUrl(src)
          setIsLoading(false)
          return
        }
        
        // For file paths, use our unified file API
        const apiUrl = `/api/files/serve?path=${encodeURIComponent(src)}`
        
        const response = await fetch(apiUrl)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to fetch file: ${response.status} - ${errorData.error || 'Unknown error'}`)
        }
        
        const data = await response.json()
        if (data.fileUrl) {
          setImageUrl(data.fileUrl)
        } else {
          throw new Error('Invalid response from file API')
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching image URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to load image')
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [src])

  if (isLoading) {
    return (
      <NodeViewWrapper>
        <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
          <div className="text-center flex flex-col items-center">
          <Spinner className="stroke-neutral-400 stroke-5"/>
            <p className="text-sm text-muted-foreground">Loading image...</p>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load image</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  if (!imageUrl) {
    return (
      <NodeViewWrapper>
        <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No image available</p>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div className="my-4">
        <img
          src={imageUrl}
          alt=""
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '500px' }}
        />
      </div>
    </NodeViewWrapper>
  )
}
