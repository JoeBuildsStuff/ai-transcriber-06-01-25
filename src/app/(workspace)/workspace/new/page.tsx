'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/auth-context"
import Transcript from '@/components/transcript';
import { useTranscription } from '@/hooks/useTranscription';
import Summary from '@/components/summary';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function New() {
    const { user } = useAuth();
    const [showDropzone, setShowDropzone] = useState(true);
    const hideDropzoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        isTranscribing,
        formattedTranscript,
        summaryStatus,
        initiateTranscription,
        summary,
        isSummarizing,
        summaryError,
        resetTranscription,
    } = useTranscription();

    const maxFileSize = user ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const uploadPath = user?.id ? user.id : 'anonymous';

    const uploaderProps = useSupabaseUpload({
        bucketName: 'ai-transcriber-audio',
        path: uploadPath,
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'],
        maxFiles: 5,
        maxFileSize: maxFileSize,
        onUploadSuccess: (filePath: string) => {
            resetTranscription();
            initiateTranscription(filePath);
        },
    });

    useEffect(() => {
        if (uploaderProps.isSuccess) {
            if (hideDropzoneTimeoutRef.current) {
                clearTimeout(hideDropzoneTimeoutRef.current);
            }
            hideDropzoneTimeoutRef.current = setTimeout(() => {
                setShowDropzone(false);
            }, 0);
        } else if (!isTranscribing && !isSummarizing && formattedTranscript.length === 0 && !summary) {
            setShowDropzone(true);
            if (hideDropzoneTimeoutRef.current) {
                clearTimeout(hideDropzoneTimeoutRef.current);
                hideDropzoneTimeoutRef.current = null;
            }
        }

        return () => {
            if (hideDropzoneTimeoutRef.current) {
                clearTimeout(hideDropzoneTimeoutRef.current);
            }
        };
    }, [uploaderProps.isSuccess, isTranscribing, isSummarizing, formattedTranscript, summary]);

    let currentStatusMessage = summaryStatus;
    if (isTranscribing) {
        currentStatusMessage = summaryStatus || 'Transcribing audio...';
    } else if (isSummarizing) {
        currentStatusMessage = summaryStatus || 'Generating summary...';
    }

    const showStatusBox = isTranscribing || isSummarizing || (summaryStatus && !formattedTranscript.length && !summary);
    const showResultsTabs = formattedTranscript.length > 0 || summary;

    return (
        <div className="">
            <div className="w-full mx-auto">
                {showDropzone && (
                    <div className="w-full max-w-xl mx-auto">
                        <Dropzone {...uploaderProps}>
                            <DropzoneEmptyState />
                            <DropzoneContent />
                        </Dropzone>
                    </div>
                )}
                
                {showStatusBox && (
                     <div className="w-full max-w-xl mx-auto mt-4 p-4 border rounded-md bg-secondary/50">
                         <p className={`text-center text-secondary-foreground ${isTranscribing || isSummarizing ? 'animate-pulse' : ''}`}>{currentStatusMessage}</p>
                     </div>
                 )}

                {summaryError && !isSummarizing && (
                    <div className="w-full max-w-xl mx-auto mt-4 p-4 border rounded-md bg-destructive/20">
                        <p className="text-center text-destructive-foreground">Summary Error: {summaryError}</p>
                    </div>
                )}
                
                {showResultsTabs && (
                    <div className="mt-4">
                        <Tabs defaultValue="transcript" className="w-full max-w-3xl mx-auto">
                            <TabsList className="mb-5">
                                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                            </TabsList>
                            <TabsContent value="transcript">
                                {formattedTranscript.length > 0 ? (
                                    <Transcript formattedTranscript={formattedTranscript} />
                                ) : (
                                    !isTranscribing && <p className="text-center p-4">No transcript available or still loading.</p>
                                )}
                            </TabsContent>
                            <TabsContent value="summary">
                                {isSummarizing && !summary && (
                                    <div className="p-4 border rounded-md bg-secondary/50">
                                        <p className="text-center text-secondary-foreground animate-pulse">{summaryStatus || 'Generating summary...'}</p>
                                    </div>
                                )}
                                {summary && !isSummarizing && (
                                    <Summary summary={summary} />
                                )}
                                {summaryError && !isSummarizing && (
                                     <p className="text-center text-destructive p-4">Failed to generate summary: {summaryError}</p>
                                )}
                                {!isSummarizing && !summary && !summaryError && formattedTranscript.length > 0 && (
                                    <p className="text-center p-4">Summary will be generated shortly.</p>
                                )}
                                 {!isSummarizing && !summary && !summaryError && formattedTranscript.length === 0 && (
                                    <p className="text-center p-4">Please upload an audio file to generate a transcript and summary.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    );
}