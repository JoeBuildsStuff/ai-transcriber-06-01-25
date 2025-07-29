# File Handling Components for TipTap Editor

This document describes the file handling components that enable drag-and-drop file uploads and previews in the TipTap editor.

## Overview

The file handling system consists of four main components:

1. **FileNode** - The core TipTap node that represents files in the editor
2. **FileNodeView** - The React component that renders file nodes
3. **FileHandler** - Handles file drops and paste events
4. **DocumentPreview** - Renders document previews for supported file types

## Components

### FileNode (`file-node.tsx`)

The core TipTap node that represents files in the editor content.

**Features:**
- Atomic block node (cannot be split)
- Stores file metadata (name, size, type, data)
- Supports different preview types (image, document, file)
- Tracks upload status (pending, uploading, completed, error)

**Attributes:**
```typescript
interface FileNodeAttributes {
  src?: string
  filename: string
  fileSize: number
  fileType: string
  fileData?: string // base64 or URL
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error'
  previewType: 'image' | 'document' | 'file'
}
```

**Usage:**
```typescript
import { FileNode } from './file-node'

// Add to editor extensions
const extensions = [
  // ... other extensions
  FileNode,
]
```

### FileNodeView (`file-node-view.tsx`)

The React component that renders file nodes in the editor.

**Features:**
- Displays file information (name, size, type)
- Provides download functionality
- Supports opening files in browser
- Shows upload status indicators
- Allows node deletion

**Actions:**
- **Download**: Converts base64 data to blob and triggers download
- **Open in Browser**: Opens file in new tab
- **Delete**: Removes the file node from editor

**Upload Status Indicators:**
- `pending`: Shows loading spinner
- `uploading`: Shows loading spinner
- `completed`: Shows action buttons
- `error`: Shows error icon

### FileHandler (`file-handler.tsx`)

Handles file drops and paste events, converting files to FileNode instances.

**Features:**
- Intercepts file drops and paste events
- Converts files to base64 data
- Determines preview type based on file type
- Inserts FileNode into editor
- Supports custom file drop callbacks

**Supported File Types:**
- Images: `image/*` → previewType: 'image'
- Documents: `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → previewType: 'document'
- Other files: → previewType: 'file'

**Usage:**
```typescript
import { createFileHandlerConfig } from './file-handler'

const fileHandler = createFileHandlerConfig({
  onFileDrop: (files) => {
    // Custom file drop handling
    console.log('Files dropped:', files)
  }
})

// Add to editor extensions
const extensions = [
  // ... other extensions
  fileHandler,
]
```

### DocumentPreview (`file-document-preview.tsx`)

Renders document previews for supported file types.

**Supported Formats:**
- **Text files** (`.txt`): Renders as formatted text
- **Word documents** (`.docx`): Renders using docx-preview library

**Features:**
- File size formatting
- Loading states with skeletons
- Error handling
- Download functionality
- Responsive design

**Dependencies:**
- `docx-preview` for Word document rendering
- `lucide-react` for icons

## Implementation Example

### Basic Setup

```typescript
import { Editor } from '@tiptap/react'
import { FileNode } from './file-node'
import { createFileHandlerConfig } from './file-handler'

const extensions = [
  // ... other extensions
  FileNode,
  createFileHandlerConfig({
    onFileDrop: (files) => {
      console.log('Files dropped:', files)
    }
  })
]

const editor = useEditor({
  extensions,
  content: '<p>Hello World!</p>',
})
```

### Custom File Drop Handling

```typescript
const handleFileDrop = (files: File[]) => {
  // Upload files to server
  files.forEach(async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      
      // Update file node with server URL
      // This would require custom logic to find and update the node
    } catch (error) {
      console.error('Upload failed:', error)
    }
  })
}

const fileHandler = createFileHandlerConfig({
  onFileDrop: handleFileDrop
})
```

### Document Preview Usage

```typescript
import { DocumentPreview } from './file-document-preview'

function FilePreviewComponent({ file }: { file: File }) {
  const handleDownload = () => {
    // Custom download logic
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DocumentPreview 
      file={file} 
      onDownload={handleDownload}
    />
  )
}
```

## File Type Support

### Images
- **Preview Type**: `image`
- **Supported Formats**: All browser-supported image formats
- **Rendering**: Uses standard `<img>` tag

### Documents
- **Preview Type**: `document`
- **Supported Formats**:
  - `.txt` (text/plain)
  - `.docx` (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- **Rendering**: 
  - Text files: Formatted in `<pre>` tag
  - Word documents: Rendered using docx-preview library

### Other Files
- **Preview Type**: `file`
- **Supported Formats**: Any file type
- **Rendering**: File information card with download/open actions

## Styling

The components use Tailwind CSS classes and are designed to work with the shadcn/ui component library. Key styling classes:

- **Cards**: `Card`, `CardContent`, `CardHeader`, `CardTitle`
- **Buttons**: `Button` with various variants (`outline`, `ghost`, `sm`)
- **Icons**: `lucide-react` icons
- **Loading**: `Skeleton` components for loading states

## Error Handling

The components include comprehensive error handling:

1. **File Reading Errors**: Caught in FileHandler
2. **Preview Rendering Errors**: Displayed in DocumentPreview
3. **Download Errors**: Caught in FileNodeView
4. **Upload Errors**: Status tracking in FileNode

## Performance Considerations

1. **Base64 Storage**: File data is stored as base64 strings, which can be memory-intensive for large files
2. **Lazy Loading**: Document previews are rendered on-demand
3. **Blob Cleanup**: URLs are properly revoked after downloads
4. **Upload Simulation**: Current implementation simulates upload completion after 1 second

## Browser Compatibility

- **File API**: Modern browsers with File API support
- **Base64**: All modern browsers
- **Blob URLs**: All modern browsers
- **docx-preview**: Requires ES6+ support

## Dependencies

```json
{
  "dependencies": {
    "@tiptap/core": "^2.0.0",
    "@tiptap/react": "^2.0.0",
    "@tiptap/extension-file-handler": "^2.0.0",
    "docx-preview": "^0.2.0",
    "lucide-react": "^0.300.0"
  }
}
```

## Future Enhancements

1. **Server Upload**: Implement actual file upload to server
2. **More Document Types**: Support for PDF, Excel, PowerPoint
3. **Image Optimization**: Compress images before storage
4. **Progress Tracking**: Real upload progress indicators
5. **File Validation**: Size and type restrictions
6. **Drag Reordering**: Allow reordering of file nodes
7. **Batch Operations**: Select and operate on multiple files

## Troubleshooting

### Common Issues

1. **Files not appearing**: Check if FileNode extension is properly added
2. **Preview not working**: Ensure docx-preview is installed for Word documents
3. **Download fails**: Check browser console for CORS or blob errors
4. **Large files slow**: Consider implementing file size limits

### Debug Tips

1. Check browser console for errors
2. Verify file types are supported
3. Test with smaller files first
4. Ensure all dependencies are installed 