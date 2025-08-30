// b5bdf5b0-4ba6-4713-a734-c0c90db33d0b

import { getMeeting } from "@/app/(workspace)/workspace/meetings/_lib/actions";
import { getMeetingSpeakers, getMeetingAttendeesWithContacts } from "@/actions/contacts";
import MeetingContent from "./_components/meeting-content";
import { Meetings } from "../../meetings/_lib/validations";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const [meeting, meetingSpeakers, meetingAttendees] = await Promise.all([
        getMeeting(id),
        getMeetingSpeakers(id),
        getMeetingAttendeesWithContacts(id)
    ])

    if (!meeting || !meeting.data) {
        return <div>Meeting not found</div>
    }

    const meetingData: Meetings = meeting.data

    return (
        <MeetingContent 
            id={id}
            meetingData={meetingData}
            meetingSpeakers={meetingSpeakers}
            meetingAttendees={meetingAttendees}
        />
    );
}
