import { ImageUploadResult } from './types'

export interface SupabaseImageUploadOptions {
  bucket: string
  pathPrefix?: string
  maxFileSize?: number
  allowedMimeTypes?: string[]
}

const DEFAULT_OPTIONS: Required<SupabaseImageUploadOptions> = {
  bucket: 'ai-transcriber-images',
  pathPrefix: 'notes',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}

export async function uploadImageToSupabase(
  file: File,
  options: Partial<SupabaseImageUploadOptions> = {}
): Promise<ImageUploadResult> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    // Validate file
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        success: false,
        error: `Unsupported image type: ${file.type}. Allowed types: ${config.allowedMimeTypes.join(', ')}`
      }
    }

    if (file.size > config.maxFileSize) {
      return {
        success: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`
      }
    }

    // Use API route instead of direct Supabase upload (matching audio pattern)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('pathPrefix', config.pathPrefix || 'notes')

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Upload failed with status: ${response.status}`
      }
    }

    const result = await response.json()
    
    if (!result.success || !result.url) {
      return {
        success: false,
        error: 'Invalid response from upload API'
      }
    }

    return {
      success: true,
      url: result.url
    }

  } catch (error) {
    console.error('Unexpected error in image upload:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export function createSupabaseImageUploader(
  options: Partial<SupabaseImageUploadOptions> = {}
) {
  return (file: File) => uploadImageToSupabase(file, options)
}
