'use client';

import { useRef, useState } from 'react';
import { AudioPlayerRef } from '@/components/audio-player-lazy';
import { cn } from '@/lib/utils';
import MeetingHeader from './meeting-header';
import MeetingBody from './meeting-body';
import { Meetings } from '@/app/(workspace)/workspace/meetings/[id]/_lib/validations';
import { MeetingSpeakerWithContact, MeetingAttendeeViewData, SpeakerIdentifyResponse } from '@/types';
import type { Database } from '@/types/supabase';

type TagRow = Database['ai_transcriber']['Tables']['tags']['Row'];

interface MeetingContentProps {
    id: string;
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    speakerSuggestions: SpeakerIdentifyResponse;
    meetingAttendees: MeetingAttendeeViewData[];
    meetingTags: TagRow[];
    onUploadSuccess?: () => void;
    variant?: 'page' | 'sheet';
}

export default function MeetingContent({
    id,
    meetingData,
    meetingSpeakers,
    speakerSuggestions,
    meetingAttendees,
    meetingTags,
    onUploadSuccess,
    variant = 'page',
}: MeetingContentProps) {
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const [currentTime, setCurrentTime] = useState(0);

    const handleSeekAndPlay = (time: number) => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.seek(time);
        }
    };

    const handleTimeUpdate = (time: number) => {
        setCurrentTime(time);
    };

    return (
        <div
            className={cn(
                "grid-rows-[auto_1fr] flex flex-col gap-3",
                variant === 'page' && "h-[calc(100vh-23rem)] p-1",
                variant === 'sheet' && "h-full min-h-0 overflow-hidden p-4 pr-10"
            )}
        >
            {/* Header */}
            <MeetingHeader 
                id={id} 
                meetingData={meetingData} 
                meetingAttendees={meetingAttendees}
                meetingTags={meetingTags}
                audioPlayerRef={audioPlayerRef}
                onTimeUpdate={handleTimeUpdate}
                onAudioReset={onUploadSuccess}
            />

            {/* Meeting Body */}
            <MeetingBody 
                meetingData={meetingData} 
                meetingSpeakers={meetingSpeakers} 
                speakerSuggestions={speakerSuggestions}
                meetingId={id}
                onSeekAndPlay={handleSeekAndPlay}
                currentTime={currentTime}
                onUploadSuccess={onUploadSuccess}
            />
        </div>
    );
}
