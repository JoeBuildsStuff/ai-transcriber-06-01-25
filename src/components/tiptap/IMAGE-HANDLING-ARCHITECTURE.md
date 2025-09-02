# Image and File Handling Architecture

This document explains how images and files are handled in the Tiptap editor, following Tiptap's recommended patterns.

## Overview

Following Tiptap's documentation guidelines:
- **Image Extension**: Only responsible for displaying images (no upload functionality)
- **FileHandler Extension**: Handles all file drops/pastes and uploads

## Architecture Components

### 1. FileHandler Extension (`file-handler.tsx`)
- **Purpose**: Intercepts all file drops and pastes
- **Responsibilities**:
  - Detects when files are dropped or pasted
  - Uploads images to Supabase via API
  - Converts non-image files to base64 for inline storage
  - Inserts appropriate nodes (Image or FileNode) into editor

### 2. Custom Image Extension (`custom-image-extension.ts`)
- **Purpose**: Extends the standard Image extension to display Supabase-stored images
- **Key Features**:
  - Uses CustomImageView for rendering
  - No upload functionality (follows Tiptap docs)
  - Configured with `allowBase64: false` since we store file paths

### 3. Custom Image View (`custom-image-view.tsx`)
- **Purpose**: React component that renders images stored in Supabase
- **Responsibilities**:
  - Takes a file path (not a full URL)
  - Fetches authenticated signed URLs from `/api/images/serve`
  - Shows loading and error states
  - Handles both file paths and direct URLs

### 4. Upload API (`/api/images/upload/route.ts`)
- **Purpose**: Server-side upload handler
- **Process**:
  1. Validates authentication
  2. Validates file type and size
  3. Uploads to Supabase Storage
  4. Returns the file path (not URL)

### 5. Serve API (`/api/images/serve/route.ts`)
- **Purpose**: Generates signed URLs for image access
- **Security**:
  - Verifies user authentication
  - Ensures user owns the file (path starts with user ID)
  - Returns time-limited signed URLs

### 6. Delete API (`/api/images/delete/route.ts`)
- **Purpose**: Removes images from Supabase storage
- **Security**:
  - Verifies user authentication
  - Ensures user owns the file before deletion
  - Prevents unauthorized file removal

### 7. Image Cleanup System (`image-cleanup.ts`)
- **Purpose**: Automatically cleans up deleted images from storage
- **Functions**:
  - `deleteImageFromStorage()`: Calls delete API for individual files
  - `cleanupImages()`: Simple wrapper for backward compatibility

## Data Flow

### Upload Flow (Drop/Paste)
1. User drops/pastes image → FileHandler intercepts
2. FileHandler calls `uploadImageToSupabase()`
3. Upload API stores in Supabase, returns file path
4. FileHandler inserts Image node with `src: filePath`
5. CustomImageView fetches signed URL for display

### Display Flow
1. Image node has `src` attribute with file path
2. CustomImageView component loads
3. Fetches signed URL from `/api/images/serve`
4. Displays image with signed URL

### Cleanup Flow (Image Deletion)
1. User deletes image from editor → `onDelete` event fires
2. Event handler extracts the exact deleted image node and its `src` attribute
3. `deleteImageFromStorage()` calls delete API for the deleted image
4. Delete API removes file from Supabase storage
5. Prevents storage bloat and reduces costs

## Key Design Decisions

1. **File Paths vs URLs**: We store file paths in content, not URLs
   - URLs expire, file paths are permanent
   - Matches the audio file pattern in the app
   - Enables access control per request

2. **No Base64 in Content**: `allowBase64: false`
   - Keeps document size small
   - Better performance
   - Centralized file management

3. **Separation of Concerns**:
   - FileHandler: Handles events and uploads
   - Image Extension: Only displays
   - APIs: Handle storage and security
   - Cleanup System: Automatic storage management

4. **Event-Driven Cleanup**: Uses Tiptap's `onDelete` event
   - Direct access to deleted image nodes
   - Immediate cleanup when images are deleted
   - No complex content diffing needed

## Configuration

In your Tiptap component:

```typescript
// Configure FileHandler with upload settings
createFileHandlerConfig({ 
  imageUploadConfig: {
    supabaseBucket: 'ai-transcriber-images',
    pathPrefix: 'notes',
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
})

// Configure Image extension for display only
CustomImage.configure({
  inline: true,
  allowBase64: false,
  HTMLAttributes: {
    class: 'tiptap-image',
  }
})

// Add to editor configuration
const editor = useEditor({
  extensions: [/* extensions including the above */],
  onUpdate: ({ editor }) => {
    if (onChange) onChange(editor.getHTML())
  },
  onDelete: ({ type, node }) => {
    // Handle cleanup of deleted image nodes
    if (type === 'node' && node?.type?.name === 'image' && node?.attrs?.src) {
      const src = node.attrs.src
      
      // Only cleanup Supabase file paths, not external URLs
      if (typeof src === 'string' && !src.startsWith('http') && !src.startsWith('data:')) {
        deleteImageFromStorage(src).catch(error => {
          console.error('Failed to cleanup deleted image:', error)
        })
      }
    }
  },
})
```

## Security Considerations

1. **Authentication Required**: All uploads and serves require auth
2. **User Isolation**: File paths include user ID
3. **Access Control**: Each request validates ownership
4. **Signed URLs**: Time-limited access tokens
5. **File Validation**: Type and size limits enforced

## Benefits of the New Approach

### **Simplified Cleanup System**
- **Direct Event Handling**: Uses Tiptap's `onDelete` event instead of complex content diffing
- **No State Tracking**: Eliminates need to track previous image paths
- **Immediate Cleanup**: Deleted images are cleaned up instantly when the event fires
- **Better Performance**: No HTML parsing or content comparison needed

### **Cleaner Architecture**
- **Single Responsibility**: Each component has a clear, focused purpose
- **Event-Driven**: Follows Tiptap's recommended event handling patterns
- **Less Code**: Reduced complexity and maintenance overhead
- **Better Reliability**: Direct access to deleted nodes vs. content inference

## Comparison with Tiptap Examples

Our implementation follows the Tiptap documentation pattern where:
- FileHandler does the heavy lifting (upload + insert)
- Image extension just displays
- No custom paste handlers needed
- Clean separation of concerns
- **Event-driven cleanup** using `onDelete` instead of content monitoring

The main difference is we upload to Supabase instead of converting to base64.
