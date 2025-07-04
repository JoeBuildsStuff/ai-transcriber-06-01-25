export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  ai_transcriber: {
    Tables: {
      contacts: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          first_name: string | null
          last_name: string | null
          primary_email: string | null
          primary_phone: string | null
          company: string | null
          job_title: string | null
          notes: string | null
          user_id: string | null
          display_name: string | null
          birthday: string | null
          is_favorite: boolean | null
          nickname: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          first_name?: string | null
          last_name?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          company?: string | null
          job_title?: string | null
          notes?: string | null
          user_id?: string | null
          display_name?: string | null
          birthday?: string | null
          is_favorite?: boolean | null
          nickname?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          first_name?: string | null
          last_name?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          company?: string | null
          job_title?: string | null
          notes?: string | null
          user_id?: string | null
          display_name?: string | null
          birthday?: string | null
          is_favorite?: boolean | null
          nickname?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      meetings: {
        Row: {
          id: string
          user_id: string | null
          audio_file_path: string | null
          original_file_name: string | null
          transcription: Json | null
          formatted_transcript: Json | null
          summary: string | null
          created_at: string | null
          updated_at: string | null
          openai_response: Json | null
          title: string | null
          meeting_at: string | null
          speaker_names: Json | null
          summary_jsonb: Json | null
          meeting_reviewed: boolean | null
          user_notes: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          audio_file_path?: string | null
          original_file_name?: string | null
          transcription?: Json | null
          formatted_transcript?: Json | null
          summary?: string | null
          created_at?: string | null
          updated_at?: string | null
          openai_response?: Json | null
          title?: string | null
          meeting_at?: string | null
          speaker_names?: Json | null
          summary_jsonb?: Json | null
          meeting_reviewed?: boolean | null
          user_notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          audio_file_path?: string | null
          original_file_name?: string | null
          transcription?: Json | null
          formatted_transcript?: Json | null
          summary?: string | null
          created_at?: string | null
          updated_at?: string | null
          openai_response?: Json | null
          title?: string | null
          meeting_at?: string | null
          speaker_names?: Json | null
          summary_jsonb?: Json | null
          meeting_reviewed?: boolean | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      meeting_attendees: {
        Row: {
          id: string
          meeting_id: string
          contact_id: string
          user_id: string
          invitation_status: string | null
          attendance_status: string | null
          role: string | null
          invited_at: string | null
          responded_at: string | null
          created_at: string | null
          updated_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          contact_id: string
          user_id: string
          invitation_status?: string | null
          attendance_status?: string | null
          role?: string | null
          invited_at?: string | null
          responded_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          contact_id?: string
          user_id?: string
          invitation_status?: string | null
          attendance_status?: string | null
          role?: string | null
          invited_at?: string | null
          responded_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      new_companies: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      new_contacts: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          city: string | null
          state: string | null
          company_id: string | null
          job_title: string | null
          description: string | null
          linkedin: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          city?: string | null
          state?: string | null
          company_id?: string | null
          job_title?: string | null
          description?: string | null
          linkedin?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          city?: string | null
          state?: string | null
          company_id?: string | null
          job_title?: string | null
          description?: string | null
          linkedin?: string | null
          created_at?: string | null
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
          {
            foreignKeyName: "new_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      new_contact_emails: {
        Row: {
          id: string
          contact_id: string | null
          email: string
          display_order: number | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          email: string
          display_order?: number | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          email?: string
          display_order?: number | null
          created_at?: string | null
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
          {
            foreignKeyName: "new_contact_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      new_contact_phones: {
        Row: {
          id: string
          contact_id: string | null
          phone: string
          display_order: number | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          phone: string
          display_order?: number | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          phone?: string
          display_order?: number | null
          created_at?: string | null
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
          {
            foreignKeyName: "new_contact_phones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
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

type DefaultSchema = Database[Extract<keyof Database, "ai_transcriber">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  DefaultSchemaCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends DefaultSchemaCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = DefaultSchemaCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : DefaultSchemaCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][DefaultSchemaCompositeTypeNameOrOptions]
    : never

export const Constants = {
  ai_transcriber: {
    Enums: {},
  },
} as const 