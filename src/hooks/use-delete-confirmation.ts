'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseDeleteConfirmationOptions {
  successMessage?: string;
  errorMessage?: string;
}

interface UseDeleteConfirmationReturn {
  showConfirm: boolean;
  isDeleting: boolean;
  confirm: () => void;
  cancel: () => void;
  executeDelete: (deleteAction: () => Promise<void>, customSuccessMessage?: string) => Promise<void>;
}

export function useDeleteConfirmation(options: UseDeleteConfirmationOptions = {}): UseDeleteConfirmationReturn {
  const {
    successMessage = 'Item deleted successfully',
    errorMessage = 'Failed to delete item',
  } = options;

  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirm = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const cancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const executeDelete = useCallback(
    async (deleteAction: () => Promise<void>, customSuccessMessage?: string) => {
      setIsDeleting(true);
      
      try {
        await deleteAction();
        toast.success("Successfully deleted: ", {description: customSuccessMessage || successMessage});
        setShowConfirm(false);
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error("Failed to delete: ", {description: errorMessage});
        // Keep confirmation state on error so user can retry
      } finally {
        setIsDeleting(false);
      }
    },
    [successMessage, errorMessage]
  );

  return {
    showConfirm,
    isDeleting,
    confirm,
    cancel,
    executeDelete,
  };
}
