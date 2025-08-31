'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { CopyIcon } from '@/components/icons/copy';
import { CheckIcon } from '@/components/icons/check';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
};

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The text content to copy to clipboard */
  textToCopy: string;
  /** Custom success message for the toast */
  successMessage?: string;
  /** Custom error message for the toast */
  errorMessage?: string;
  /** Size of the copy/check icons */
  iconSize?: number;
  /** Tooltip text when not copied */
  tooltipText?: string;
  /** Tooltip text when copied */
  tooltipCopiedText?: string;
  /** Whether to show tooltip */
  showTooltip?: boolean;
  /** Custom callback when copy is successful */
  onCopySuccess?: () => void;
  /** Custom callback when copy fails */
  onCopyError?: (error: unknown) => void;
}

export function CopyButton({
  textToCopy,
  successMessage,
  errorMessage,
  iconSize = 16,
  tooltipText = 'Copy',
  tooltipCopiedText = 'Copied!',
  showTooltip = true,
  onCopySuccess,
  onCopyError,
  className,
  variant = 'ghost',
  size = 'icon',
  ...props
}: CopyButtonProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    successMessage,
    errorMessage,
  });

  const handleCopy = async () => {
    try {
      await copyToClipboard(textToCopy, successMessage);
      onCopySuccess?.();
    } catch (error) {
      onCopyError?.(error);
    }
  };

  const ButtonComponent = (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'h-fit w-fit p-2 m-0 text-muted-foreground hover:text-primary',
        className
      )}
      onClick={handleCopy}
      disabled={!textToCopy}
      {...props}
    >
      {isCopied ? (
        <CheckIcon className="" size={iconSize} />
      ) : (
        <CopyIcon className="" size={iconSize} />
      )}
    </Button>
  );

  if (!showTooltip) {
    return ButtonComponent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{ButtonComponent}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="center"
          sideOffset={4}
          className="border border-border text-secondary-foreground bg-secondary"
        >
          {isCopied ? tooltipCopiedText : tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
