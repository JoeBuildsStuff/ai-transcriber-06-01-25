import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MeetingsList from "./_components/meetings-list";
import { Contact, MeetingCardSummary } from "@/types";

export default async function MeetingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  const meetingsPromise = supabase
    .from("meetings")
    .select(
      "id, title, meeting_at, speaker_names, summary, original_file_name, formatted_transcript",
    )
    .order("meeting_at", { ascending: false });

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

  const meetings = (meetingsResponse.data as MeetingCardSummary[]) || [];
  const contacts = (contactsResponse.data as Contact[]) || [];

  return <MeetingsList initialMeetings={meetings} initialContacts={contacts} />;
}