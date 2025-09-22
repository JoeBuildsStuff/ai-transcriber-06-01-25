import type { PostgrestError } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

export type Task = Database["ai_transcriber"]["Tables"]["tasks"]["Row"]
export type TaskStatus = Database["ai_transcriber"]["Enums"]["task_status"]
export type TaskPriority = Database["ai_transcriber"]["Enums"]["task_priority"]

export type TaskOwnerSummary = {
  id: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
}

export type TaskContactSummary = {
  id: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
}

export type TaskMeetingSummary = {
  id: string
  title?: string | null
  meeting_at?: string | null
}

export type TaskTagSummary = {
  id: string
  name: string
  description?: string | null
}

export type TaskWithAssociations = Task & {
  owner?: TaskOwnerSummary | null
  contacts?: TaskContactSummary[]
  meetings?: TaskMeetingSummary[]
  tags?: TaskTagSummary[]
}

export type TaskFormData = {
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  start_at?: string | null
  due_at?: string | null
  owner_contact_id?: string | null
  tagIds?: string[]
  contactIds?: string[]
  meetingIds?: string[]
}

export type TaskListResult = {
  data: TaskWithAssociations[]
  count: number
  error: PostgrestError | null
}

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
]

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
]
