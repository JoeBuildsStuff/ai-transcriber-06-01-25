import { forwardRef } from "react"
import type { CSSProperties, Ref } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import { cn } from "@/lib/utils"

const meetingBlockVariants = cva(
  "w-full text-left overflow-hidden transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary/80 text-secondary-foreground hover:ring-1 hover:ring-blue-500 hover:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        green: "bg-green-50 text-green-800 dark:text-green-400 dark:bg-green-900/20 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/30 hover:ring-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset",
        blue: "bg-blue-50 text-blue-800 dark:text-blue-400 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-600/30 hover:ring-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        red: "bg-red-50 text-red-800 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/20 dark:ring-red-600/30 hover:ring-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset",
        yellow: "bg-yellow-50 text-yellow-800 dark:text-yellow-400 dark:bg-yellow-900/20 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-600/30 hover:ring-yellow-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-inset",
        orange: "bg-orange-50 text-orange-800 dark:text-orange-400 dark:bg-orange-900/20 ring-1 ring-inset ring-orange-600/20 dark:ring-orange-600/30 hover:ring-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset",
        purple: "bg-purple-50 text-purple-800 dark:text-purple-400 dark:bg-purple-900/20 ring-1 ring-inset ring-purple-600/20 dark:ring-purple-600/30 hover:ring-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset",
        pink: "bg-pink-50 text-pink-800 dark:text-pink-400 dark:bg-pink-900/20 ring-1 ring-inset ring-pink-600/20 dark:ring-pink-600/30 hover:ring-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-inset",
        gray: "bg-gray-50 text-gray-800 dark:text-gray-400 dark:bg-gray-900/20 ring-1 ring-inset ring-gray-600/20 dark:ring-gray-600/30 hover:ring-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-inset",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type MeetingBlockBaseProps = {
  meetingTitle: string
  startTimeLabel: string
  startDateTime?: string
  durationLabel?: string
  details?: string
  className?: string
  style?: CSSProperties
  variant?: VariantProps<typeof meetingBlockVariants>["variant"]
}

type MeetingBlockArticleProps = MeetingBlockBaseProps &
  Omit<React.ComponentPropsWithoutRef<"article">, "children" | keyof MeetingBlockBaseProps> & {
    as?: "article"
  }

type MeetingBlockButtonProps = MeetingBlockBaseProps &
  Omit<React.ComponentPropsWithoutRef<"button">, "children" | "type" | keyof MeetingBlockBaseProps> & {
    as: "button"
    buttonType?: "button" | "submit" | "reset"
  }

export type MeetingBlockProps = MeetingBlockArticleProps | MeetingBlockButtonProps

const MeetingBlockComponent = (
  {
    as = "article",
    meetingTitle,
    startTimeLabel,
    startDateTime,
    durationLabel,
    details,
    className,
    style,
    variant,
    ...rest
  }: MeetingBlockProps,
  forwardedRef: Ref<HTMLElement | HTMLButtonElement>
) => {
  const timeLabelText = durationLabel
    ? `${startTimeLabel} - ${durationLabel}`
    : startTimeLabel

  const timeLabel = (
    <ItemDescription
      className="line-clamp-1 truncate text-[11px] leading-snug"
      title={timeLabelText}
    >
      <time dateTime={startDateTime}>{startTimeLabel}</time>
      {durationLabel ? <span>{` - ${durationLabel}`}</span> : null}
    </ItemDescription>
  )

  if (as === "button") {
    const { buttonType = "button", ...buttonRest } = rest as MeetingBlockButtonProps

    return (
      <Item
        asChild
        variant="muted"
        size="sm"
        className={cn(
          meetingBlockVariants({ variant }),
          "py-1 px-1.5 rounded-md",
          className
        )}
        style={style}
      >
        <button ref={forwardedRef as Ref<HTMLButtonElement>} type={buttonType} {...buttonRest}>
          <ItemContent className="items-start gap-1">
            <ItemTitle
              className="w-full truncate text-xs font-semibold leading-tight"
              title={meetingTitle}
            >
              {meetingTitle}
            </ItemTitle>
            {timeLabel}
            {details ? (
              <ItemDescription className="text-[11px] leading-snug">
                {details}
              </ItemDescription>
            ) : null}
          </ItemContent>
        </button>
      </Item>
    )
  }

  return (
    <Item
      asChild
      variant="muted"
      size="sm"
      className={cn(
        meetingBlockVariants({ variant }),
        "py-1 px-1.5 rounded-md shadow-sm",
        className
      )}
      style={style}
    >
      <article ref={forwardedRef as Ref<HTMLElement>} {...(rest as MeetingBlockArticleProps)}>
        <ItemContent className="items-start gap-1">
          <ItemTitle
            className="w-full truncate text-xs font-semibold leading-tight"
            title={meetingTitle}
          >
            {meetingTitle}
          </ItemTitle>
          {timeLabel}
          {details ? (
            <ItemDescription className="text-[11px] leading-snug">
              {details}
            </ItemDescription>
          ) : null}
        </ItemContent>
      </article>
    </Item>
  )
}

export const MeetingBlock = forwardRef(MeetingBlockComponent)

MeetingBlock.displayName = "MeetingBlock"

export { meetingBlockVariants }
