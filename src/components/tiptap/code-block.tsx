'use client'

import type { NodeViewProps } from '@tiptap/react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

export function CodeBlock(props: NodeViewProps) {
  const [isCopied, setIsCopied] = useState(false)
  const languages = props.extension.options.lowlight.listLanguages()

  const handleCopy = () => {
    navigator.clipboard.writeText(props.node.textContent)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  const handleLanguageChange = (language: string) => {
    props.updateAttributes({ language })
  }

  return (
    <NodeViewWrapper className="code-block group relative">
      <Select
        defaultValue={props.node.attrs.language || 'plaintext'}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="absolute left-2 top-2 w-fit border-none bg-transparent shadow-none" >
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang: string) => (
            <SelectItem key={lang} value={lang}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-3.5 size-6"
              onClick={handleCopy}
            >
              {isCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy code</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Separator className='absolute top-13 left-0 right-0' />
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  )
} 