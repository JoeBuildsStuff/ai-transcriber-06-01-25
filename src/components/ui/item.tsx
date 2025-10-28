import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex flex-col", className)}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-0", className)}
      {...props}
    />
  )
}

const itemVariants = cva(
  "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50",
        gray: 
          "border-transparent bg-gray-50 text-gray-700 dark:text-gray-300 dark:bg-gray-900/20 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-600/50",
        red: 
          "border-transparent bg-red-50 text-red-700 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30",
        yellow: 
          "border-transparent bg-yellow-50 text-yellow-800 dark:text-yellow-400 dark:bg-yellow-900/20 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-600/30",
        orange:
          "border-transparent bg-orange-50 text-orange-800 dark:text-orange-400 dark:bg-orange-900/20 ring-1 ring-inset ring-orange-600/20 dark:ring-orange-600/30",
        amber:
          "border-transparent bg-amber-50 text-amber-800 dark:text-amber-400 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-600/30",
        green: 
          "border-transparent bg-green-50 text-green-700 dark:text-green-400 dark:bg-green-900/20 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/30",
        blue: 
          "border-transparent bg-blue-50 text-blue-700 dark:text-blue-400 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-600/30",
        indigo: 
          "border-transparent bg-indigo-50 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-600/30",
        purple: 
          "border-transparent bg-purple-50 text-purple-700 dark:text-purple-400 dark:bg-purple-900/20 ring-1 ring-inset ring-purple-700/10 dark:ring-purple-600/30",
        pink: 
          "border-transparent bg-pink-50 text-pink-700 dark:text-pink-400 dark:bg-pink-900/20 ring-1 ring-inset ring-pink-700/10 dark:ring-pink-600/30",
      },
      size: {
        default: "p-4 gap-4 ",
        sm: "py-3 px-4 gap-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        className
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-snug font-medium",
        className
      )}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "line-clamp-2 text-sm leading-normal font-normal text-balance",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        // Inherit text color from parent Item variant
        "group-[.group/item[data-variant=gray]]/item:text-gray-600 group-[.group/item[data-variant=gray]]/item:dark:text-gray-400",
        "group-[.group/item[data-variant=red]]/item:text-red-600 group-[.group/item[data-variant=red]]/item:dark:text-red-400",
        "group-[.group/item[data-variant=yellow]]/item:text-yellow-700 group-[.group/item[data-variant=yellow]]/item:dark:text-yellow-400",
        "group-[.group/item[data-variant=orange]]/item:text-orange-700 group-[.group/item[data-variant=orange]]/item:dark:text-orange-400",
        "group-[.group/item[data-variant=amber]]/item:text-amber-700 group-[.group/item[data-variant=amber]]/item:dark:text-amber-400",
        "group-[.group/item[data-variant=green]]/item:text-green-600 group-[.group/item[data-variant=green]]/item:dark:text-green-400",
        "group-[.group/item[data-variant=blue]]/item:text-blue-600 group-[.group/item[data-variant=blue]]/item:dark:text-blue-400",
        "group-[.group/item[data-variant=indigo]]/item:text-indigo-600 group-[.group/item[data-variant=indigo]]/item:dark:text-indigo-400",
        "group-[.group/item[data-variant=purple]]/item:text-purple-600 group-[.group/item[data-variant=purple]]/item:dark:text-purple-400",
        "group-[.group/item[data-variant=pink]]/item:text-pink-600 group-[.group/item[data-variant=pink]]/item:dark:text-pink-400",
        // Default muted color for other variants (default, outline, muted)
        "group-[.group/item[data-variant=default]]/item:text-muted-foreground",
        "group-[.group/item[data-variant=outline]]/item:text-muted-foreground", 
        "group-[.group/item[data-variant=muted]]/item:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
