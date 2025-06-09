'use client'

import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Users } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Contact, MeetingDetails } from "@/types";

import EditMeetingButtons from "./_components/edit-meeting-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import SpeakerAssociationModal from "./[meetingId]/_components/speaker-association-modal";

const getSpeakerColor = (speakerIndex: number) => {
  const colors = [
    "bg-blue-400/20 border-blue-600 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    "bg-green-400/20 border-green-600 text-green-800 dark:bg-green-900 dark:text-green-100",
    "bg-yellow-400/20 border-yellow-600 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    "bg-red-400/20 border-red-600 text-red-800 dark:bg-red-900 dark:text-red-100",
    "bg-purple-400/20 border-purple-600 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    "bg-pink-400/20 border-pink-600 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
    "bg-indigo-400/20 border-indigo-600 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
    "bg-teal-400/20 border-teal-600 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
  ];
  return colors[speakerIndex % colors.length];
};

export default function CalendarPage() {
  const [meetings, setMeetings] = useState<MeetingDetails[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState<number | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetails | null>(
    null,
  )

  const fetchMeetingsAndContacts = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/signin");
    }

    const { data: meetingsData, error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .select("id, title, created_at, updated_at, meeting_at, speaker_names, summary, user_id, audio_file_path, original_file_name, transcription, formatted_transcript, summary_jsonb, openai_response, audioUrl")
      .order("meeting_at", { ascending: false });

    if (error) {
      console.error(error);
      setMeetings([]);
    } else {
      setMeetings(meetingsData);
    }

    const { data: contactsData, error: contactsError } = await supabase
      .schema("ai_transcriber")
      .from("contacts")
      .select("id, displayName:display_name, firstName:first_name, lastName:last_name, notes, primaryEmail:primary_email, company")
      .order("created_at", { ascending: false });

    if (contactsError) {
      console.error(contactsError);
      setContacts([]);
    } else {
      setContacts(contactsData);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchMeetingsAndContacts();
  }, []);

  const handleMeetingUpdate = (updatedMeetingData: Partial<MeetingDetails>) => {
    setMeetings(currentMeetings => {
      if (!currentMeetings) return null;
      return currentMeetings.map(m => {
        if (m.id === updatedMeetingData.id) {
          return { ...m, ...updatedMeetingData };
        }
        return m;
      });
    });
  };

  const handleContactsUpdate = async () => {
    const { data: contactsData, error: contactsError } = await supabase
      .schema("ai_transcriber")
      .from("contacts")
      .select("id, displayName:display_name, firstName:first_name, lastName:last_name, notes, primaryEmail:primary_email, company")
      .order("created_at", { ascending: false });

    if (contactsError) {
      console.error(contactsError);
    } else {
      setContacts(contactsData);
    }
  };

  const handleOpenSpeakerModal = (
    meeting: MeetingDetails,
    speakerNumber: number,
  ) => {
    setSelectedMeeting(meeting)
    setSelectedSpeaker(speakerNumber)
    setIsSpeakerModalOpen(true)
  }

  const handleCloseSpeakerModal = () => {
    setIsSpeakerModalOpen(false)
    setSelectedSpeaker(null)
    setSelectedMeeting(null)
  }
  
  const getSpeakerDisplayData = (meeting: MeetingDetails, contacts: Contact[] | null) => {
    const words = meeting.transcription?.results?.channels[0]?.alternatives[0]?.words ?? [];
    const uniqueSpeakers = [...new Set(words.map(w => w.speaker).filter(s => s !== undefined))] as number[];
    
    return uniqueSpeakers.sort((a, b) => a - b).map(speakerNum => {
        const contactId = meeting.speaker_names?.[speakerNum];
        const contact = contacts?.find((c: Contact) => c.id === contactId);
        const name = contact 
            ? (contact.displayName || `${contact.firstName} ${contact.lastName}`.trim()) 
            : `Speaker ${speakerNum}`;
        return { speakerNumber: speakerNum, name };
    });
  };

  const groupMeetingsByDate = (meetings: MeetingDetails[] | null) => {
    if (!meetings) return {};
    
    return meetings.reduce((groups: { [key: string]: MeetingDetails[] }, meeting) => {
      const date = format(parseISO(meeting.meeting_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meeting);
      return groups;
    }, {});
  };

  const groupedMeetings = groupMeetingsByDate(meetings);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {[...Array(1)].map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-col gap-4 ml-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-53 w-full max-w-3xl rounded-xl" />
            ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groupedMeetings).map(([date, dateMeetings]) => (
        <div key={date} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold">{format(parseISO(date), 'EEEE, MMMM do, yyyy')}</span>
            <span className="text-sm text-muted-foreground">
              ({formatDistanceToNow(new Date(date), { addSuffix: true })})
            </span>
          </div>
          <div className="flex flex-col gap-4 ml-8">
            {dateMeetings.map((meeting) => {
              const speakers = getSpeakerDisplayData(meeting, contacts);
              return (
                <Card key={meeting.id} className="relative max-w-3xl group">
                  <div className="absolute top-1 right-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditMeetingButtons
                      meeting={meeting}
                      onMeetingUpdate={handleMeetingUpdate}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle><Link href={`/workspace/meetings/${meeting.id}`} className="">{meeting.title}</Link></CardTitle>
                    <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{format(new Date(meeting.meeting_at), "p")}</span>
                    </span>
    
                    {speakers.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {speakers.map((speaker) => (
                          <Badge 
                            key={speaker.speakerNumber} 
                            variant="outline"
                            className={`${getSpeakerColor(speaker.speakerNumber)} border font-medium rounded-md cursor-pointer`}
                            onClick={() => handleOpenSpeakerModal(meeting, speaker.speakerNumber)}
                          >
                            {speaker.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 mt-1.5 text-muted-foreground" />
                    <div className="prose prose-md max-w-none dark:prose-invert">
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {meeting.summary ? meeting.summary.substring(0, 200) + '...' : 'No summary available'}
                      </ReactMarkdown>
                    </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      
      {Object.keys(groupedMeetings).length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No meetings found.
        </div>
      )}

      {selectedMeeting && selectedSpeaker !== null && (
        <SpeakerAssociationModal
          isOpen={isSpeakerModalOpen}
          onClose={handleCloseSpeakerModal}
          meetingId={selectedMeeting.id}
          speakerNumber={selectedSpeaker}
          currentContactId={
            selectedMeeting.speaker_names?.[selectedSpeaker] || null
          }
          contacts={contacts || []}
          speakerContacts={selectedMeeting.speaker_names}
          onSpeakerContactsUpdate={updatedSpeakerContacts => {
            handleMeetingUpdate({
              id: selectedMeeting.id,
              speaker_names: updatedSpeakerContacts,
            })
          }}
          formattedTranscript={selectedMeeting.formatted_transcript || []}
          onSeekAndPlay={() => {}} // No audio player on this page
          onContactsUpdate={handleContactsUpdate}
        />
      )}
    </div>
  );
}