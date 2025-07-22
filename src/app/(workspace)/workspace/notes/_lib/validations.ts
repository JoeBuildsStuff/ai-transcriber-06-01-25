export type Note = {
  id: string;
  title?: string;
  content: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type ContactNote = {
  id: string;
  note_id: string;
  contact_id: string;
  user_id?: string;
  created_at?: string;
}

export type MeetingNote = {
  id: string;
  note_id: string;
  meeting_id: string;
  user_id?: string;
  created_at?: string;
}

export type Contact = {
  id: string;
  first_name?: string;
  last_name?: string;
  company?: Company;
}

export type Meeting = {
  id: string;
  title?: string;
  meeting_at?: string;
}

export type Company = {
  id: string;
  created_at?: string;
  name: string;
  description?: string;
}

// Enhanced types with relationships
export type NoteWithAssociations = Note & {
  contacts?: Contact[];
  meetings?: Meeting[];
}

// Form-specific types (for your React component)
export type NoteFormData = {
  title: string;
  content: string;
  contactIds: string[];
  meetingIds: string[];
}

// API response types
export type NoteListResponse = {
  notes: NoteWithAssociations[];
  total: number;
}

export type NoteDetailResponse = NoteWithAssociations;

// Insert/Update types (without generated fields)
export type NoteInsert = Omit<Note, 'id' | 'created_at' | 'updated_at'>;
export type NoteUpdate = Partial<NoteInsert>;

export type ContactNoteInsert = Omit<ContactNote, 'id' | 'created_at'>;
export type MeetingNoteInsert = Omit<MeetingNote, 'id' | 'created_at'>;

// Utility types for the component
export type NoteData = {
  title: string;
  content: string;
  contactIds: string[];
  meetingIds: string[];
}