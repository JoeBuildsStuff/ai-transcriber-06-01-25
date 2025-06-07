import { z } from "zod";

export const contactAddressSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

export const contactEmailSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  label: z.string().nullable().optional(),
  is_primary: z.boolean().nullable().default(false).optional(),
});

export const contactPhoneSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  phone: z.string(),
  label: z.string().nullable().optional(),
  is_primary: z.boolean().nullable().default(false).optional(),
});

export const contactSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  primary_email: z.string().email().nullable().optional(),
  primary_phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_favorite: z.boolean().nullable().default(false).optional(),
  tags: z.array(z.string()).nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export const meetingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  audio_file_path: z.string(),
  original_file_name: z.string().nullable().optional(),
  transcription: z.any().nullable().optional(),
  formatted_transcript: z.any().nullable().optional(),
  summary: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  openai_response: z.any().nullable().optional(),
  title: z.string().nullable().optional(),
  meeting_at: z.string().datetime().optional(),
  spearker_names: z.any().nullable().optional(),
});

export type ContactAddress = z.infer<typeof contactAddressSchema>;
export type ContactEmail = z.infer<typeof contactEmailSchema>;
export type ContactPhone = z.infer<typeof contactPhoneSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Meeting = z.infer<typeof meetingSchema>;
