'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MeetingTranscript from "./meeting-transcript";
import Summary from "./meeting-outline";
import MeetingNotes from "./meeting-notes";
import { Meetings } from "@/app/(workspace)/workspace/meetings/[id]/_lib/validations";
import { FormattedTranscriptGroup, MeetingSpeakerWithContact, SpeakerIdentifyResponse } from "@/types";

interface MeetingBodyProps {
    meetingData: Meetings;
    meetingSpeakers: MeetingSpeakerWithContact[];
    speakerSuggestions: SpeakerIdentifyResponse;
    meetingId: string;
    onSeekAndPlay?: (time: number) => void;
    currentTime?: number;
    onUploadSuccess?: () => void;
}

export default function MeetingBody({
    meetingData,
    meetingSpeakers: initialMeetingSpeakers,
    speakerSuggestions,
    meetingId,
    onSeekAndPlay,
    currentTime = 0,
    onUploadSuccess,
}: MeetingBodyProps) {
    const [meetingSpeakers, setMeetingSpeakers] = useState<MeetingSpeakerWithContact[]>(initialMeetingSpeakers);

    const speakerDetails = meetingSpeakers.reduce<Record<string, string>>((acc, speaker) => {
        const speakerKey = speaker.speaker_index.toString();
        const fullName = [speaker.contact?.first_name, speaker.contact?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
        acc[speakerKey] = fullName || speaker.speaker_name || `Speaker ${speaker.speaker_index}`;
        return acc;
    }, {});

    useEffect(() => {
        setMeetingSpeakers(initialMeetingSpeakers);
    }, [initialMeetingSpeakers]);

    return (
        <div className="h-full relative">
            <Tabs defaultValue="transcript" className="h-full">
                <TabsList>
                    <TabsTrigger value="transcript" className="font-light">Transcript</TabsTrigger>
                    <TabsTrigger value="outline" className="font-light">Outline</TabsTrigger>
                    <TabsTrigger value="notes" className="font-light">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="transcript" className="h-full overflow-y-auto">
                    <MeetingTranscript 
                        meetingData={meetingData} 
                        meetingSpeakers={meetingSpeakers} 
                        speakerSuggestions={speakerSuggestions}
                        meetingId={meetingId}
                        onSpeakersUpdate={setMeetingSpeakers}
                        onSeekAndPlay={onSeekAndPlay}
                        currentTime={currentTime}
                        onUploadSuccess={onUploadSuccess}
                    />
                </TabsContent>
                <TabsContent value="outline" className="h-full overflow-y-auto">
                    <Summary 
                        outline={meetingData.summary_jsonb as Record<string, string> || {}} 
                        meetingId={meetingId}
                        audioFilePath={meetingData.audio_file_path}
                        formattedTranscript={meetingData.formatted_transcript as unknown as FormattedTranscriptGroup[] | null}
                        speakerDetails={speakerDetails}
                        onUploadSuccess={onUploadSuccess}
                    />
                </TabsContent>
                <TabsContent value="notes" className="h-full overflow-y-auto">
                    <MeetingNotes meetingId={meetingId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
