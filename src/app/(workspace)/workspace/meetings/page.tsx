import { FormattedTranscriptGroup, TranscriptionData } from "@/hooks/use-Transcription";
import { createClient } from "@/lib/supabase/server";
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import MeetingCard from "./_components/meeting-card";

export type OpenAIResponse = {
  id: string;
  object: string;
  created_at: number;
  status: string;
  background: boolean;
  error: null;
  incomplete_details: null;
  instructions: null;
  max_output_tokens: null;
  model: string;
  output: Array<{
    id: string;
    type: string;
    status: string;
    content: Array<{
      type: string;
      annotations: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
      text: string;
      parsed: {
        title: string;
        summary_notes: string;
      };
    }>;
    role: string;
  }>;
  parallel_tool_calls: boolean;
  previous_response_id: null;
  reasoning: {
    effort: null;
    summary: null;
  };
  service_tier: string;
  store: boolean;
  temperature: number;
  text: {
    format: {
      type: string;
      description: null;
      name: string;
      schema: {
        type: string;
        properties: {
          title: { type: string };
          summary_notes: { type: string };
        };
        required: string[];
        additionalProperties: boolean;
      };
      strict: boolean;
    };
  };
  tool_choice: string;
  tools: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  top_p: number;
  truncation: string;
  usage: {
    input_tokens: number;
    input_tokens_details: {
      cached_tokens: number;
    };
    output_tokens: number;
    output_tokens_details: {
      reasoning_tokens: number;
    };
    total_tokens: number;
  };
  user: null;
  metadata: Record<string, unknown>;
  output_text: string;
  output_parsed: {
    title: string;
    summary_notes: string;
  };
}

export type Meeting = {
  id: string;
  user_id: string;
  audio_file_path: string;
  original_file_name: string | null;
  transcription: TranscriptionData | null;
  formatted_transcript: FormattedTranscriptGroup[] | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  meeting_at: string;
  openai_response: OpenAIResponse | null;
  title: string | null;
}

function groupMeetingsByDate(meetings: Meeting[]): Record<string, Meeting[]> {
  return meetings.reduce((acc, meeting) => {
    const meetingDate = parseISO(meeting.meeting_at);
    const dateKey = format(meetingDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);
}

function formatDateGroup(dateKey: string): string {
  const date = parseISO(dateKey);
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'MMM d')}`;
  }
  return format(date, 'eeee, MMMM d');
}

export default async function WorkspacePage() {
  const supabase = await createClient()

  const { data: meetings, error } = await supabase
    .schema('ai_transcriber')
    .from('meetings')
    .select('*')
    .order('meeting_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error(error)
  }

  const groupedMeetings = meetings ? groupMeetingsByDate(meetings) : {};

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        {Object.entries(groupedMeetings).map(([date, meetingsOnDate]) => (
          <div key={date}>
            <h2 className="text-xl font-semibold mb-4">{formatDateGroup(date)}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetingsOnDate.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}