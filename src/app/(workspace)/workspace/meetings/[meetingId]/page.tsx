'use client'

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; // To get meetingId from URL and useRouter
import Transcript from '@/components/transcript';
import Summary from '@/components/summary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { AlertCircle, Trash2, Pencil, CalendarDays, Clock, Ellipsis, FileJson2, Copy, SquareCheckBig, RefreshCw, Loader2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { marked } from 'marked';
import MeetingEditModal from './_components/meeting-edit-modal';
import LazyAudioPlayer from '@/components/lazy-audio-player';
import { AudioPlayerRef, Contact, DeepgramTranscription, DeepgramWord, FormattedTranscriptGroup, MeetingDetails } from '@/types';
import UploadAudio from './_components/upload-audio';
import UserNotes from './_components/user-notes';
import { Badge } from '@/components/ui/badge';

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDetailsDialogOpen, setIsEditDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showDeepgramDialog, setShowDeepgramDialog] = useState(false);
  const [showOpenAIDialog, setShowOpenAIDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [copyButtonText, setCopyButtonText] = useState("Copy");
  const [copyIcon, setCopyIcon] = useState<"copy" | "check">("copy");
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [deepgramCopyIcon, setDeepgramCopyIcon] = useState<"copy" | "check">("copy");
  const [openAICopyIcon, setOpenAICopyIcon] = useState<"copy" | "check">("copy");
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [isUpdatingReviewed, setIsUpdatingReviewed] = useState(false);
  const [updatingAttendeeId, setUpdatingAttendeeId] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      // TODO: Align approach for actions as either @/actions or @/app/(workspace)/workspace/contacts/_lib/actions
      const { getAllContacts } = await import('../../contacts/_lib/queries')
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

  const handleSpeakerContactsUpdate = (speakerContacts: Record<number, string>) => {
    setMeeting(prev => prev ? { ...prev, speaker_names: speakerContacts } : null);
  };

  const handleSeekAndPlay = (time: number) => {
    if (audioPlayerRef.current) {
        audioPlayerRef.current.seek(time);
    }
  };

  useEffect(() => {
    if (meetingId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/meetings/${meetingId}`)
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(errorData.error || `Failed to fetch meeting details (status: ${res.status})`);
          }
          return res.json();
        })
        .then(data => {
          setMeeting(data as MeetingDetails);
        })
        .catch(err => {
          console.error("Error fetching meeting details:", err);
          setError(err.message || "An unknown error occurred");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [meetingId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getSpeakerDisplayName = (speakerNumber: number): string => {
    // If no speaker contacts or contacts data, fall back to default
    if (!meeting?.speaker_names || !contacts || contacts.length === 0) {
      return `Speaker ${speakerNumber}`;
    }
  
    // Get the contact ID for this speaker
    const contactId = meeting.speaker_names[speakerNumber];
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
          if (meeting?.formatted_transcript && meeting.formatted_transcript.length > 0) {
              // Use the same speaker name logic as the display
              const contentToCopy = meeting.formatted_transcript
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
          if (meeting?.summary_jsonb) {
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

            const sections = Object.entries(meeting.summary_jsonb).filter(
              ([key, value]) => key !== 'title' && key !== 'date' && value && value.trim() !== ""
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

  const handleJsonCopy = async (content: DeepgramTranscription | string | null, type: 'Deepgram' | 'OpenAI') => {
    const setIcon = type === 'Deepgram' ? setDeepgramCopyIcon : setOpenAICopyIcon;

    if (!content) {
        toast.error(`No ${type} data to copy.`, {
            description: "The content is empty or not available.",
        });
        return;
    }

    let textToCopy = '';
    if (typeof content === 'string') {
        try {
            const parsedJson = JSON.parse(content);
            textToCopy = JSON.stringify(parsedJson, null, 2);
        } catch {
            textToCopy = content; 
        }
    } else {
        textToCopy = JSON.stringify(content, null, 2);
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        toast("Copied to clipboard", {
            description: `The ${type} response has been copied.`,
        });
        setIcon("check");
        setTimeout(() => setIcon("copy"), 2000);
    } catch (err) {
        console.error(`Failed to copy ${type} response: `, err);
        toast.error("Copy failed", {
            description: `Could not copy the ${type} response to the clipboard.`,
        });
    }
  };

  const refreshMeetingData = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (response.ok) {
        const updatedMeeting = await response.json();
        setMeeting(updatedMeeting);
      }
    } catch (error) {
      console.error("Error refreshing meeting data:", error);
    }
  };

  const handleUpdateMeetingDetails = async (details: { title: string; meeting_at: string }) => {
    if (!meetingId || !meeting) return;

    const { title, meeting_at } = details;

    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
        toast.error("Title cannot be empty.");
        return;
    }

    const isTitleChanged = trimmedTitle !== (meeting.title || meeting.original_file_name);
    const isMeetingAtChanged = new Date(meeting_at).getTime() !== new Date(meeting.meeting_at).getTime();
    
    if (!isTitleChanged && !isMeetingAtChanged) {
        setIsEditDetailsDialogOpen(false);
        return;
    }

    const payload: { title?: string; meeting_at?: string } = {};
    if (isTitleChanged) payload.title = trimmedTitle;
    if (isMeetingAtChanged) payload.meeting_at = meeting_at;

    try {
        const response = await fetch(`/api/meetings/${meetingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to update meeting details');
        }

        // Refresh the entire meeting data to get updated attendees
        await refreshMeetingData();
        toast.success('Meeting details updated!');
        setIsEditDetailsDialogOpen(false);
    } catch (err) {
        console.error("Error updating meeting details:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        toast.error('Failed to update meeting details', { description: errorMessage });
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meetingId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });
      const responseData = await response.json(); 

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete meeting');
      }

      toast.success('Meeting deleted successfully!');
      router.push('/workspace/meetings'); // Redirect to a general page after deletion
      // Optionally, you might want to trigger a refresh of the meetings list in the sidebar
      // This can be done via a shared state/context or by emitting an event
      setIsDeleteDialogOpen(false); // Close dialog on success
    } catch (err) {
      console.error("Error deleting meeting:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to delete meeting', { description: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReprocess = async () => {
    if (!meeting) {
        toast.error("Meeting data not available.");
        return;
    }
    if (isReprocessing) {
        toast.info("A reprocessing task is already in progress.");
        return;
    }

    setIsReprocessing(true);
    const processToastId = toast.loading(`Reprocessing ${activeTab}...`);

    try {
        if (activeTab === 'summary') {
            await reprocessSummary(processToastId);
        } else if (activeTab === 'transcript') {
            await reprocessTranscript(processToastId);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during reprocessing.";
        console.error(`Error reprocessing ${activeTab}:`, err);
        toast.error(`Failed to reprocess ${activeTab}`, {
            id: processToastId,
            description: errorMessage,
        });
    } finally {
        setIsReprocessing(false);
        // Refetch data after any kind of reprocessing
        fetch(`/api/meetings/${meetingId}`)
            .then(res => res.json())
            .then(data => {
                setMeeting(data as MeetingDetails);
            }).catch(err => {
                console.error("Error refetching meeting details:", err);
                toast.error("Failed to refresh meeting data.");
            });
    }
  };

  const reprocessSummary = async (toastId: string | number, transcriptToSummarize?: FormattedTranscriptGroup[]) => {
    const transcript = transcriptToSummarize || meeting?.formatted_transcript;
    if (!transcript) {
        throw new Error("Formatted transcript is not available for summarization.");
    }

    const speakerDetails: Record<number, { displayName: string; notes?: string }> = {};
    if (meeting?.speaker_names && contacts) {
        for (const speakerNumStr in meeting.speaker_names) {
            const speakerNum = parseInt(speakerNumStr, 10);
            const contactId = meeting.speaker_names[speakerNum];
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
                speakerDetails[speakerNum] = {
                    displayName: contact.display_name || `${contact.first_name} ${contact.last_name}`.trim(),
                    notes: contact.notes || ''
                };
            }
        }
    }

    toast.loading("Generating new summary...", { id: toastId });
    const summarizeResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, meetingId: meeting!.id, speakerDetails, user_notes: meeting?.user_notes }),
    });

    if (!summarizeResponse.ok || !summarizeResponse.body) {
        const errorBody = await summarizeResponse.text();
        throw new Error(`Summarization API request failed: ${errorBody}`);
    }

    const reader = summarizeResponse.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedData = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulatedData += decoder.decode(value, { stream: true });

        let eventSeparatorIndex;
        while ((eventSeparatorIndex = accumulatedData.indexOf('\n\n')) !== -1) {
            const eventDataString = accumulatedData.substring(0, eventSeparatorIndex);
            accumulatedData = accumulatedData.substring(eventSeparatorIndex + 2);

            if (eventDataString.startsWith('data:')) {
                const jsonString = eventDataString.substring(5).trim();
                if (jsonString) {
                    try {
                        const eventData = JSON.parse(jsonString);
                        if (eventData.message) {
                            toast.loading(eventData.message, { id: toastId });
                        }
                    } catch (e) {
                        console.error('Error parsing summary SSE:', e);
                    }
                }
            }
        }
    }
    toast.success("Summary reprocessed successfully!", { id: toastId });
  };

  const reprocessTranscript = async (toastId: string | number) => {
    if (!meeting) throw new Error("Meeting data is missing.");

    toast.loading("Initiating re-transcription...", { id: toastId });
    const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filePath: meeting.audio_file_path,
            originalFileName: meeting.original_file_name,
            meetingId: meeting.id, // Assumes API can handle updates
        }),
    });

    if (!transcribeResponse.ok || !transcribeResponse.body) {
        const errorBody = await transcribeResponse.text();
        throw new Error(`Transcription API request failed: ${errorBody}`);
    }

    const reader = transcribeResponse.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedData = '';
    let fullTranscriptionResponse: DeepgramTranscription | null = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulatedData += decoder.decode(value, { stream: true });

        let eventSeparatorIndex;
        while ((eventSeparatorIndex = accumulatedData.indexOf('\n\n')) !== -1) {
            const eventDataString = accumulatedData.substring(0, eventSeparatorIndex);
            accumulatedData = accumulatedData.substring(eventSeparatorIndex + 2);

            if (eventDataString.startsWith('data:')) {
                const jsonString = eventDataString.substring(5).trim();
                if (jsonString) {
                    try {
                        const eventData = JSON.parse(jsonString);
                        if (eventData.status) {
                            toast.loading(eventData.status, { id: toastId });
                        }
                        if (eventData.results) {
                            fullTranscriptionResponse = eventData;
                        }
                    } catch (e) {
                        console.error('Error parsing transcription SSE:', e);
                    }
                }
            }
        }
    }

    if (!fullTranscriptionResponse || !fullTranscriptionResponse.results) {
        throw new Error("Did not receive full transcription results from the stream.");
    }
    
    toast.loading("Formatting transcript...", { id: toastId });
    const words = fullTranscriptionResponse.results.channels[0].alternatives[0].words;
    let newFormattedTranscript: FormattedTranscriptGroup[] = [];

    if (words && words.length > 0) {
        newFormattedTranscript = words.reduce((acc: FormattedTranscriptGroup[], word: DeepgramWord) => {
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

    // Now re-summarize with the new transcript
    await reprocessSummary(toastId, newFormattedTranscript);
    toast.success("Transcript reprocessed and re-summarized successfully!", { id: toastId });
  }

  const handleMeetingReviewedChange = async (checked: boolean) => {
    if (!meeting || isUpdatingReviewed) return;
    
    // Store the previous value for potential rollback
    const previousValue = meeting.meeting_reviewed;
    
    // Optimistically update the UI immediately
    setMeeting(prev => prev ? { ...prev, meeting_reviewed: checked } : null);
    setIsUpdatingReviewed(true);
    
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
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
      setMeeting(prev => prev ? { ...prev, meeting_reviewed: previousValue } : null);
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to update meeting status', { 
        description: errorMessage,
        duration: 4000, // Longer duration for errors
      });
    } finally {
      setIsUpdatingReviewed(false);
    }
  };

  const cycleAttendanceStatus = (currentStatus: 'present' | 'absent' | 'unknown'): 'present' | 'absent' | 'unknown' => {
    const statusOrder: ('present' | 'absent' | 'unknown')[] = ['unknown', 'present', 'absent'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    return statusOrder[nextIndex];
  };



  const handleAttendanceStatusChange = async (attendeeId: string, currentStatus: 'present' | 'absent' | 'unknown') => {
    if (!meeting || updatingAttendeeId === attendeeId) return;
    
    const newStatus = cycleAttendanceStatus(currentStatus);
    
    // Store the previous attendees for potential rollback
    const previousAttendees = meeting.attendees;
    
    // Optimistically update the UI immediately
    setMeeting(prev => {
      if (!prev || !prev.attendees) return prev;
      
      return {
        ...prev,
        attendees: prev.attendees.map(attendee => 
          attendee.id === attendeeId 
            ? { ...attendee, attendance_status: newStatus }
            : attendee
        )
      };
    });
    
    setUpdatingAttendeeId(attendeeId);
    
    try {
      const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_status: newStatus }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update attendance status');
      }
      
      // Success - the optimistic update was correct, show subtle confirmation
      toast.success(`Attendance marked as ${newStatus}`, {
        duration: 2000,
      });
    } catch (err) {
      console.error("Error updating attendance status:", err);
      
      // Rollback the optimistic update
      setMeeting(prev => prev ? { ...prev, attendees: previousAttendees } : null);
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to update attendance status', { 
        description: errorMessage,
        duration: 4000,
      });
    } finally {
      setUpdatingAttendeeId(null);
    }
  };

  if (isLoading) {
    return (
    <div className="flex flex-col space-y-4 pt-2 h-full">
      <div className="w-full h-16 flex flex-row items-start justify-between" >
          <div className="flex flex-col w-96 h-full space-y-2" >
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-5" />
          </div>
          <Skeleton className="w-10 h-10" />
      </div>
      <div className="w-full h-19 " >
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
      <div className="w-full h-10 flex flex-row items-start justify-between" >
        <Skeleton className="w-45 h-10" />
        <div className="flex flex-row items-center space-x-2" >
          <Skeleton className="w-15 h-8" />
          <Skeleton className="w-15 h-8" />
        </div>
      </div>
      <div className="w-full flex-1" >
        <Skeleton className="w-full h-full rounded-xl p-6 space-y-2" >
          <CardTitle className="text-lg">Meeting Transcript</CardTitle>
          <CardDescription className="text-sm">Formatted transcript of the meeting audio, with speaker labels if available.</CardDescription>
        </Skeleton>
      </div>
    </div>
    );
  }

  if (error) {
    return (
      <Card className="m-4 md:m-6">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="w-5 h-5 mr-2" /> Error Loading Meeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please check the meeting ID or try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!meeting) {
    return (
        <Card className="m-4 md:m-6">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" /> Meeting Not Found
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>The requested meeting could not be found or you may not have access to it.</p>
            </CardContent>
        </Card>
    );
  }

  // Use the stored formatted_transcript if available, otherwise try to generate from raw transcription
  let displayableTranscript: FormattedTranscriptGroup[] = [];
  if (meeting.formatted_transcript && meeting.formatted_transcript.length > 0) {
    displayableTranscript = meeting.formatted_transcript;
  } else if (meeting.transcription && meeting.transcription.results?.channels?.[0]?.alternatives?.[0]?.words) {
    // Attempt to format if raw data exists but formatted_transcript is missing/empty
    // This logic is similar to the one in useTranscription hook
    try {
        displayableTranscript = meeting.transcription.results.channels[0].alternatives[0].words.reduce((acc: FormattedTranscriptGroup[], word: DeepgramWord) => {
            const lastGroup = acc[acc.length - 1];
            if (lastGroup && word.speaker !== undefined && lastGroup.speaker === word.speaker) {
                lastGroup.text += ` ${word.punctuated_word}`;
            } else {
                acc.push({
                    speaker: word.speaker === undefined ? -1 : word.speaker, // Handle undefined speaker gracefully
                    start: word.start,
                    text: word.punctuated_word,
                });
            }
            return acc;
        }, [] as FormattedTranscriptGroup[]);
    } catch (formatError) {
        console.error("Error formatting transcript on detail page:", formatError);
        // displayableTranscript will remain empty, handled below
    }
  }

  return (
    <div className="flex flex-col h-full space-y-2 ">
      {/* Meeting Header */}
        <div className="flex flex-row items-start justify-between">
            <div className="flex-grow min-w-0 space-y-2">
              <div className="flex flex-row justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl md:text-2xl font-semibold flex items-center min-w-0">
                        <span className="truncate">
                          {meeting?.title || meeting?.original_file_name || "Meeting Details"}
                        </span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditDetailsDialogOpen(true)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2"> {/* Container for buttons */} 
              <Button 
                variant={meeting?.meeting_reviewed ? "green" : "gray"} 
                size="sm" 
                className="items-center gap-2"
                onClick={() => handleMeetingReviewedChange(!meeting?.meeting_reviewed)}
                disabled={isUpdatingReviewed}
              >
                {meeting?.meeting_reviewed ? (
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
              <DropdownMenu>  
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto"> <Ellipsis className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  <DropdownMenuItem onSelect={() => setShowDeepgramDialog(true)} className="cursor-pointer">
                    <FileJson2 className="w-4 h-4 mr-2" />
                    <span>Deepgram Response</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowOpenAIDialog(true)} className="cursor-pointer">
                    <FileJson2 className="w-4 h-4 mr-2" />
                    <span>OpenAI Response</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => setIsDeleteDialogOpen(true)} 
                    disabled={isDeleting}
                    className="cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed text-destructive hover:!text-red-600 focus:!text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-destructive " />
                    <span>Delete Meeting</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
                <div className="text-xs md:text-sm text-muted-foreground space-x-2 md:space-x-3 flex items-center flex-wrap">
                    <span className="flex items-center">
                        <CalendarDays className="w-3.5 h-3.5 mr-1 md:mr-1.5" />
                        {format(new Date(meeting.meeting_at), "MMMM do, yyyy")}
                    </span>
                    <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 md:mr-1.5" />
                        {format(new Date(meeting.meeting_at), "p")}
                    </span>
                    <span>
                        ({formatDistanceToNow(new Date(meeting.meeting_at), { addSuffix: true })})
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs md:text-sm text-muted-foreground">Attendees: </span>
                  {meeting.attendees && meeting.attendees.length > 0 ? (
                    meeting.attendees.map((attendee) => (
                      <Badge 
                        key={attendee.id} 
                        variant={
                          attendee.attendance_status === 'present' ? 'blue' :
                          attendee.attendance_status === 'absent' ? 'red' : 'gray'
                        }
                        className={`cursor-pointer transition-colors ${
                          updatingAttendeeId === attendee.id ? 'opacity-50' : 'hover:opacity-80'
                        }`}
                        onClick={() => handleAttendanceStatusChange(attendee.id, attendee.attendance_status)}
                      >
                        {attendee.contacts?.display_name || 
                         `${attendee.contacts?.first_name || ''} ${attendee.contacts?.last_name || ''}`.trim() ||
                         attendee.contacts?.primary_email ||
                         'Unknown'}
                        {attendee.role === 'organizer' && <span className="ml-1">👑</span>}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No attendees added</span>
                  )}
              </div>
            </div>

        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting transcript, summary, and the original audio file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeeting} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Yes, delete meeting'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MeetingEditModal
        isOpen={isEditDetailsDialogOpen}
        onClose={() => setIsEditDetailsDialogOpen(false)}
        meeting={meeting}
        onSave={handleUpdateMeetingDetails}
        onRefresh={refreshMeetingData}
      />

      {/* Deepgram Response Dialog */}
      <Dialog open={showDeepgramDialog} onOpenChange={setShowDeepgramDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Deepgram API Response</DialogTitle>
            <DialogDescription>
              Raw JSON response from the Deepgram transcription service.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 max-h-[60vh] overflow-auto rounded-md bg-muted p-4">
          <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => handleJsonCopy(meeting?.transcription, 'Deepgram')}
            >
              {deepgramCopyIcon === 'copy' ? <Copy className="h-4 w-4" /> : <SquareCheckBig className="h-4 w-4" />}
            </Button>
            {meeting?.transcription ? (
              <pre className="text-xs">
                {JSON.stringify(meeting.transcription, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No Deepgram data available for this meeting.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeepgramDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OpenAI Response Dialog */}
      <Dialog open={showOpenAIDialog} onOpenChange={setShowOpenAIDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>OpenAI API Response</DialogTitle>
            <DialogDescription>
              Raw JSON response from the OpenAI service.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 max-h-[60vh] overflow-auto rounded-md bg-muted p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => handleJsonCopy(meeting?.openai_response, 'OpenAI')}
            >
              {openAICopyIcon === 'copy' ? <Copy className="h-4 w-4" /> : <SquareCheckBig className="h-4 w-4" />}
            </Button>
            {meeting?.openai_response ? (
              <pre className=" text-xs">

                {(() => {
                  try {
                    const parsedResponse = JSON.parse(meeting.openai_response);
                    return JSON.stringify(parsedResponse, null, 2);
                  } catch {
                    // If already a string and not JSON, display as is
                    console.error("Raw OpenAI Response: Could not parse JSON string. Displaying raw string."); // Keep the log
                    return meeting.openai_response;
                  }
                })()}
              </pre>
            ) : (
              <p className="text-muted-foreground">No OpenAI data available for this meeting.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenAIDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {meeting.hasAudio && meeting.transcription?.metadata?.duration ? (
        <div className="pt-4">
            <LazyAudioPlayer
                ref={audioPlayerRef}
                meetingId={meetingId}
                duration={meeting.transcription.metadata.duration}
                onTimeUpdate={setCurrentAudioTime}
            />
        </div>
      ) : null}

      {/* Meeting Tabs */}
      <Tabs defaultValue="transcript" className="w-full grow" onValueChange={setActiveTab}>
        <div className='flex justify-between items-center mb-2'>
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyToClipboard}>
              {copyIcon === 'copy' ? <Copy className="mr-2 h-4 w-4" /> : <SquareCheckBig className="mr-2 h-4 w-4" />}
              {copyButtonText}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReprocess} disabled={isReprocessing}>
                {isReprocessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Reprocess
            </Button>
          </div>
        </div>
        
        <TabsContent value="transcript">
          <Card className="h-full">
            <CardContent>
            {meeting.transcription ? (
              <ScrollArea className="h-[calc(100vh-445px)]">
                <div className="pr-2">
                {displayableTranscript.length > 0 ? (
                  <Transcript 
                    meetingId={meetingId}
                    formattedTranscript={displayableTranscript}
                    speakerContacts={meeting?.speaker_names}
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
              <UploadAudio meetingId={meetingId} />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary">
          <Card className="h-full">
            <CardContent>
              {meeting.summary_jsonb ? (
                <Summary summary={meeting.summary_jsonb} />
              ) : (
                <p className="text-center text-muted-foreground p-4">No summary available for this meeting.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <UserNotes userNotes={meeting.user_notes} meetingId={meetingId} />
        </TabsContent>
      </Tabs>

    </div>
  );
} 