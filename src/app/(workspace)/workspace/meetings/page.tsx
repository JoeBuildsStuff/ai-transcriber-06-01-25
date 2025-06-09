import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface Contact {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
}

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  meeting_at: string;
  speaker_names: { [key: string]: string } | null;
  summary: string;
}

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

export default async function CalendarPage() {
  const supabase = await createClient()

  // check user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/signin")
  }

  // get meetings
  const { data: meetings, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select("id, title, created_at, updated_at, meeting_at, speaker_names, summary")
    .order("meeting_at", { ascending: false })

  if (error) {
    console.error(error)
  }

  // get contacts
  const { data: contacts, error: contactsError } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .select("id, display_name, first_name, last_name")
    .order("created_at", { ascending: false })

  if (contactsError) {
    console.error(contactsError)
  }

  // Helper function to get contact name by ID
  const getContactName = (contactId: string): string => {
    const contact = contacts?.find((c: Contact) => c.id === contactId);
    return contact ? contact.display_name : "Unknown Speaker";
  };

  // Helper function to get speaker names for a meeting
  const getSpeakerNames = (speakerNames: { [key: string]: string } | null): string[] => {
    if (!speakerNames) return [];
    return Object.values(speakerNames).map(getContactName);
  };

  // Group meetings by date
  const groupMeetingsByDate = (meetings: Meeting[] | null) => {
    if (!meetings) return {};
    
    return meetings.reduce((groups: { [key: string]: Meeting[] }, meeting) => {
      const date = format(parseISO(meeting.meeting_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meeting);
      return groups;
    }, {});
  };

  const groupedMeetings = groupMeetingsByDate(meetings);

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
              const speakers = getSpeakerNames(meeting.speaker_names);
              return (
                <Card key={meeting.id}>
                  <CardHeader>
                    <CardTitle><Link href={`/workspace/meetings/${meeting.id}`} className="">{meeting.title}</Link></CardTitle>
                    <CardDescription>
                    <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 md:mr-1.5" />
                        {format(new Date(meeting.meeting_at), "p")}
                    </span>
                    </CardDescription>
                    {speakers.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium"><Users className="w-3.5 h-3.5" /></span>
                        {speakers.map((speaker, speakerIndex) => (
                          <Badge 
                            key={speakerIndex} 
                            variant="outline"
                            className={`${getSpeakerColor(speakerIndex)} border font-medium rounded-md`}
                          >
                            {speaker}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-md max-w-none dark:prose-invert">
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {meeting.summary ? meeting.summary.substring(0, 200) + '...' : 'No summary available'}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    Updated: {format(parseISO(meeting.updated_at), 'MMM d, yyyy h:mm a')}
                  </CardFooter>
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
    </div>
  );
}