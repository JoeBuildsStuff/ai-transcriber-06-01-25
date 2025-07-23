'use client'

import { useEditor, EditorContent, BubbleMenu, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { useState, useEffect } from 'react'

import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from './tiptap-dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Underline as UnderlineIcon, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Type, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Code, Copy, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CodeBlock } from './tiptap-code-block'

const lowlight = createLowlight(common)

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlock)
  },
})

export interface TiptapProps {
    /** 
     * Initial HTML content for the editor
     * @default ""
     */
    content?: string
    /** 
     * Whether to show the fixed toolbar menu
     * @default true
     */
    showFixedMenu?: boolean
    /** 
     * Whether to show the bubble menu on text selection
     * @default true
     */
    showBubbleMenu?: boolean
    /** 
     * Callback fired when content changes
     */
    onChange?: (content: string) => void
}

const Tiptap = ({ content, showFixedMenu = true, showBubbleMenu = true, onChange }: TiptapProps) => {
  const [isCopied, setIsCopied] = useState(false)
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
    ],
    content: content || ``,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    }
  })

  useEffect(() => {
    if (editor) {
      const editorContent = editor.getHTML()
      // Compare the content and update only if it's different.
      // This prevents an infinite loop.
      if (content !== editorContent) {
        editor.commands.setContent(content || '', false)
      }
    }
  }, [content, editor])

  const handleCopy = () => {
    if (!editor) {
        return
    }
    const htmlContent = editor.getHTML()
    const textContent = editor.getText()

    navigator.clipboard.write([
        new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' })
        })
    ]).then(() => {
        setIsCopied(true)
        setTimeout(() => {
            setIsCopied(false)
        }, 2000)
    }).catch(err => {
        console.error('Failed to copy rich text, falling back to plain text.', err)
        navigator.clipboard.writeText(textContent).then(() => {
            setIsCopied(true)
            setTimeout(() => {
                setIsCopied(false)
            }, 2000)
        }).catch(err => {
            console.error('Failed to copy plain text.', err)
        })
    })
  }

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
        {editor && showFixedMenu && 
        <div className='bg-card rounded-t-md border-b border-border' >
          <div className='flex flex-row p-2 justify-between'>
            <div className='flex flex-row gap-1'>
                {/* type of node */}
                <div className='flex flex-row gap-0.5 w-fit'>
                    <Tooltip>
                        <TooltipTrigger>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button size='sm' className='text-xs' variant='secondary' >
                                        {editor.isActive('heading', { level: 1 }) && <Heading1 className='' />}
                                        {editor.isActive('heading', { level: 2 }) && <Heading2 className='' />}
                                        {editor.isActive('heading', { level: 3 }) && <Heading3 className='' />}
                                        {editor.isActive('orderedList') && <ListOrdered className='' />}
                                        {editor.isActive('bulletList') && <List className='' />}
                                        {editor.isActive('codeBlock') && <Code className='' />}
                                        {!editor.isActive('heading', { level: 1 }) && !editor.isActive('heading', { level: 2 }) && !editor.isActive('heading', { level: 3 }) && !editor.isActive('orderedList') && !editor.isActive('bulletList') && !editor.isActive('codeBlock') && <Type className='' />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start' side='bottom' sideOffset={4} className='text-xs w-[12rem]'>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                                        <Type className='' />
                                        <span className='text-xs'>Text</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 0</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                                        <Heading1 className='' />
                                        <span className='text-xs'>Heading 1</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 1</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                                        <Heading2 className='' />
                                        <span className='text-xs'>Heading 2</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 2</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                                        <Heading3 className='' />
                                        <span className='text-xs'>Heading 3</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 3</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                                        <ListOrdered className='' />
                                        <span className='text-xs'>Ordered list</span>
                                        <DropdownMenuShortcut>⌘ ⇧ 7</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                                        <List className='' />
                                        <span className='text-xs'>Bullet list</span>
                                        <DropdownMenuShortcut>⌘ ⇧ 8</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                                        <Code className='' />
                                        <span className='text-xs'>Code block</span>
                                        <DropdownMenuShortcut>⌘ ⌥ C</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Block type</p>
                        </TooltipContent>
                    </Tooltip>

                </div>

                {/* alignment */}
                <div className='flex flex-row gap-0.5 w-fit'>
                    <Tooltip>
                        <TooltipTrigger>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button size='sm' className='text-xs' variant='secondary' >
                                        {editor.isActive({ textAlign: 'left' }) && <AlignLeft className='' />}
                                        {editor.isActive({ textAlign: 'center' }) && <AlignCenter className='' />}
                                        {editor.isActive({ textAlign: 'right' }) && <AlignRight className='' />}
                                        {!editor.isActive({ textAlign: 'left' }) && !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && <AlignLeft className='' />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start' side='bottom' sideOffset={4} className='text-xs w-[10rem]'>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                                        <AlignLeft className='' />
                                        <span className='text-xs'>Left</span>
                                        <DropdownMenuShortcut>⌘ ⇧ L</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                                        <AlignCenter className='' />
                                        <span className='text-xs'>Center</span>
                                        <DropdownMenuShortcut>⌘ ⇧ E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                                        <AlignRight className='' />
                                        <span className='text-xs'>Right</span>
                                        <DropdownMenuShortcut>⌘ ⇧ R</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Text alignment</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* formatting */}
                <div className='flex flex-row gap-0.5 w-fit'>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                pressed={editor.isActive('bold')}
                                size='sm'
                            >
                                <Bold className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Bold <span className='ml-2'>⌘B</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                pressed={editor.isActive('italic')}
                                size='sm'
                            >
                                <Italic className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Italic <span className='ml-2'>⌘I</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                pressed={editor.isActive('strike')}
                                size='sm'
                            >
                                <Strikethrough className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Strikethrough <span className='ml-2'>⌘⇧X</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                pressed={editor.isActive('underline')}
                                size='sm'
                            >
                                <UnderlineIcon className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Underline <span className='ml-2'>⌘U</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().focus().toggleCode().run()}
                                pressed={editor.isActive('code')}
                                size='sm'
                            >
                                <Code className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Inline code <span className='ml-2'>⌘E</span></p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <div className='flex flex-row gap-1'>
                <Button size='sm' variant='ghost' className='text-xs' onClick={handleCopy}>
                    {isCopied ? <Check className='' /> : <Copy className='' />}
                </Button>
            </div>
        </div>
        
        </div>
        }
        {/* end fixed menu */}

        {/* start bubble menu */}
        {editor && showBubbleMenu && (
            <BubbleMenu
            className=""
            tippyOptions={{ duration: 100 }}
            editor={editor}
            shouldShow={({ editor }) => {
                const { from, to } = editor.state.selection
                return from !== to
            }}
            >
                <div className='flex flex-row gap-0.5 border rounded-md border-border bg-background p-0.5'>
                    <Tooltip>
                        <TooltipTrigger>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button size='sm' className='text-xs' variant='ghost'>
                                        {editor.isActive('heading', { level: 1 }) ? <Heading1 className='h-4 w-4' /> : editor.isActive('heading', { level: 2 }) ? <Heading2 className='h-4 w-4' /> : editor.isActive('codeBlock') ? <Code className='h-4 w-4' /> : <Type className='h-4 w-4' />}
                                        <ChevronDown className='h-4 w-4 text-muted-foreground' />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent portalled={false} align='start' side='bottom' sideOffset={10} className='text-xs w-[12rem] bg-background'>
                                    <DropdownMenuItem onClick={() => editor.chain().setParagraph().focus().run()}>
                                        <Type className='' />
                                        <span className='text-xs'>Text</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 0</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().toggleHeading({ level: 1 }).focus().run()}>
                                        <Heading1 className='' />
                                        <span className='text-xs'>Heading 1</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 1</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().toggleHeading({ level: 2 }).focus().run()}>
                                        <Heading2 className='' />
                                        <span className='text-xs'>Heading 2</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 2</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().toggleHeading({ level: 3 }).focus().run()}>
                                        <Heading3 className='' />
                                        <span className='text-xs'>Heading 3</span>
                                        <DropdownMenuShortcut>⌘ ⌥ 3</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().toggleOrderedList().focus().run()}>
                                        <ListOrdered className='' />
                                        <span className='text-xs'>Ordered list</span>
                                        <DropdownMenuShortcut>⌘ ⇧ 7</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().toggleBulletList().focus().run()}>
                                        <List className='' />
                                        <span className='text-xs'>Bullet list</span>
                                        <DropdownMenuShortcut>⌘ ⇧ 8</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                                        <Code className='' />
                                        <span className='text-xs'>Code block</span>
                                        <DropdownMenuShortcut>⌘ ⌥ C</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Block type</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button size='sm' className='text-xs' variant='ghost' >
                                        {editor.isActive({ textAlign: 'left' }) && <AlignLeft className='h-4 w-4' />}
                                        {editor.isActive({ textAlign: 'center' }) && <AlignCenter className='h-4 w-4' />}
                                        {editor.isActive({ textAlign: 'right' }) && <AlignRight className='h-4 w-4' />}
                                        {!editor.isActive({ textAlign: 'left' }) && !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && <AlignLeft className='h-4 w-4' />}
                                        <ChevronDown className='h-4 w-4 text-muted-foreground' />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent portalled={false} align='start' side='bottom' sideOffset={10} className='text-xs w-[10rem] bg-background'>
                                    <DropdownMenuItem onClick={() => editor.chain().setTextAlign('left').focus().run()}>
                                        <AlignLeft className='' />
                                        <span className='text-xs'>Left</span>
                                        <DropdownMenuShortcut>⌘ ⇧ L</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().setTextAlign('center').focus().run()}>
                                        <AlignCenter className='' />
                                        <span className='text-xs'>Center</span>
                                        <DropdownMenuShortcut>⌘ ⇧ E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.chain().setTextAlign('right').focus().run()}>
                                        <AlignRight className='' />
                                        <span className='text-xs'>Right</span>
                                        <DropdownMenuShortcut>⌘ ⇧ R</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Text alignment</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().toggleBold().focus().run()}
                                pressed={editor.isActive('bold')}
                                size='sm'
                                className='text-xs'
                            >
                                <Bold className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Bold <span className='ml-2'>⌘B</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().toggleItalic().focus().run()}
                                pressed={editor.isActive('italic')}
                                size='sm'
                                className='text-xs'
                            >
                                <Italic className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Italic <span className='ml-2'>⌘I</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().toggleStrike().focus().run()}
                                pressed={editor.isActive('strike')}
                                size='sm'
                                className='text-xs'
                            >
                                <Strikethrough className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Strikethrough <span className='ml-2'>⌘⇧X</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().toggleUnderline().focus().run()}
                                pressed={editor.isActive('underline')}
                                size='sm'
                                className='text-xs'
                            >
                                <UnderlineIcon className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Underline <span className='ml-2'>⌘U</span></p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Toggle
                                onClick={() => editor.chain().toggleCode().focus().run()}
                                pressed={editor.isActive('code')}
                                size='sm'
                                className='text-xs'
                            >
                                <Code className='' />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Inline code <span className='ml-2'>⌘E</span></p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </BubbleMenu>
        )}
        {/* end bubble menu */}

        {/* start editor */}
        <div className='py-2 px-3 prose prose-base dark:prose-invert max-w-none'>
            <EditorContent editor={editor} className='' />
        </div>
        {/* end editor */}

      </TooltipProvider>
    </div>
  )
}

export default Tiptap