'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // To get meetingId from URL and useRouter
import Transcript, { FormattedTranscriptGroup } from '@/components/transcript';
import Summary from '@/components/summary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { AlertCircle, Trash2, Pencil, Check, X, CalendarDays, Clock, Ellipsis, FileJson2, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Interface for individual words from Deepgram
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number; 
  speaker_confidence?: number;
  punctuated_word: string;
}

// Interface for the Deepgram transcription structure
interface DeepgramTranscription {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info: Record<string, { name: string; version: string; arch: string }>;
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: DeepgramWord[];
      }>;
    }>;
    utterances?: Array<unknown>; // Changed from any to unknown
  };
}

interface MeetingDetails {
  id: string;
  user_id: string;
  audio_file_path: string;
  original_file_name: string;
  title: string | null;
  transcription: DeepgramTranscription | null; 
  formatted_transcript: FormattedTranscriptGroup[] | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  openai_response: string | null;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;
  const router = useRouter(); // Add useRouter

  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showDeepgramDialog, setShowDeepgramDialog] = useState(false);
  const [showOpenAIDialog, setShowOpenAIDialog] = useState(false);

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
          setEditableTitle(data.title || data.original_file_name || "");
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

  const handleTitleEditToggle = () => {
    if (meeting) {
      setEditableTitle(meeting.title || meeting.original_file_name || "");
    }
    setIsEditingTitle(!isEditingTitle);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(event.target.value);
  };

  const handleSaveTitle = async () => {
    if (!meetingId || !meeting || editableTitle.trim() === (meeting.title || meeting.original_file_name)) {
      setIsEditingTitle(false);
      return;
    }
    if (editableTitle.trim() === "") {
      toast.error("Title cannot be empty.");
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editableTitle.trim() }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update title');
      }

      setMeeting(prev => prev ? { ...prev, title: responseData.meeting.title, updated_at: responseData.meeting.updated_at } : null);
      toast.success('Meeting title updated!');
      setIsEditingTitle(false);
      // Optionally refresh sidebar or ensure data consistency if title is shown there directly
      // For now, local state update and next sidebar fetch will handle it.
    } catch (err) {
      console.error("Error updating title:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to update title', { description: errorMessage });
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
      router.push('/workspace'); // Redirect to a general page after deletion
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

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" /> 
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="mb-5">
                <Skeleton className="h-10 w-24 mr-2" />
                <Skeleton className="h-10 w-24" />
            </TabsList>
            <TabsContent value="transcript">
                <Skeleton className="h-40 w-full" />
            </TabsContent>
            <TabsContent value="summary">
                <Skeleton className="h-40 w-full" />
            </TabsContent>
        </Tabs>
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
            <div className="flex-grow min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={editableTitle}
                      onChange={handleTitleChange}
                      className="text-xl md:text-2xl font-semibold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    />
                    <Button variant="ghost" size="icon" onClick={handleSaveTitle} className="text-green-500 hover:text-green-600">
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleTitleEditToggle} className="text-red-500 hover:text-red-600">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl md:text-2xl font-semibold flex items-center min-w-0">
                        <span className="truncate">
                          {meeting?.title || meeting?.original_file_name || "Meeting Details"}
                        </span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={handleTitleEditToggle} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="text-xs md:text-sm text-muted-foreground space-x-2 md:space-x-3 pt-1 flex items-center flex-wrap">
                    <span className="flex items-center">
                        <CalendarDays className="w-3.5 h-3.5 mr-1 md:mr-1.5" />
                        {format(new Date(meeting.created_at), "MMMM do, yyyy")}
                    </span>
                    <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 md:mr-1.5" />
                        {format(new Date(meeting.created_at), "p")}
                    </span>
                    <span>
                        ({formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })})
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2"> {/* Container for buttons */}            
              <DropdownMenu>  
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="ml-auto"> <Ellipsis className="w-4 h-4" /></Button>
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

      {/* Deepgram Response Dialog */}
      <Dialog open={showDeepgramDialog} onOpenChange={setShowDeepgramDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Deepgram API Response</DialogTitle>
            <DialogDescription>
              Raw JSON response from the Deepgram transcription service.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-auto rounded-md bg-muted p-4">
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
          <div className="mt-4 max-h-[60vh] overflow-auto rounded-md bg-muted p-4">
            {meeting?.openai_response ? (
              <pre className="text-xs">
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

      {/* Meeting Tabs */}
      <Tabs defaultValue="transcript" className="w-full grow mt-3"> {/* Added mt-3 for spacing */}
        <TabsList className="">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Meeting Transcript</CardTitle>
              <CardDescription>Formatted transcript of the meeting audio, with speaker labels if available.</CardDescription>
            </CardHeader>
            <CardContent>
              {displayableTranscript.length > 0 ? (
                <Transcript formattedTranscript={displayableTranscript} />
              ) : (
                <p className="text-center text-muted-foreground p-4">
                    {meeting.transcription ? "Transcript data exists but could not be formatted, or is empty." : "No transcript available for this meeting."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Meeting Summary</CardTitle>
              <CardDescription>AI-generated summary of the meeting transcript.</CardDescription>
            </CardHeader>
            <CardContent>
              {meeting.summary ? (
                <Summary summary={meeting.summary} />
              ) : (
                <p className="text-center text-muted-foreground p-4">No summary available for this meeting.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
} 