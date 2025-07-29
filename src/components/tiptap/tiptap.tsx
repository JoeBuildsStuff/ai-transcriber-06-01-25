'use client'

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Placeholder, Gapcursor } from '@tiptap/extensions'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table/row'
import { TableCell } from '@tiptap/extension-table/cell'
import { TableHeader } from '@tiptap/extension-table/header'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import Image from '@tiptap/extension-image'
import { FileNode } from '@/components/tiptap/file-node'
import { createLowlight, common } from 'lowlight'
import { useEffect, useState } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import {
    Bold,
    Italic,
    Strikethrough,
    Underline as UnderlineIcon,
    Code,
    Type,
    AlignLeft,
    GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { CodeBlock } from '@/components/tiptap/code-block'
import FixedMenu from '@/components/tiptap/fixed-menu'
import BubbleMenuComponent from '@/components/tiptap/bubble-menu'
import { createFileHandlerConfig } from '@/components/tiptap/file-handler'

const lowlight = createLowlight(common)
const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlock)
  },
})

interface TiptapProps {
    content?: string
    showFixedMenu?: boolean
    showBubbleMenu?: boolean
    showDragHandle?: boolean
    onChange?: (content: string) => void
    onFileDrop?: (files: File[]) => void
}

const Tiptap = ({ content, showFixedMenu = true, showBubbleMenu = true, showDragHandle = true, onChange, onFileDrop }: TiptapProps) => {
  // Track the currently selected node for drag handle functionality
  const [selectedNode, setSelectedNode] = useState<{ type: { name: string } } | null>(null)

  const editor = useEditor({
    extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        Placeholder.configure({
            placeholder: 'Write something…',
        }),
        CustomCodeBlock.configure({
            lowlight,
        }),
        Link.configure({
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
            protocols: ['http', 'https'],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Gapcursor,
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        FileNode,
        createFileHandlerConfig({ onFileDrop }),
    ],
    content: content || ``,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        // Handle Cmd+K (or Ctrl+K) for link
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          // Note: Link functionality is now handled by LinkButton components
          return true
        }
        return false
      }
    }
  })

  useEffect(() => {
    if (editor) {
      const editorContent = editor.getHTML()
      // Compare the content and update only if it's different.
      // This prevents an infinite loop.
      if (content !== editorContent) {
        editor.commands.setContent(content || '', { emitUpdate: false })
      }
    }
  }, [content, editor])

  // Skeleton
  if (!editor) {
    return (
        <div className='relative border border-border rounded-md bg-card'>
            {showFixedMenu && (
                <div className='bg-card rounded-t-md border-b border-border' >
                    <div className='flex flex-row gap-1 p-2'>
                        <div className='flex flex-row gap-0.5 w-fit'>
                            <Button size='sm' variant='secondary' disabled>
                                <Type className='' />
                            </Button>
                        </div>
                        <div className='flex flex-row gap-0.5 w-fit'>
                            <Button size='sm' variant='secondary' disabled>
                                <AlignLeft className='' />
                            </Button>
                        </div>
                        <div className='flex flex-row gap-0.5 w-fit'>
                            <Toggle size='sm' disabled>
                                <Bold className='' />
                            </Toggle>
                            <Toggle size='sm' disabled>
                                <Italic className='' />
                            </Toggle>
                            <Toggle size='sm' disabled>
                                <Strikethrough className='' />
                            </Toggle>
                            <Toggle size='sm' disabled>
                                <UnderlineIcon className='' />
                            </Toggle>
                            <Toggle size='sm' disabled>
                                <Code className='' />
                            </Toggle>
                        </div>
                    </div>
                </div>
            )}
            <div className='py-2 px-3 h-full'>
                <div className='prose prose-base dark:prose-invert max-w-none'>
                    <Skeleton className='h-6 w-1/3 mb-4' />
                    <Skeleton className='h-4 w-full mb-2' />
                    <Skeleton className='h-4 w-3/4 mb-2' />
                </div>
            </div>
        </div>
    )
  }

    // Editor
    return (
        <div className='relative border border-border rounded-md bg-card'>
            <TooltipProvider>

                {/* start fixed menu */}
                {showFixedMenu && <FixedMenu editor={editor} />}
                {/* end fixed menu */}

                {/* start bubble menu */}
                {showBubbleMenu && <BubbleMenuComponent editor={editor} />}
                {/* end bubble menu */}

                {/* start drag handle */}
                {showDragHandle && (
                  <DragHandle
                    editor={editor}
                    onNodeChange={({ node, pos }) => {
                      setSelectedNode(node)
                      // You can add custom logic here to highlight the selected node
                      if (node) {
                        console.log('Selected node:', node.type.name, 'at position:', pos, 'selectedNode:', selectedNode)
                      }
                    }}
                  >
                    <div className="flex items-center justify-center w-4 h-8 mr-1 hover:bg-muted/80 rounded cursor-grab active:cursor-grabbing transition-colors">
                      <GripVertical className="size-4 text-muted-foreground/70" />
                    </div>
                  </DragHandle>
                )}
                {/* end drag handle */}

                {/* start editor */}
                <div className='py-2 px-6 prose prose-base dark:prose-invert max-w-none'>
                    <EditorContent 
                        editor={editor} 
                        className='[&_a:hover]:cursor-pointer' 
                    />
                </div>
                {/* end editor */}

            </TooltipProvider>
        </div>
    )
}

export default Tiptap