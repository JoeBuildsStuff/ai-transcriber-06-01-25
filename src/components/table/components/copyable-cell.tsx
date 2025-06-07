"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CopyableCellProps {
  value: string | null | undefined
}

export function CopyableCell({ value }: CopyableCellProps) {
  const [isCopied, setIsCopied] = useState(false)

  const onCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    }
  }

  if (!value) {
    return <div className="w-fit"></div>
  }

  return (
    <div className="flex items-center justify-between w-full group">
      <span className="truncate w-fit">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onCopy}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
} 