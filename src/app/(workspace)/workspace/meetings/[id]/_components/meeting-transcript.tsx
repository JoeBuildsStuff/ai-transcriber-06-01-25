import { FormattedTranscriptGroup, MeetingSpeakerWithContact } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Meetings } from "../_lib/validations";
import SpeakerBadgeHeader from "./speaker-badge-header";
import { useSpeakerUtils } from "@/hooks/use-speaker-utils";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import UploadAudio from "./upload-audio";

interface MeetingTranscriptProps {
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    meetingId: string;
    onSpeakersUpdate: (speakers: MeetingSpeakerWithContact[]) => void;
    onSeekAndPlay?: (time: number) => void;
    currentTime?: number;
    onUploadSuccess?: () => void;
}

export default function MeetingTranscript({ meetingData, meetingSpeakers, meetingId, onSpeakersUpdate, onSeekAndPlay, currentTime = 0, onUploadSuccess }: MeetingTranscriptProps) {
    const { getSpeakerColor, getSpeakerDisplayName } = useSpeakerUtils(meetingSpeakers);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const copyTranscript = async () => {
        if (!meetingData.formatted_transcript) return;
        
        const transcript = meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[];
        let transcriptText = `Meeting Transcript\n\n`;
        
        transcript.forEach((item: FormattedTranscriptGroup) => {
            const speakerName = getSpeakerDisplayName(item.speaker);
            const timestamp = formatTime(item.start);
            transcriptText += `[${timestamp}] ${speakerName}: ${item.text}\n\n`;
        });
        
        try {
            await navigator.clipboard.writeText(transcriptText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success("Transcript copied to clipboard");
        } catch (error) {
            console.error("Failed to copy transcript:", error);
            toast.error("Failed to copy transcript");
        }
    };

    // Function to determine if a transcript segment is currently active
    const isCurrentSegment = (item: FormattedTranscriptGroup, index: number, transcript: FormattedTranscriptGroup[]) => {
        const nextItem = transcript[index + 1];
        const endTime = nextItem ? nextItem.start : item.start + 5; // Default 5 seconds if no next item
        return currentTime >= item.start && currentTime < endTime;
    };

    // Auto-scroll to current segment
    useEffect(() => {
        if (!meetingData.formatted_transcript) return;
        
        const transcript = meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[];
        let currentSegmentIndex = -1;
        
        // Find the current segment
        for (let i = 0; i < transcript.length; i++) {
            const nextItem = transcript[i + 1];
            const endTime = nextItem ? nextItem.start : transcript[i].start + 5;
            const isCurrentItem = currentTime >= transcript[i].start && currentTime < endTime;
            
            if (isCurrentItem) {
                currentSegmentIndex = i;
                break;
            }
        }
        
        // Scroll to the current segment if found
        if (currentSegmentIndex !== -1 && segmentRefs.current[currentSegmentIndex]) {
            const currentElement = segmentRefs.current[currentSegmentIndex];
            if (currentElement && transcriptRef.current) {
                currentElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
    }, [currentTime, meetingData.formatted_transcript]);

    // Update refs when transcript changes
    useEffect(() => {
        if (meetingData.formatted_transcript) {
            const transcript = meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[];
            segmentRefs.current = segmentRefs.current.slice(0, transcript.length);
        }
    }, [meetingData.formatted_transcript]);

    // Check if there's no audio file or transcript
    const hasNoAudioOrTranscript = !meetingData.audio_file_path && !meetingData.formatted_transcript;

    // If no audio or transcript, show upload component
    if (hasNoAudioOrTranscript) {
        return (
            <Card className="h-full p-1 gap-2" ref={transcriptRef}>
                <UploadAudio 
                    meetingId={meetingId} 
                    onUploadSuccess={() => {
                        onUploadSuccess?.();
                    }}
                />
            </Card>
        );
    }

    return (
        <Card className="h-full p-1 gap-2" ref={transcriptRef}>
            <Button
                variant="ghost"
                size="sm"
                onClick={copyTranscript}
                className="absolute top-1 right-0"
                title="Copy transcript"
            >
                {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <ScrollArea className="h-full overflow-y-auto">
            {/* Speaker badges row */}
            <SpeakerBadgeHeader 
                meetingSpeakers={meetingSpeakers} 
                meetingId={meetingId}
                onSpeakersUpdate={onSpeakersUpdate}
                formattedTranscript={meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[]}
                onSeekAndPlay={onSeekAndPlay}
            />

            {/* Transcript */}
            {meetingData.formatted_transcript && (
                <div className="transcription">
                    {(meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[]).map((item: FormattedTranscriptGroup, index: number) => (
                        <div 
                            key={index} 
                            ref={(el) => { segmentRefs.current[index] = el; }}
                            className={`mb-1 p-2 rounded-xl transition-colors duration-200 ${
                                isCurrentSegment(item, index, meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[]) ? 'bg-secondary' : ''
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    variant="outline"
                                    className={`${getSpeakerColor(
                                        item.speaker
                                    )} border font-medium rounded-md cursor-pointer`}
                                >
                                    {getSpeakerDisplayName(item.speaker)}
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-muted-foreground"
                                    onClick={() => onSeekAndPlay?.(item.start)}
                                    title={`Jump to ${formatTime(item.start)} (will load audio if needed)`}
                                >
                                    {formatTime(item.start)}
                                </Button>
                            </div>
                            <div className="text-base font-extralight ml-4">{item.text}</div>
                        </div>
                    ))}
                </div>
            )}
            </ScrollArea>
        </Card>
    );
}
