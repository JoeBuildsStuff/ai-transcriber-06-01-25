import InputSupabase from "@/components/supabase/_components/input-supabase";
import { DateFieldSupabase, TimeFieldSupabase, DateInputSupabase } from "@/components/supabase/_components/datefield-rac-supabase";
import MeetingAudioPlayer from "@/components/audio-player-meeting";
import { Calendar, Clock, Map, Repeat, Tags, Type } from "lucide-react";
import { MeetingAttendeeViewData } from "@/types";
import AttendeesSelector from "./attendees-selector";
import MeetingTagsSelector from "./meeting-tags-selector";
import { RefObject } from "react";
import { AudioPlayerRef } from "@/components/audio-player-lazy";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteMeetings } from "../_lib/actions";
import { Database } from "@/types/supabase";

import MeetingRepeat from "./meeting-repeat";
import type { MeetingRecurrence } from "../_lib/validations";

type TagRow = Database["ai_transcriber"]["Tables"]["tags"]["Row"];

interface MeetingHeaderProps {
    id: string;
    meetingData: {
        title?: string;
        meeting_at?: string | null;
        location?: string;
        audio_file_path?: string;
        repeat?: string;
        recurrence?: MeetingRecurrence | null;
        recurrence_parent_id?: string | null;
        recurrence_instance_index?: number | null;
    };
    meetingAttendees: MeetingAttendeeViewData[];
    meetingTags: TagRow[];
    audioPlayerRef?: RefObject<AudioPlayerRef | null>;
    onTimeUpdate?: (time: number) => void;
}

export default function MeetingHeader({ id, meetingData, meetingAttendees, meetingTags, audioPlayerRef, onTimeUpdate }: MeetingHeaderProps) {

    return (
        <div className="flex flex-col gap-3">
            {/* title with delete button */}
            <div className="flex flex-row gap-2 items-center">
                {/* Title */}
                <div className="flex flex-row gap-2 items-center flex-1">
                    <Type className="size-4 shrink-0 text-muted-foreground" />
                    <InputSupabase table="meetings" field="title" id={id} initialValue={meetingData.title || ''} className="font-extralight border-none bg-input/30" />
                </div>
                {/* delete button */}
                <DeleteButton 
                    onDelete={async () => {
                        const result = await deleteMeetings([id]);
                        if (!result.success) throw new Error(result.error);
                    }}
                    redirectTo="/workspace/meetings"
                />
            </div>

            {/* Attendees */}
            <AttendeesSelector meetingId={id} meetingAttendees={meetingAttendees} />

            {/* Date */}
            <div className="flex flex-row gap-2 items-center">
                <DateFieldSupabase 
                    table="meetings" 
                    field="meeting_at" 
                    id={id} 
                    initialValue={meetingData.meeting_at || null}
                    className="flex flex-row gap-2 items-center font-extralight border-none"
                >
                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                    <DateInputSupabase />
                </DateFieldSupabase>
                <TimeFieldSupabase 
                    table="meetings" 
                    field="meeting_at" 
                    id={id} 
                    initialValue={meetingData.meeting_at || null}
                    className="flex flex-row gap-2 items-center font-extralight"
                >
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <DateInputSupabase />
                </TimeFieldSupabase>
                {/* Repeat */}
                <Repeat className="size-4 shrink-0 text-muted-foreground" />
                <MeetingRepeat 
                    meetingId={id}
                    meetingDate={meetingData.meeting_at}
                    recurrence={meetingData.recurrence}
                    recurrenceParentId={meetingData.recurrence_parent_id}
                />
                    
            </div>

            {/* Location */}
            <div className="flex flex-row gap-2 items-center">
                <Map className="size-4 shrink-0 text-muted-foreground " />
                <InputSupabase table="meetings" field="location" id={id} initialValue={meetingData?.location || ''} className="text-sm font-extralight border-none bg-input/30" />
            </div>


            {/* Meeting tags */}
            <div className="flex flex-row gap-2 items-center">
                <Tags className="size-4 shrink-0 text-muted-foreground" />
                <MeetingTagsSelector meetingId={id} initialTags={meetingTags} />
            </div>

            {/* Audio Player */}
            {meetingData.audio_file_path && (
            <MeetingAudioPlayer 
                meetingId={id} 
                duration={0} // Duration will be calculated from audio metadata when loaded
                ref={audioPlayerRef}
                onTimeUpdate={onTimeUpdate}
            />
            )}
        </div>
    );
}
