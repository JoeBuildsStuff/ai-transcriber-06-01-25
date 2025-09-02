// Types for configurable Tiptap component
export interface TiptapImageUploadConfig {
  /** Upload function that returns a promise with the uploaded image URL */
  uploadFn?: (file: File) => Promise<string>
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number
  /** Allowed image MIME types */
  allowedMimeTypes?: string[]
  /** Whether to allow base64 images as fallback (default: true) */
  allowBase64?: boolean
  /** Supabase bucket name for uploads */
  supabaseBucket?: string
  /** Custom path prefix for uploads */
  pathPrefix?: string
}

export interface TiptapProps {
  content?: string
  showFixedMenu?: boolean
  showBubbleMenu?: boolean
  showDragHandle?: boolean
  onChange?: (content: string) => void
  onFileDrop?: (files: File[]) => void
  /** Image upload configuration */
  imageUploadConfig?: TiptapImageUploadConfig
  /** Whether to show file nodes for non-image files */
  enableFileNodes?: boolean
}

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}
