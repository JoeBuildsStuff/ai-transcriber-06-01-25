"use client"

import { Button } from "@/components/ui/button"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { PencilRuler, Calendar, Clock, Circle, Pencil, Copy, SquareCheckBig } from "lucide-react"
import { MeetingsList } from "../_lib/validations"
import { useEffect, useState, useRef } from "react"
import { getMeeting } from "../_lib/actions"
import { format, formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserNotes from "@/app/(workspace)/workspace/meetings-server/[meetingId]/_components/user-notes"
import Summary from "@/components/summary"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import AudioPlayer from "@/components/audio-player"
import Transcript from "@/components/transcript"
import { ScrollArea } from "@/components/ui/scroll-area"
import MeetingEditModal from "@/app/(workspace)/workspace/meetings-server/[meetingId]/_components/meeting-edit-modal"
import { Meetings } from "../_lib/validations"
import { AudioPlayerRef, Contact, DeepgramWord, FormattedTranscriptGroup, MeetingDetails } from "@/types"
import { marked } from 'marked'

export function MeetingsDetailSheet({ meeting }: { meeting: MeetingsList }) {
  const [fullMeetingData, setFullMeetingData] = useState<Meetings | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdatingReviewed, setIsUpdatingReviewed] = useState(false)
  const [isEditDetailsDialogOpen, setIsEditDetailsDialogOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [currentAudioTime, setCurrentAudioTime] = useState(0)
  const audioPlayerRef = useRef<AudioPlayerRef>(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [copyButtonText, setCopyButtonText] = useState("Copy")
  const [copyIcon, setCopyIcon] = useState<"copy" | "check">("copy")

  const fetchContacts = async () => {
    try {
      const { getAllContacts } = await import('@/actions/contacts')
      const contactsData = await getAllContacts()
      setContacts(contactsData as Contact[])
    } catch (error) {
      console.error('Error fetching contacts for transcript:', error)
      // Don't show error to user since this is just for display enhancement
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (isOpen && !fullMeetingData) {
      getMeeting(meeting.id).then(({ data }) => {
        if (data) {
          setFullMeetingData(data)
        }
      })
    }
  }, [isOpen, meeting.id, fullMeetingData])

  const displayData = fullMeetingData || meeting
  const isReviewed = displayData.meeting_reviewed || false

  const handleSpeakerContactsUpdate = (speakerContacts: Record<number, string>) => {
    if (fullMeetingData) {
      setFullMeetingData((prev: Meetings | null) => prev ? { ...prev, speaker_names: speakerContacts } : null);
    }
  };

  const handleSeekAndPlay = (time: number) => {
    if (audioPlayerRef.current) {
        audioPlayerRef.current.seek(time);
    }
  };

  const handleUpdateMeetingDetails = async (details: { title: string; meeting_at: string }) => {
    if (!meeting.id || !fullMeetingData) return;

    const { title, meeting_at } = details;

    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
        toast.error("Title cannot be empty.");
        return;
    }

    const isTitleChanged = trimmedTitle !== (fullMeetingData.title || meeting.title);
    const isMeetingAtChanged = new Date(meeting_at).getTime() !== new Date(fullMeetingData.meeting_at || meeting.meeting_at || '').getTime();
    
    if (!isTitleChanged && !isMeetingAtChanged) {
        setIsEditDetailsDialogOpen(false);
        return;
    }

    const payload: { title?: string; meeting_at?: string } = {};
    if (isTitleChanged) payload.title = trimmedTitle;
    if (isMeetingAtChanged) payload.meeting_at = meeting_at;

    try {
        const response = await fetch(`/api/meetings/${meeting.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to update meeting details');
        }

        setFullMeetingData((prev: Meetings | null) => prev ? { ...prev, ...responseData.meeting } : null);
        toast.success('Meeting details updated!');
        setIsEditDetailsDialogOpen(false);
    } catch (err) {
        console.error("Error updating meeting details:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        toast.error('Failed to update meeting details', { description: errorMessage });
    }
  };

  const handleMeetingReviewedChange = async (checked: boolean) => {
    if (isUpdatingReviewed) return;
    
    // Store the previous value for potential rollback
    const previousValue = displayData.meeting_reviewed;
    
    // Optimistically update the UI immediately
    if (fullMeetingData) {
      setFullMeetingData((prev: Meetings | null) => prev ? { ...prev, meeting_reviewed: checked } : null);
    }
    setIsUpdatingReviewed(true);
    
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_reviewed: checked }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update meeting reviewed status');
      }
      
      // Success - the optimistic update was correct, show subtle confirmation
      toast.success(`Meeting marked as ${checked ? 'reviewed' : 'not reviewed'}`, {
        duration: 2000, // Shorter duration since it's just confirmation
      });
    } catch (err) {
      console.error("Error updating meeting reviewed status:", err);
      
      // Rollback the optimistic update
      if (fullMeetingData) {
        setFullMeetingData((prev: Meetings | null) => prev ? { ...prev, meeting_reviewed: previousValue } : null);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to update meeting status', { 
        description: errorMessage,
        duration: 4000, // Longer duration for errors
      });
    } finally {
      setIsUpdatingReviewed(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getSpeakerDisplayName = (speakerNumber: number): string => {
    // If no speaker contacts or contacts data, fall back to default
    if (!fullMeetingData?.speaker_names || !contacts || contacts.length === 0) {
      return `Speaker ${speakerNumber}`;
    }
  
    // Get the contact ID for this speaker
    const contactId = (fullMeetingData.speaker_names as Record<number, string>)[speakerNumber];
    if (!contactId) {
      return `Speaker ${speakerNumber}`;
    }
  
    // Find the contact in the contacts array
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
      return `Speaker ${speakerNumber}`;
    }
  
    // Return the best available display name
    return contact.display_name || 
           `${contact.first_name} ${contact.last_name}`.trim() || 
           contact.primary_email || 
           `Speaker ${speakerNumber}`;
  };

  const handleCopyToClipboard = async () => {
    const resetCopyButton = () => {
        setTimeout(() => {
            setCopyButtonText("Copy");
            setCopyIcon("copy");
        }, 2000);
    }

    if (activeTab === 'transcript') {
        if (displayableTranscript.length > 0) {
            // Use the same speaker name logic as the display
            const contentToCopy = displayableTranscript
                .map(
                    (group) =>
                        `${getSpeakerDisplayName(group.speaker)} [${formatTime(group.start)}]: ${group.text}`
                )
                .join("\n");
            try {
                await navigator.clipboard.writeText(contentToCopy);
                toast("Copied to clipboard", { description: "Transcript copied to clipboard with speaker names" });
                setCopyButtonText("Copied");
                setCopyIcon("check");
                resetCopyButton();
            } catch (err) {
                console.error("Failed to copy transcript: ", err);
                toast.error("Copy failed", {
                    description: "Failed to copy transcript to clipboard",
                });
            }
        } else {
            toast.error("Nothing to copy", { description: "The transcript is empty." });
        }
    } else if (activeTab === 'summary') {
        if (fullMeetingData?.summary_jsonb) {
          const sectionOrder = [
            'title',
            'date',
            'participants',
            'executive_summary',
            'discussion_outline',
            'decisions',
            'questions_asked',
            'action_items',
            'next_meeting_open_items',
          ];

          const formatTitle = (key: string): string => {
              if (!key) return "";
              return key
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
          };

          const sections = Object.entries(fullMeetingData.summary_jsonb).filter(
            ([key, value]) => key !== 'title' && key !== 'date' && value && typeof value === 'string' && value.trim() !== ""
          );

          sections.sort(([keyA], [keyB]) => {
            const indexA = sectionOrder.indexOf(keyA);
            const indexB = sectionOrder.indexOf(keyB);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });

          const summaryText = sections.map(([key, value]) => `## ${formatTitle(key)}\n\n${value}`).join('\n\n');
            try {
                // `marked` is async, so we wait for it
                const htmlContent = await marked(summaryText);
                await navigator.clipboard.write([
                    new ClipboardItem({
                        "text/plain": new Blob([summaryText], { type: "text/plain" }),
                        "text/html": new Blob([htmlContent], { type: "text/html" }),
                    }),
                ]);
                toast("Copied to clipboard", { description: "Summary copied to clipboard (formatted)" });
                setCopyButtonText("Copied");
                setCopyIcon("check");
                resetCopyButton();
            } catch (err) {
                console.error("Failed to copy summary: ", err);
                toast.error("Copy failed", {
                    description: "Failed to copy summary to clipboard",
                });
            }
        } else {
            toast.error("Nothing to copy", { description: "The summary is empty." });
        }
    }
  };

  // Use the stored formatted_transcript if available, otherwise try to generate from raw transcription
  let displayableTranscript: FormattedTranscriptGroup[] = [];
  if (fullMeetingData?.formatted_transcript && Array.isArray(fullMeetingData.formatted_transcript)) {
    displayableTranscript = fullMeetingData.formatted_transcript as unknown as FormattedTranscriptGroup[];
  } else if (fullMeetingData?.transcription && typeof fullMeetingData.transcription === 'object') {
    // Attempt to format if raw data exists but formatted_transcript is missing/empty
    try {
        const transcriptionData = fullMeetingData.transcription as Record<string, unknown>;
        const results = transcriptionData?.results as Record<string, unknown>;
        const channels = results?.channels as Array<Record<string, unknown>>;
        const alternatives = channels?.[0]?.alternatives as Array<Record<string, unknown>>;
        const words = alternatives?.[0]?.words as DeepgramWord[];
        
        if (words && Array.isArray(words)) {
            displayableTranscript = words.reduce((acc: FormattedTranscriptGroup[], word: DeepgramWord) => {
                const lastGroup = acc[acc.length - 1];
                if (lastGroup && word.speaker !== undefined && lastGroup.speaker === word.speaker) {
                    lastGroup.text += ` ${word.punctuated_word}`;
                } else {
                    acc.push({
                        speaker: word.speaker === undefined ? -1 : word.speaker,
                        start: word.start,
                        text: word.punctuated_word,
                    });
                }
                return acc;
            }, [] as FormattedTranscriptGroup[]);
        }
    } catch (formatError) {
        console.error("Error formatting transcript in detail sheet:", formatError);
        // displayableTranscript will remain empty, handled below
    }
  }

  // Get audio URL and duration from the transcription metadata
  const audioUrl = fullMeetingData?.audio_file_path ? `/api/meetings/${meeting.id}/audio` : null;
  const duration = fullMeetingData?.transcription && typeof fullMeetingData.transcription === 'object' 
    ? ((fullMeetingData.transcription as Record<string, unknown>)?.metadata as Record<string, unknown>)?.duration as number
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilRuler className="size-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="pb-4 w-[600px] sm:w-[700px] max-w-[90vw]">
        <Tabs defaultValue="summary" className="flex flex-col h-full" onValueChange={setActiveTab}>
          <SheetHeader className="pb-0">
            <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditDetailsDialogOpen(true)} 
                className="p-0 m-0 h-fit w-fit"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <SheetTitle className="flex-grow truncate">{displayData.title || "Meeting Details"}</SheetTitle>

            </div>
            <SheetDescription className="flex flex-col gap-2">
              {displayData.meeting_at ? (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4" />
                  {format(new Date(displayData.meeting_at), 'EEE, MMM d')}
                  <Clock className="size-4 ml-2" />
                  {format(new Date(displayData.meeting_at), 'h:mm a')}
                  <span className="text-muted-foreground">
                    ({formatDistanceToNow(new Date(displayData.meeting_at), { addSuffix: true })})
                  </span>
                </div>
              ) : (
                "Details for the meeting."
              )}
              <Button 
                variant={isReviewed ? "green" : "gray"} 
                size="sm" 
                className="items-center gap-2 w-fit"
                onClick={() => handleMeetingReviewedChange(!isReviewed)}
                disabled={isUpdatingReviewed}
              >
                {isReviewed ? (
                  <>
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Reviewed</span>
                  </>
                ) : (
                  <>
                    <Circle className="size-4" />
                    <span className="text-sm">Not Reviewed</span>
                  </>
                )}
              </Button>
            </SheetDescription>
          </SheetHeader>

          {/* Audio Player */}
          {audioUrl && duration ? (
            <div className="px-4 pb-4">
                <AudioPlayer
                    ref={audioPlayerRef}
                    audioUrl={audioUrl}
                    duration={duration}
                    onTimeUpdate={setCurrentAudioTime}
                />
            </div>
          ) : null}
 
          <div className="px-4 relative">
            <div className='flex justify-between items-center mb-2'>
              <TabsList>
                <TabsTrigger value="transcript">AI Transcript</TabsTrigger>
                <TabsTrigger value="summary">AI Summary</TabsTrigger>
                <TabsTrigger value="notes">My Notes</TabsTrigger>
              </TabsList>
              {(activeTab === 'transcript' || activeTab === 'summary') && (
                <Button variant="ghost" size="sm" onClick={handleCopyToClipboard} className="absolute right-4 top-14 z-99">
                  {copyIcon === 'copy' ? <Copy className="mr-2 h-4 w-4" /> : <SquareCheckBig className="mr-2 h-4 w-4" />}
                  {copyButtonText}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4">
              <TabsContent value="transcript">
                <Card className="h-full">
                  <CardContent>
                    {fullMeetingData?.transcription ? (
                      <ScrollArea className="h-[calc(100dvh-21.75rem)]">
                        <div className="pr-2">
                          {displayableTranscript.length > 0 ? (
                            <Transcript 
                              meetingId={meeting.id}
                              formattedTranscript={displayableTranscript}
                              speakerContacts={fullMeetingData?.speaker_names as Record<number, string> | null}
                              contacts={contacts}
                              onSpeakerContactsUpdate={handleSpeakerContactsUpdate}
                              onSeekAndPlay={handleSeekAndPlay}
                              onContactsUpdate={fetchContacts}
                              currentTime={currentAudioTime}
                            />
                          ) : (
                            <p className="text-center text-muted-foreground p-4">
                                Transcript data exists but could not be formatted, or is empty.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-center text-muted-foreground p-4">No transcript available for this meeting.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary">
              <ScrollArea className="h-[calc(100dvh-18rem)]">
                <Card className="h-full">
                  <CardContent className="">
                    {fullMeetingData ? (
                      fullMeetingData.summary_jsonb ? (
                        <Summary summary={fullMeetingData.summary_jsonb as Record<string, string>} />
                      ) : (
                        <p className="text-center text-muted-foreground p-4">No summary available for this meeting.</p>
                      )
                    ) : (
                      <div className="text-muted-foreground">Loading summary...</div>
                    )}
                  </CardContent>
                </Card>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="notes">
              {fullMeetingData ? (
                <ScrollArea className="h-[calc(100dvh-18rem)]">
                  <UserNotes userNotes={fullMeetingData.user_notes} meetingId={fullMeetingData.id} />
                </ScrollArea>
            ) : (
                <div className="text-muted-foreground">Loading notes...</div>
              )}
              </TabsContent>
            </div>
          </div>
          
          {/* <SheetFooter className="">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter> */}
        </Tabs>

        {/* Meeting Edit Modal */}
        <MeetingEditModal
          isOpen={isEditDetailsDialogOpen}
          onClose={() => setIsEditDetailsDialogOpen(false)}
          meeting={fullMeetingData as unknown as MeetingDetails}
          onSave={handleUpdateMeetingDetails}
        />
      </SheetContent>
    </Sheet>
  )
}
