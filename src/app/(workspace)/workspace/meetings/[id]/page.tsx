'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMeeting } from "@/app/(workspace)/workspace/meetings/[id]/_lib/actions";
import { getMeetingSpeakers, getMeetingAttendeesWithContacts } from "@/actions/contacts";
import { getMeetingTags } from "@/actions/meetings";
import MeetingContent from "./_components/meeting-content";
import MeetingIdSkeleton from "./_components/skeleton";
import { Meetings } from "./_lib/validations";
import { MeetingSpeakerWithContact, MeetingAttendeeViewData, Tag } from "@/types";

export default function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const router = useRouter();
    const [id, setId] = useState<string>('');
    const [meetingData, setMeetingData] = useState<Meetings | null>(null);
    const [meetingSpeakers, setMeetingSpeakers] = useState<MeetingSpeakerWithContact[]>([]);
    const [meetingAttendees, setMeetingAttendees] = useState<MeetingAttendeeViewData[]>([]);
    const [meetingTags, setMeetingTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadParams = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);
        };
        loadParams();
    }, [params]);

    useEffect(() => {
        if (!id) return;
        
        const loadMeetingData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const [meeting, speakers, attendees, tags] = await Promise.all([
                    getMeeting(id),
                    getMeetingSpeakers(id),
                    getMeetingAttendeesWithContacts(id),
                    getMeetingTags(id)
                ]);

                if (!meeting || !meeting.data) {
                    setError('Meeting not found');
                    return;
                }

                setMeetingData(meeting.data);
                setMeetingSpeakers(speakers);
                setMeetingAttendees(attendees);
                setMeetingTags(tags);
            } catch (err) {
                setError('Failed to load meeting data');
                console.error('Error loading meeting data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadMeetingData();
    }, [id]);

    const handleUploadSuccess = () => {
        // Refresh the page to get updated data
        router.refresh();
        // Also manually reload the data
        if (id) {
            const reloadData = async () => {
                const [meeting, speakers, attendees, tags] = await Promise.all([
                    getMeeting(id),
                    getMeetingSpeakers(id),
                    getMeetingAttendeesWithContacts(id),
                    getMeetingTags(id)
                ]);

                if (meeting?.data) {
                    setMeetingData(meeting.data);
                    setMeetingSpeakers(speakers);
                    setMeetingAttendees(attendees);
                    setMeetingTags(tags);
                }
            };
            reloadData();
        }
    };

    if (isLoading) {
        return <MeetingIdSkeleton />;
    }

    if (error || !meetingData) {
        return <div>{error || 'Meeting not found'}</div>;
    }

    return (
        <MeetingContent 
            id={id}
            meetingData={meetingData}
            meetingSpeakers={meetingSpeakers}
            meetingAttendees={meetingAttendees}
            meetingTags={meetingTags}
            onUploadSuccess={handleUploadSuccess}
        />
    );
}
