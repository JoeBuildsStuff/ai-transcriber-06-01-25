'use client';

import { useRef, useState } from 'react';
import { AudioPlayerRef } from '@/components/audio-player-lazy';
import MeetingHeader from './meeting-header';
import MeetingBody from './meeting-body';
import { Meetings } from '@/app/(workspace)/workspace/meetings/[id]/_lib/validations';
import { MeetingSpeakerWithContact, MeetingAttendeeViewData } from '@/types';
import type { Database } from '@/types/supabase';

type TagRow = Database['ai_transcriber']['Tables']['tags']['Row'];

interface MeetingContentProps {
    id: string;
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    meetingAttendees: MeetingAttendeeViewData[];
    meetingTags: TagRow[];
    onUploadSuccess?: () => void;
}

export default function MeetingContent({ id, meetingData, meetingSpeakers, meetingAttendees, meetingTags, onUploadSuccess }: MeetingContentProps) {
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
        // TODO: is there a better way to calculate the height of the header from the navigation?
        // we just want the content to fill up the space where the bottom section below the header expands
        // note that when there is no audio if we use  h-[calc(100vh-23rem)] then the meetingbody is fine
        // and it expands to fill the Space but then with -5rem if tehre is audio and the bodycontent has Content
        // then the bottome section is too big so if we use -23 then the bottom section with content is fine
        // but then the empty state to add audio becomes too short
        <div className="flex flex-col gap-3 p-1 grid-rows-[auto_1fr] h-[calc(100vh-23rem)]">
            {/* Header */}
            <MeetingHeader 
                id={id} 
                meetingData={meetingData} 
                meetingAttendees={meetingAttendees}
                meetingTags={meetingTags}
                audioPlayerRef={audioPlayerRef}
                onTimeUpdate={handleTimeUpdate}
            />

            {/* Meeting Body */}
            <MeetingBody 
                meetingData={meetingData} 
                meetingSpeakers={meetingSpeakers} 
                meetingId={id}
                onSeekAndPlay={handleSeekAndPlay}
                currentTime={currentTime}
                onUploadSuccess={onUploadSuccess}
            />
        </div>
    );
}
