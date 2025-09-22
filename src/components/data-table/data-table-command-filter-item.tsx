import { X } from "lucide-react"

interface DataTableCommandFilterItemProps {
  columnLabel: string
  operatorLabel: string
  valueLabel?: string
  onRemove?: () => void
}

export default function DataTableCommandFilterItem({
  columnLabel,
  operatorLabel,
  valueLabel,
  onRemove,
}: DataTableCommandFilterItemProps) {
  return (
    <div className="flex flex-row gap-5">
      <div>
        <div className="flex flex-row items-center">
          <span className="border border-border border-r-0 rounded-l-md px-3 py-1 text-sm">{columnLabel}</span>
          <span className="border border-border border-r-0 border-l rounded-r-0 px-3 py-1 text-sm text-muted-foreground">{operatorLabel.toLowerCase()}</span>
          <span className="border-t border-b border-l border-border px-3 py-1 text-sm">{valueLabel}</span>
          <button
              className="border border-border rounded-r-md rounded-l-0 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-pointer"
              onClick={onRemove}
            >
              <X className="size-4" />
            </button>
        </div>
      </div>

    </div>
  )
}
