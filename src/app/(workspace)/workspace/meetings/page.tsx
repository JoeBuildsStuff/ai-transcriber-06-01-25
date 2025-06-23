import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MeetingsList from "./_components/meetings-list";
import { Contact, MeetingCardSummary } from "@/types";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  
  // Parse pagination parameters
  const page = parseInt((params.page as string) || '1', 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Get total count for pagination
  const { count: totalMeetings } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true });

  const meetingsPromise = supabase
    .from("meetings")
    .select(
      "id, title, meeting_at, speaker_names, summary, original_file_name, formatted_transcript",
    )
    .order("meeting_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const contactsPromise = supabase
    .from("contacts")
    .select("id, display_name, first_name, last_name, company, primary_email")
    .order("created_at", { ascending: false });

  const [meetingsResponse, contactsResponse] = await Promise.all([
    meetingsPromise,
    contactsPromise,
  ]);

  if (meetingsResponse.error) {
    console.error("Error fetching meetings:", meetingsResponse.error);
  }

  if (contactsResponse.error) {
    console.error("Error fetching contacts:", contactsResponse.error);
  }

  // Add the missing transcription field to match MeetingCardSummary type
  const meetings = (meetingsResponse.data?.map(meeting => ({
    ...meeting,
    transcription: null
  })) as MeetingCardSummary[]) || [];
  const contacts = (contactsResponse.data as Contact[]) || [];
  
  const hasMore = totalMeetings ? (page * limit) < totalMeetings : false;

  return (
    <MeetingsList 
      initialMeetings={meetings} 
      initialContacts={contacts}
      currentPage={page}
      hasMore={hasMore}
      totalMeetings={totalMeetings || 0}
    />
  );
}