import { type FileError } from 'react-dropzone';

// ===== CONTACT TYPES =====
export interface Contact {
  id: string;
  firstName: string;
  lastName:string;
  displayName: string;
  primaryEmail?: string;
  company?: string;
  notes?: string;
}

// ===== MEETING TYPES =====
export interface Meeting {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    meeting_at: string;
    speaker_names: { [key: string]: string } | null;
    summary: string;
}

export interface MeetingCardSummary {
  id: string;
  title: string;
  meeting_at: string;
  speaker_names: { [key: string]: string } | null;
  summary: string;
  transcription: DeepgramTranscription | null;
  formatted_transcript: FormattedTranscriptGroup[] | null;
  original_file_name?: string;
}

export interface MeetingDetails extends Meeting {
  user_id: string;
  audio_file_path: string;
  original_file_name: string;
  transcription: DeepgramTranscription | null; 
  formatted_transcript: FormattedTranscriptGroup[] | null;
  summary_jsonb: Record<string, string> | null;
  openai_response: string | null;
  audioUrl: string | null;
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
    speakerContacts?: Record<number, string> | null;
    contacts?: Contact[] | null;
    onSpeakerContactsUpdate: (speakerContacts: Record<number, string>) => void;
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
    speakerContacts: Record<number, string> | null;
    onSpeakerContactsUpdate: (speakerContacts: Record<number, string>) => void;
    formattedTranscript: FormattedTranscriptGroup[];
    onSeekAndPlay: (time: number) => void;
    onContactsUpdate: () => void;
}
  
export interface MeetingEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    meeting: MeetingDetails | MeetingCardSummary | null;
    onSave: (details: { title: string; meeting_at: string }) => void;
}

export interface AudioPlayerRef {
    seek: (time: number) => void;
} 