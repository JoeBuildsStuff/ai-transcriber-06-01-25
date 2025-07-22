export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.1 (d3f7cba)"
  }
  ai_transcriber: {
    Tables: {
      contact_notes: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          note_id: string
          user_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          note_id: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          note_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "new_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          notes: string | null
          primary_email: string | null
          primary_phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_attendees: {
        Row: {
          attendance_status: string | null
          contact_id: string
          created_at: string | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          meeting_id: string
          notes: string | null
          responded_at: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_status?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          meeting_id: string
          notes?: string | null
          responded_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          attendance_status?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          meeting_id?: string
          notes?: string | null
          responded_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "new_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_attendee_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string
          note_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          note_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          note_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_attendee_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          audio_file_path: string | null
          created_at: string | null
          formatted_transcript: Json | null
          id: string
          meeting_at: string | null
          meeting_reviewed: boolean | null
          openai_response: Json | null
          original_file_name: string | null
          speaker_names: Json | null
          summary: string | null
          summary_jsonb: Json | null
          title: string | null
          transcription: Json | null
          updated_at: string | null
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          audio_file_path?: string | null
          created_at?: string | null
          formatted_transcript?: Json | null
          id?: string
          meeting_at?: string | null
          meeting_reviewed?: boolean | null
          openai_response?: Json | null
          original_file_name?: string | null
          speaker_names?: Json | null
          summary?: string | null
          summary_jsonb?: Json | null
          title?: string | null
          transcription?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          audio_file_path?: string | null
          created_at?: string | null
          formatted_transcript?: Json | null
          id?: string
          meeting_at?: string | null
          meeting_reviewed?: boolean | null
          openai_response?: Json | null
          original_file_name?: string | null
          speaker_names?: Json | null
          summary?: string | null
          summary_jsonb?: Json | null
          title?: string | null
          transcription?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: []
      }
      new_companies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      new_contact_emails: {
        Row: {
          contact_id: string | null
          created_at: string | null
          display_order: number | null
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          display_order?: number | null
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          display_order?: number | null
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_contact_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "new_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      new_contact_phones: {
        Row: {
          contact_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          phone: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_contact_phones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "new_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      new_contacts: {
        Row: {
          city: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          first_name: string | null
          id: string
          is_favorite: boolean | null
          job_title: string | null
          last_name: string | null
          linkedin: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "new_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      meeting_attendees_with_contacts: {
        Row: {
          attendance_status: string | null
          company: string | null
          contact_id: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string | null
          invitation_status: string | null
          invited_at: string | null
          job_title: string | null
          last_name: string | null
          meeting_id: string | null
          notes: string | null
          primary_email: string | null
          primary_phone: string | null
          responded_at: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "new_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_attendee_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings_with_attendee_summary: {
        Row: {
          absent_count: number | null
          accepted_count: number | null
          audio_file_path: string | null
          created_at: string | null
          declined_count: number | null
          formatted_transcript: Json | null
          id: string | null
          meeting_at: string | null
          meeting_reviewed: boolean | null
          no_response_count: number | null
          openai_response: Json | null
          original_file_name: string | null
          present_count: number | null
          speaker_names: Json | null
          summary: string | null
          summary_jsonb: Json | null
          tentative_count: number | null
          title: string | null
          total_invited: number | null
          transcription: Json | null
          updated_at: string | null
          user_id: string | null
          user_notes: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  ai_transcriber: {
    Enums: {},
  },
} as const
