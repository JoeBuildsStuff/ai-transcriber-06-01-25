'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons/delete';
import { ChevronLeftIcon } from '@/components/icons/chevron-left';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
};

interface DeleteButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The delete action to execute */
  onDelete: () => Promise<void>;
  /** URL to redirect to after successful deletion */
  redirectTo?: string;
  /** Custom success message for the toast */
  successMessage?: string;
  /** Custom error message for the toast */
  errorMessage?: string;
  /** Confirmation button text */
  confirmText?: string;
  /** Tooltip text when not in confirm mode */
  tooltipText?: string;
  /** Tooltip text when in confirm mode */
  tooltipConfirmText?: string;
  /** Tooltip text for the cancel button */
  tooltipCancelText?: string;
  /** Whether to show tooltip */
  showTooltip?: boolean;
  /** Whether to show animated confirmation flow */
  showAnimation?: boolean;
  /** Custom callback when delete is successful */
  onDeleteSuccess?: () => void;
  /** Custom callback when delete fails */
  onDeleteError?: (error: unknown) => void;
}

export function DeleteButton({
  onDelete,
  redirectTo,
  successMessage,
  errorMessage,
  confirmText = 'Confirm Delete',
  tooltipText = 'Delete',
  tooltipConfirmText = 'Click to Confirm',
  tooltipCancelText = 'Click to Cancel',
  showTooltip = true,
  showAnimation = true,
  onDeleteSuccess,
  onDeleteError,
  className,
  variant = 'outline',
  size = 'icon',
  disabled,
  ...props
}: DeleteButtonProps) {
  const router = useRouter();
  const { showConfirm, isDeleting, confirm, cancel, executeDelete } = useDeleteConfirmation({
    successMessage,
    errorMessage,
  });

  const handleDelete = async () => {
    try {
      await executeDelete(onDelete, successMessage);
      onDeleteSuccess?.();
      
      // Handle redirect after successful deletion
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      onDeleteError?.(error);
    }
  };

  const ButtonComponent = showAnimation ? (
    <motion.div 
      layout
      className={cn('flex items-center gap-2', className)}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      <AnimatePresence mode="popLayout">
        {showConfirm && (
          <motion.div
            layout
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30
            }}
          >
            {showTooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size={size}
                      onClick={cancel}
                      disabled={disabled || isDeleting}
                    >
                      <ChevronLeftIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    sideOffset={4}
                    className="border border-border text-secondary-foreground bg-secondary"
                  >
                    {tooltipCancelText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                variant="outline" 
                size={size}
                onClick={cancel}
                disabled={disabled || isDeleting}
              >
                <ChevronLeftIcon />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        layout
        initial={false}
        animate={{
          width: showConfirm ? (size === "icon" ? 142 : 120) : (size === "icon" ? 34 : 48)
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className="overflow-hidden relative"
      >
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showConfirm ? "red" : variant} 
                  size={size}
                  onClick={showConfirm ? handleDelete : confirm}
                  disabled={disabled || isDeleting}
                  className="w-full whitespace-nowrap flex items-center justify-start px-2"
                  {...props}
                >
                  <DeleteIcon />
                  <AnimatePresence>
                    {showConfirm && (
                      <motion.span
                        key="confirm-text"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.1,
                          ease: "easeOut"
                        }}
                        className="inline-block"
                      >
                        {isDeleting ? "..." : confirmText}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="center"
                sideOffset={4}
                className="border border-border text-secondary-foreground bg-secondary"
              >
                {showConfirm ? tooltipConfirmText : tooltipText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button 
            variant={showConfirm ? "red" : variant} 
            size={size}
            onClick={showConfirm ? handleDelete : confirm}
            disabled={disabled || isDeleting}
            className="w-full whitespace-nowrap flex items-center justify-start px-2"
            {...props}
          >
            <DeleteIcon />
            <AnimatePresence>
              {showConfirm && (
                <motion.span
                  key="confirm-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.1,
                    ease: "easeOut"
                  }}
                  className="inline-block"
                >
                  {isDeleting ? "..." : confirmText}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}
      </motion.div>
    </motion.div>
  ) : (
    <div className={cn('flex items-center gap-1', className)}>
      {showConfirm && showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={size}
                onClick={cancel}
                disabled={disabled || isDeleting}
                className="h-fit w-fit p-2 m-0"
              >
                <ChevronLeftIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              sideOffset={4}
              className="border border-border text-secondary-foreground bg-secondary"
            >
              {tooltipCancelText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : showConfirm ? (
        <Button
          variant="outline"
          size={size}
          onClick={cancel}
          disabled={disabled || isDeleting}
          className="h-fit w-fit p-2 m-0"
        >
          <ChevronLeftIcon />
        </Button>
      ) : null}
      
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showConfirm ? "red" : variant}
                size={size}
                className="h-fit w-fit p-2 m-0 text-muted-foreground hover:text-primary"
                onClick={showConfirm ? handleDelete : confirm}
                disabled={disabled || isDeleting || !onDelete}
                {...props}
              >
                <DeleteIcon />
                {showConfirm && !showAnimation && (
                  <span className="ml-1">{isDeleting ? "..." : confirmText}</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              sideOffset={4}
              className="border border-border text-secondary-foreground bg-secondary"
            >
              {showConfirm ? tooltipConfirmText : tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          variant={showConfirm ? "red" : variant}
          size={size}
          className="h-fit w-fit p-2 m-0 text-muted-foreground hover:text-primary"
          onClick={showConfirm ? handleDelete : confirm}
          disabled={disabled || isDeleting || !onDelete}
          {...props}
        >
          <DeleteIcon />
          {showConfirm && !showAnimation && (
            <span className="">{isDeleting ? "..." : confirmText}</span>
          )}
        </Button>
      )}
    </div>
  );

  return ButtonComponent;
}

// Keep the old export for backward compatibility
export default DeleteButton;