'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/auth-context";
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { useTranscription } from '@/hooks/useTranscription';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UploadAudioDialogProps {
  children: React.ReactNode; // To wrap the trigger button
  onOpenChange?: (open: boolean) => void;
}

export function UploadAudioDialog({ children, onOpenChange }: UploadAudioDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [displayStatus, setDisplayStatus] = useState<string>("");
  const [showGoToMeetingButton, setShowGoToMeetingButton] = useState<boolean>(false);

  const {
    initiateTranscription,
    currentMeetingId,
    isTranscribing,
    summaryStatus, // To show some status
    resetTranscription
  } = useTranscription();

  const maxFileSize = user ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  const uploadPath = user?.id ? user.id : 'anonymous';

  const uploader = useSupabaseUpload({
    bucketName: 'ai-transcriber-audio',
    path: uploadPath,
    allowedMimeTypes: [
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
        'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'
    ],
    maxFiles: 5, // Dialog typically handles one file at a time for this flow
    maxFileSize: maxFileSize,
    onUploadSuccess: (filePath: string, originalFileName: string) => {
      console.log('Upload success in dialog, initiating transcription:', filePath);
      resetTranscription(); // Reset previous state if any
      initiateTranscription(filePath, originalFileName);
      // Don't redirect here yet, wait for completion signal
    },
  });

  // Destructure stable setters from uploader to use in dependency arrays
  const { setFiles: setUploaderFiles, setErrors: setUploaderErrors, files: uploaderFiles, errors: uploaderErrors, loading: uploaderLoading, isSuccess: uploaderIsSuccess, onUpload: uploaderOnUpload } = uploader;

  const FINAL_SUMMARY_STATUS_FROM_HOOK = "Summary generated.";

  useEffect(() => {
    // Default states for each run
    let currentStatus = "";
    let shouldShowButton = false;

    if (uploaderErrors.length > 0) {
      // Errors are displayed by their own dedicated UI block
      currentStatus = ""; // Let error block handle messages
    } else if (uploaderLoading && !uploaderIsSuccess) {
      currentStatus = `Uploading: ${uploaderFiles[0]?.name || 'file'}...`;
    } else if (uploaderIsSuccess) { // Upload is done
      if (isTranscribing) {
        // isTranscribing is true during transcription and potentially initial summarization setup
        currentStatus = summaryStatus || 'Processing transcription...';
      } else if (currentMeetingId) { // Transcription part done, currentMeetingId is available
        if (summaryStatus === FINAL_SUMMARY_STATUS_FROM_HOOK) {
          currentStatus = 'Processing complete! Your meeting is ready.';
          shouldShowButton = true;
        } else if (summaryStatus) {
          // Summary is in progress or has another status
          currentStatus = summaryStatus;
        } else {
          // Fallback if summaryStatus is unexpectedly empty after transcription
          currentStatus = "Finalizing processing...";
        }
      } else if (!currentMeetingId && summaryStatus){
          currentStatus = summaryStatus; // e.g. initial status from transcription hook before meetingId is set
      } else {
          currentStatus = "Initializing transcription...";
      }
    } else if (uploaderFiles.length > 0 && !uploaderLoading && !uploaderIsSuccess) {
      currentStatus = "Ready to upload and transcribe.";
    }

    setDisplayStatus(currentStatus);
    setShowGoToMeetingButton(shouldShowButton);

  }, [
    uploaderLoading, uploaderIsSuccess, uploaderFiles, uploaderErrors, // from uploader
    isTranscribing, summaryStatus, currentMeetingId // from useTranscription
  ]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (!open) {
      // Reset states when dialog is closed manually
      setUploaderFiles([]);
      setUploaderErrors([]);
      resetTranscription();
      setDisplayStatus("");
      setShowGoToMeetingButton(false);
    }
  }, [setIsOpen, onOpenChange, setUploaderFiles, setUploaderErrors, resetTranscription]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload New Audio</DialogTitle>
          <DialogDescription>
            Select an audio file to transcribe and summarize. Max file size: {maxFileSize / (1024 * 1024)}MB.
          </DialogDescription>
        </DialogHeader>
        
        {!currentMeetingId && !showGoToMeetingButton && !uploaderLoading && !uploaderIsSuccess && (
          <div className="py-4">
            <Dropzone {...uploader}>
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
          </div>
        )}

        {displayStatus && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {displayStatus}
            </p>
            {/* You could add a progress bar here if desired, e.g., based on stages */}
            {/* <Progress value={...} className="w-full" /> */}
          </div>
        )}

        {uploaderErrors.length > 0 && (
            <div className="mt-2 text-sm text-destructive">
                {uploaderErrors.map(err => <p key={err.name}>{err.name}: {err.message}</p>)}
            </div>
        )}

        <DialogFooter className="mt-2">
            {uploaderFiles.length > 0 && !uploaderIsSuccess && !uploaderLoading && !currentMeetingId && !showGoToMeetingButton && uploaderErrors.length === 0 && (
                 <Button onClick={uploaderOnUpload} disabled={uploaderLoading || uploaderErrors.length > 0}>
                    {uploaderLoading ? 'Uploading...' : 'Upload & Transcribe'}
                 </Button>
            )}
            {showGoToMeetingButton && currentMeetingId && (
              <Button onClick={() => {
                router.push(`/workspace/meetings/${currentMeetingId}`);
                handleOpenChange(false); // Close dialog after navigation
              }}>
                Go to Meeting
              </Button>
            )}
          <DialogClose asChild>
            <Button variant="outline" onClick={() => handleOpenChange(false)} >Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 