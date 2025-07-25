import { getNoteById, getContacts, getMeetings } from "../_lib/queries"
import NoteForm from "../_components/form"
import { Contact, Meeting, NoteWithAssociations } from "../_lib/validations"
import { notFound } from "next/navigation"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  try {
    // Fetch the note and available data in parallel
    const [note, contactsResult, meetingsResult] = await Promise.all([
      getNoteById(id) as Promise<NoteWithAssociations>,
      getContacts(),
      getMeetings()
    ])


    return (
      <div className="container mx-auto p-1">
        <NoteForm
          initialNoteId={id}
          initialTitle={note.title || ""}
          initialContent={note.content || ""}
          initialContactIds={note.contacts?.map((contact: Contact) => contact.id) || []}
          initialMeetingIds={note.meetings?.map((meeting: Meeting) => meeting.id) || []}
          availableContacts={contactsResult.data || []}
          availableMeetings={meetingsResult.data || []}
        />
      </div>
    )
  } catch (error) {
    console.error("Error fetching note:", error)
    notFound()
  }
}