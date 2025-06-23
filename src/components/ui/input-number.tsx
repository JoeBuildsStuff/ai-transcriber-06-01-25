"use client"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Button, Group, Input, NumberField as AriaNumberField } from "react-aria-components"
import { cn } from "@/lib/utils"

interface InputNumberProps {
  value?: number | string
  onChange?: (value: number) => void
  placeholder?: string
  className?: string
  unit?: string
}

export function InputNumber({ value, onChange, placeholder, className, unit }: InputNumberProps) {
  return (
    <AriaNumberField
      value={typeof value === 'string' ? (value === '' ? undefined : Number(value)) : value}
      onChange={onChange}
      className={className}
    >
      <Group className="border-input outline-none data-focus-within:border-ring data-focus-within:ring-ring/50 data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] data-disabled:opacity-50 data-focus-within:ring-[3px] bg-transparent dark:bg-input/30">
        <div className="relative flex-1">
          {unit && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground z-10">
              {unit}
            </div>
          )}
          <Input 
            placeholder={placeholder}
            className={cn(
              "text-foreground flex-1 px-3 py-2 tabular-nums border-0 outline-none w-full bg-transparent placeholder:text-muted-foreground",
              unit && "pl-8"
            )} 
          />
        </div>
        <div className="flex h-[calc(100%+2px)] flex-col">
          <Button
            slot="increment"
            className="border-input text-muted-foreground/80 hover:bg-accent hover:text-foreground -me-px flex h-1/2 w-6 flex-1 items-center justify-center border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronUpIcon size={12} aria-hidden="true" />
          </Button>
          <Button
            slot="decrement"
            className="border-input text-muted-foreground/80 hover:bg-accent hover:text-foreground -me-px -mt-px flex h-1/2 w-6 flex-1 items-center justify-center border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronDownIcon size={12} aria-hidden="true" />
          </Button>
        </div>
      </Group>
    </AriaNumberField>
  )
} 