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
      contact_addresses: {
        Row: {
          city: string | null
          contact_id: string | null
          country: string | null
          id: string
          label: string | null
          postal_code: string | null
          state: string | null
          street: string | null
        }
        Insert: {
          city?: string | null
          contact_id?: string | null
          country?: string | null
          id?: string
          label?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
        }
        Update: {
          city?: string | null
          contact_id?: string | null
          country?: string | null
          id?: string
          label?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_addresses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_emails: {
        Row: {
          contact_id: string | null
          email: string
          id: string
          is_primary: boolean | null
          label: string | null
        }
        Insert: {
          contact_id?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
        }
        Update: {
          contact_id?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_phones: {
        Row: {
          contact_id: string | null
          id: string
          is_primary: boolean | null
          label: string | null
          phone: string
        }
        Insert: {
          contact_id?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          phone: string
        }
        Update: {
          contact_id?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_phones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          birthday: string | null
          company: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          is_favorite: boolean | null
          job_title: string | null
          last_name: string | null
          nickname: string | null
          notes: string | null
          primary_email: string | null
          primary_phone: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birthday?: string | null
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          nickname?: string | null
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birthday?: string | null
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          nickname?: string | null
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          audio_file_path: string
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
        }
        Insert: {
          audio_file_path: string
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
        }
        Update: {
          audio_file_path?: string
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
        }
        Relationships: []
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

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
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  ai_transcriber: {
    Enums: {},
  },
} as const
