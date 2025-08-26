import { type FileError } from 'react-dropzone';

// ===== CONTACT TYPES =====
export type Contact = {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  primary_email?: string | null
  primary_phone?: string | null
  company?: string | null
  job_title?: string | null
  birthday?: string | null
  notes?: string | null
  is_favorite?: boolean | null
  nickname?: string | null
  tags?: string[] | null
}

// New contact structure from database
export interface NewContactEmail {
  email: string;
  display_order: number;
}

export interface NewCompany {
  name: string;
}

export interface NewContactFromDB {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  new_companies: NewCompany | null;
  new_contact_emails: NewContactEmail[];
}

// ===== MEETING TYPES =====
export interface Meeting {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    meeting_at: string;
    location: string | null;
    speaker_names: { [key: string]: string } | null;
    summary: string;
    user_notes?: string | null;
    meeting_reviewed?: boolean | null;
}

export interface MeetingCardSummary {
  id: string
  title: string | null
  meeting_at: string | null
  location: string | null
  speaker_names: { [key: string]: string } | null
  summary: string | null
  transcription: DeepgramTranscription | null
  formatted_transcript: FormattedTranscriptGroup[] | null
  original_file_name?: string
  meeting_reviewed?: boolean | null;
}

export interface MeetingDetails extends Meeting {
  user_id: string;
  audio_file_path: string;
  original_file_name: string;
  transcription: DeepgramTranscription | null; 
  formatted_transcript: FormattedTranscriptGroup[] | null;
  summary_jsonb: Record<string, string> | null;
  openai_response: string | null;
  hasAudio: boolean; // Indicates if audio file is available
  user_notes?: string | null;
  meeting_reviewed?: boolean | null;
  attendees?: MeetingAttendeeWithContact[];
}

// ===== MEETING SPEAKER TYPES =====
export interface MeetingSpeaker {
  id: string;
  meeting_id: string;
  contact_id: string | null;
  speaker_index: number;
  speaker_name: string | null;
  confidence_score: number | null;
  role: string | null;
  is_primary_speaker: boolean | null;
  identified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MeetingSpeakerWithContact extends MeetingSpeaker {
  contact: Contact | null;
}

// ===== MEETING ATTENDEE TYPES =====
export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  contact_id: string;
  user_id: string;
  invitation_status: 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response';
  attendance_status: 'present' | 'absent' | 'unknown';
  role: 'organizer' | 'required' | 'optional' | 'attendee';
  invited_at: string;
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  contacts?: Contact;
}

export interface MeetingAttendeeWithContact extends MeetingAttendee {
  contacts: Contact;
}

// New meeting attendee structure from database
export interface MeetingAttendeeFromDB {
  id: string;
  meeting_id: string;
  contact_id: string;
  user_id: string;
  invitation_status: string | null;
  attendance_status: string | null;
  role: string | null;
  invited_at: string | null;
  responded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  notes: string | null;
  new_contacts: NewContactFromDB;
}

// ===== TRANSCRIPTION TYPES =====
export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number; 
  speaker_confidence?: number;
  punctuated_word: string;
}

export interface DeepgramTranscription {
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
    utterances?: Array<unknown>; 
  };
}

export interface FormattedTranscriptGroup {
  speaker: number;
  start: number;
  text: string;
  company?: string;
}

export interface TranscriptionData {
  results?: {
    channels?: {
      alternatives?: {
        words: DeepgramWord[];
        transcript: string;
        confidence: number;
      }[];
    }[];
  };
  meetingId?: string;
}


// ===== FILE UPLOAD TYPES =====
export interface FileWithPreview extends File {
  preview?: string;
  errors?: readonly FileError[];
}

export interface FileProcessingState {
  id: string;
  file: FileWithPreview;
  status: 'queued' | 'uploading' | 'transcribing' | 'summarizing' | 'complete' | 'error';
  summaryStatus: string;
  meetingId?: string | null;
  errorMessage?: string;
  meetingAt: Date;
}


// ===== HOOK TYPES =====
export interface TranscriptionHook {
  isTranscribing: boolean;
  transcriptionResult: TranscriptionData | null;
  formattedTranscript: FormattedTranscriptGroup[];
  summaryStatus: string;
  currentMeetingId: string | null;
  currentMeetingTitle: string | null; 
  initiateTranscription: (filePath: string, originalFileName: string) => Promise<void>;
  resetTranscription: () => void;
  summary: string | null;
  isSummarizing: boolean;
  summaryError: string | null;
}

export type UseSupabaseUploadOptions = {
  bucketName: string;
  path?: string;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  cacheControl?: number;
  upsert?: boolean;
  onUploadSuccess?: (filePath: string, originalFileName: string) => void;
}

// ===== COMPONENT PROP TYPES =====
export interface TranscriptProps {
    meetingId: string;
    formattedTranscript: FormattedTranscriptGroup[];
    meetingSpeakers?: MeetingSpeakerWithContact[];
    contacts?: Contact[] | null;
    onSpeakersUpdate: (speakers: MeetingSpeakerWithContact[]) => void;
    onSeekAndPlay: (time: number) => void;
    onContactsUpdate: () => void;
    currentTime: number;
}
  
export interface SpeakerAssociationModalProps {
    isOpen: boolean;
    onClose: () => void;
    meetingId: string;
    speakerNumber: number | null;
    currentContactId: string | null;
    contacts: Contact[];
    meetingSpeakers: MeetingSpeakerWithContact[];
    onSpeakersUpdate: (speakers: MeetingSpeakerWithContact[]) => void;
    formattedTranscript: FormattedTranscriptGroup[];
    onSeekAndPlay: (time: number) => void;
    onContactsUpdate: () => void;
}
  
export interface MeetingEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    meeting: MeetingDetails | MeetingCardSummary | null;
    onSave: (details: { title: string; meeting_at: string; location?: string }) => void;
    onRefresh?: () => Promise<void>;
}

export interface AudioPlayerRef {
    seek: (time: number) => void;
} 