'use client'

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Users } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Contact, MeetingCardSummary } from "@/types";

import EditMeetingButtons from "./edit-meeting-buttons";

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

interface MeetingsListProps {
    initialMeetings: MeetingCardSummary[];
    initialContacts: Contact[];
}

export default function MeetingsList({ initialMeetings, initialContacts }: MeetingsListProps) {
  const [meetings, setMeetings] = useState<MeetingCardSummary[] | null>(initialMeetings);

  const handleMeetingUpdate = (updatedMeetingData: Partial<MeetingCardSummary>) => {
    setMeetings((currentMeetings) => {
      if (!currentMeetings) return null;
      return currentMeetings.map((m) => {
        if (m.id === updatedMeetingData.id) {
          return { ...m, ...updatedMeetingData };
        }
        return m;
      });
    });
  };

  const getSpeakerDisplayData = (meeting: MeetingCardSummary, contacts: Contact[] | null) => {
    // Extract speaker numbers from the speaker_names keys
    const speakerNumbers = meeting.speaker_names 
      ? Object.keys(meeting.speaker_names).map(key => parseInt(key, 10))
      : [];
      
    return speakerNumbers.sort((a, b) => a - b).map(speakerNum => {
      const contactId = meeting.speaker_names?.[speakerNum];
      const contact = contacts?.find((c: Contact) => c.id === contactId);
      const name = contact 
        ? (contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()) 
        : `Speaker ${speakerNum}`;
      return { speakerNumber: speakerNum, name };
    });
  };

  const groupMeetingsByDate = (meetings: MeetingCardSummary[] | null) => {
    if (!meetings) return {};
    
    return meetings.reduce((groups: { [key: string]: MeetingCardSummary[] }, meeting) => {
      if (meeting.meeting_at) {
        const date = format(parseISO(meeting.meeting_at), 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(meeting);
      }
      return groups;
    }, {});
  };

  const groupedMeetings = groupMeetingsByDate(meetings);

  return (
    <div className="flex flex-col gap-6 h-full overflow-auto">
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
              const speakers = getSpeakerDisplayData(meeting, initialContacts);
              return (
                <Card key={meeting.id} className="relative max-w-3xl group">
                  <div className="absolute top-1 right-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditMeetingButtons
                      meeting={meeting}
                      onMeetingUpdate={handleMeetingUpdate}
                    />
                  </div>
                  <CardHeader className="flex flex-col gap-2.5">
                    <CardTitle>
                      <Link
                        href={`/workspace/meetings/${meeting.id}`}
                        className=""
                      >
                        {meeting.title || 'Untitled Meeting'}
                      </Link>
                    </CardTitle>
                    {meeting.meeting_at && (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{format(new Date(meeting.meeting_at), "p")}</span>
                      </span>
                    )}
    
                    {speakers.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {speakers.map((speaker) => (
                          <Badge 
                            key={speaker.speakerNumber} 
                            variant="outline"
                            className={`${getSpeakerColor(speaker.speakerNumber)} border font-medium rounded-md`}
                          >
                            {speaker.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 mt-1.5 text-muted-foreground flex-shrink-0" />
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
      
      {meetings && meetings.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No meetings found.
        </div>
      )}
    </div>
  );
} 