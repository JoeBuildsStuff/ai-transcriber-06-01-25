'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MeetingTranscript from "./meeting-transcript";
import Summary from "./meeting-summary";
import MeetingNotes from "./meeting-notes";
import { Meetings } from "@/app/(workspace)/workspace/meetings/_lib/validations";
import { MeetingSpeakerWithContact } from "@/types";

interface MeetingBodyProps {
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    meetingId: string;
    onSeekAndPlay?: (time: number) => void;
    currentTime?: number;
}

export default function MeetingBody({ meetingData, meetingSpeakers: initialMeetingSpeakers, meetingId, onSeekAndPlay, currentTime = 0 }: MeetingBodyProps) {
    const [meetingSpeakers, setMeetingSpeakers] = useState<MeetingSpeakerWithContact[]>(initialMeetingSpeakers);

    return (
        <div className="h-full relative">
            <Tabs defaultValue="transcript" className="h-full">
                <TabsList>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    <TabsTrigger value="outline">Outline</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="transcript" className="h-full overflow-y-auto">
                    <MeetingTranscript 
                        meetingData={meetingData} 
                        meetingSpeakers={meetingSpeakers} 
                        meetingId={meetingId}
                        onSpeakersUpdate={setMeetingSpeakers}
                        onSeekAndPlay={onSeekAndPlay}
                        currentTime={currentTime}
                    />
                </TabsContent>
                <TabsContent value="outline" className="h-full overflow-y-auto">
                    {meetingData.summary_jsonb ? (
                        <Summary summary={meetingData.summary_jsonb as Record<string, string>} meetingId={meetingId} />
                    ) : (
                        <p className="text-center text-muted-foreground p-4">No summary available for this meeting.</p>
                    )}
                </TabsContent>
                <TabsContent value="notes" className="h-full overflow-y-auto">
                    <MeetingNotes meetingId={meetingId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
