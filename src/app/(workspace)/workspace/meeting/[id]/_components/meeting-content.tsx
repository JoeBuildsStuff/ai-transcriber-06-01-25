'use client';

import { useRef, useState } from 'react';
import { AudioPlayerRef } from '@/components/audio-player-lazy';
import MeetingHeader from './meeting-header';
import MeetingBody from './meeting-body';
import { Meetings } from '@/app/(workspace)/workspace/meetings/_lib/validations';
import { MeetingSpeakerWithContact, MeetingAttendeeViewData } from '@/types';

interface MeetingContentProps {
    id: string;
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    meetingAttendees: MeetingAttendeeViewData[];
}

export default function MeetingContent({ id, meetingData, meetingSpeakers, meetingAttendees }: MeetingContentProps) {
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
        <div className="flex flex-col gap-3 p-1 grid-rows-[auto_1fr] h-[calc(100vh-23rem)]">
            {/* Header */}
            <MeetingHeader 
                id={id} 
                meetingData={meetingData} 
                meetingAttendees={meetingAttendees}
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
            />
        </div>
    );
}
