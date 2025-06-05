'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
  import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AudioWaveform, FileText, Upload } from "lucide-react";
import AudioStepper from "./audio-stepper";

export default function DropzonePage() {

    const uploaderProps = useSupabaseUpload({
        bucketName: 'test',
        path: 'test',
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'],
        maxFiles: 1,
        maxFileSize: 100 * 1024 * 1024,
        onUploadSuccess: (filePath: string, originalFileName: string) => {
            console.log('Uploaded file:', filePath, originalFileName);
        },
    });

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="outline">Upload Audio</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>

                    {/* Title and description */}
                    <AlertDialogTitle>Upload Audio</AlertDialogTitle>
                    <AlertDialogDescription>Upload your audio file to begin the transcription process.</AlertDialogDescription>
                     
                     {/* Content */}
                    <div className="flex flex-col items-center justify-center space-y-4 mt-4">
                
                    {/* Stepper */}
                    <AudioStepper/>
     
                    {/* Dropzone */}
                    <Dropzone {...uploaderProps} className="w-full max-w-xl mx-auto">
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>

                    {/* Uploading */}
                    <Alert>
                        <Upload/>
                        <AlertTitle>
                        Uploading...
                        </AlertTitle>
                        <AlertDescription>
                        The audio file is being uploaded to the server.
                        </AlertDescription>
                    </Alert>

                    {/* Transcribing */}
                    <Alert>
                        <AudioWaveform/>
                        <AlertTitle>
                        Transcribing...
                        </AlertTitle>
                        <AlertDescription>
                        The audio file is being transcribed.
                        </AlertDescription>
                    </Alert>

                    {/* Summarizing */}
                    <Alert>
                        <FileText/>
                        <AlertTitle>
                        Summarizing...
                        </AlertTitle>
                        <AlertDescription>
                        The transcript is being summarized.
                        </AlertDescription>
                    </Alert>
                    </div>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancle</AlertDialogCancel>
                    <AlertDialogAction>Next</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
