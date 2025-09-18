"use server"

import { createClient } from "@/lib/supabase/server"
import { MeetingRecurrence, Meetings } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { Database } from "@/types/supabase"

type MeetingRecurrenceInput = {
  frequency: MeetingRecurrence["frequency"]
  interval: number
  weekdays: string[] | null
  monthly_option: MeetingRecurrence["monthly_option"]
  monthly_day_of_month: number | null
  monthly_weekday: string | null
  monthly_weekday_position: number | null
  end_type: MeetingRecurrence["end_type"]
  end_date: string | null
  occurrence_count: number | null
  starts_at: string
  timezone: string
}

const MS_PER_DAY = 86_400_000

const DAY_CODE_TO_INDEX = {
  su: 0,
  m: 1,
  t: 2,
  w: 3,
  th: 4,
  f: 5,
  sa: 6,
} as const

type DayCode = keyof typeof DAY_CODE_TO_INDEX

const isValidDayCode = (value: string | null | undefined): value is DayCode =>
  typeof value === "string" && value in DAY_CODE_TO_INDEX

const copyUtcTime = (template: Date, target: Date): Date => {
  const aligned = new Date(target.getTime())
  aligned.setUTCHours(
    template.getUTCHours(),
    template.getUTCMinutes(),
    template.getUTCSeconds(),
    template.getUTCMilliseconds()
  )
  return aligned
}

const buildEndBoundary = (endDate: string, anchor: Date): Date => {
  const [yearString, monthString, dayString] = endDate.split("-")
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)

  if (!year || !month || !day) {
    throw new Error("Invalid recurrence end date")
  }

  const boundary = new Date(Date.UTC(year, month - 1, day))
  return copyUtcTime(anchor, boundary)
}

const getNthWeekdayOfMonth = (
  year: number,
  monthZeroIndexed: number,
  weekday: number,
  position: number,
  anchor: Date
): Date => {
  const firstOfMonth = new Date(Date.UTC(year, monthZeroIndexed, 1))
  const firstWeekdayOffset = (weekday - firstOfMonth.getUTCDay() + 7) % 7
  let dayOfMonth = 1 + firstWeekdayOffset + (position - 1) * 7
  const daysInMonth = new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate()

  if (dayOfMonth > daysInMonth) {
    dayOfMonth -= 7
  }

  if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
    throw new Error("Unable to resolve monthly weekday occurrence")
  }

  const candidate = new Date(Date.UTC(year, monthZeroIndexed, dayOfMonth))
  return copyUtcTime(anchor, candidate)
}

const normalizeWeekdays = (weekdays: string[] | null, fallback: number): number[] => {
  const normalized = (weekdays ?? [])
    .map((day) => (isValidDayCode(day) ? DAY_CODE_TO_INDEX[day] : undefined))
    .filter((day): day is number => typeof day === "number")

  if (normalized.length === 0) {
    normalized.push(fallback)
  }

  return Array.from(new Set(normalized)).sort((a, b) => a - b)
}

const computeRecurrenceOccurrences = (rule: MeetingRecurrenceInput): Date[] => {
  const anchor = new Date(rule.starts_at)

  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Invalid recurrence start date")
  }

  if (rule.end_type === "never") {
    throw new Error("Recurring meetings must end on a date or after a set number of occurrences")
  }

  const maxOccurrences = rule.end_type === "after"
    ? Math.max(1, rule.occurrence_count ?? 1)
    : Number.POSITIVE_INFINITY

  const endBoundary = rule.end_type === "on" && rule.end_date
    ? buildEndBoundary(rule.end_date, anchor)
    : null

  if (endBoundary && anchor > endBoundary) {
    throw new Error("Recurrence end date must be after the meeting start date")
  }

  const occurrences: Date[] = [anchor]

  if (maxOccurrences === 1) {
    return occurrences
  }

  const guardMaxIterations = 1000

  switch (rule.frequency) {
    case "day": {
      for (let iteration = 0; iteration < guardMaxIterations; iteration += 1) {
        const previous = occurrences[occurrences.length - 1]
        const candidate = new Date(previous.getTime())
        candidate.setUTCDate(candidate.getUTCDate() + rule.interval)

        if (endBoundary && candidate > endBoundary) {
          break
        }

        occurrences.push(candidate)

        if (occurrences.length >= maxOccurrences) {
          break
        }
      }
      break
    }
    case "week": {
      const anchorWeekday = anchor.getUTCDay()
      const normalizedWeekdays = normalizeWeekdays(rule.weekdays, anchorWeekday)
      const anchorMidnightMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate())
      const anchorWeekStartMs = anchorMidnightMs - anchorWeekday * MS_PER_DAY

      for (let cycle = 0; cycle < guardMaxIterations; cycle += 1) {
        const weekIndex = cycle * rule.interval

        for (const weekday of normalizedWeekdays) {
          const candidateMs = anchorWeekStartMs + (weekIndex * 7 + weekday) * MS_PER_DAY
          const candidate = copyUtcTime(anchor, new Date(candidateMs))

          if (candidate <= anchor) {
            continue
          }

          if (endBoundary && candidate > endBoundary) {
            return occurrences
          }

          occurrences.push(candidate)

          if (occurrences.length >= maxOccurrences) {
            return occurrences
          }
        }

        if (endBoundary) {
          const earliestNextMs = anchorWeekStartMs + ((weekIndex + rule.interval) * 7 + normalizedWeekdays[0]) * MS_PER_DAY
          const earliestNext = copyUtcTime(anchor, new Date(earliestNextMs))
          if (earliestNext > endBoundary) {
            break
          }
        }
      }
      break
    }
    case "month": {
      const anchorDayOfMonth = rule.monthly_day_of_month ?? anchor.getUTCDate()
      const weekdayCode = rule.monthly_weekday
      const weekdayPosition = rule.monthly_weekday_position ?? 1
      const useWeekdayStrategy = rule.monthly_option === "weekday" && isValidDayCode(weekdayCode)

      for (let cycle = 1; cycle <= guardMaxIterations; cycle += 1) {
        const monthOffset = cycle * rule.interval
        const targetMonthIndex = anchor.getUTCMonth() + monthOffset
        const targetYear = anchor.getUTCFullYear() + Math.floor(targetMonthIndex / 12)
        const targetMonth = ((targetMonthIndex % 12) + 12) % 12

        let candidate: Date

        if (useWeekdayStrategy && weekdayCode) {
          candidate = getNthWeekdayOfMonth(
            targetYear,
            targetMonth,
            DAY_CODE_TO_INDEX[weekdayCode],
            weekdayPosition,
            anchor
          )
        } else {
          const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
          const day = Math.min(anchorDayOfMonth, daysInMonth)
          candidate = copyUtcTime(anchor, new Date(Date.UTC(targetYear, targetMonth, day)))
        }

        if (candidate <= anchor) {
          continue
        }

        if (endBoundary && candidate > endBoundary) {
          break
        }

        occurrences.push(candidate)

        if (occurrences.length >= maxOccurrences) {
          break
        }
      }
      break
    }
    case "year": {
      for (let iteration = 0; iteration < guardMaxIterations; iteration += 1) {
        const previous = occurrences[occurrences.length - 1]
        const candidate = new Date(previous.getTime())
        candidate.setUTCFullYear(candidate.getUTCFullYear() + rule.interval)

        if (candidate <= anchor) {
          continue
        }

        if (endBoundary && candidate > endBoundary) {
          break
        }

        occurrences.push(candidate)

        if (occurrences.length >= maxOccurrences) {
          break
        }
      }
      break
    }
    default: {
      throw new Error("Unsupported recurrence frequency")
    }
  }

  return occurrences
}

export async function getMeeting(
  id: string
): Promise<{
  data: Meetings | null
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select(`
      id,
      user_id,
      audio_file_path,
      original_file_name,
      formatted_transcript,
      summary,
      created_at,
      updated_at,
      title,
      meeting_at,
      speaker_names,
      summary_jsonb,
      meeting_reviewed,
      location,
      recurrence_parent_id,
      recurrence_instance_index,
      recurrence:meeting_recurrences (
        id,
        frequency,
        interval,
        weekdays,
        monthly_option,
        monthly_day_of_month,
        monthly_weekday,
        monthly_weekday_position,
        end_type,
        end_date,
        occurrence_count,
        starts_at,
        timezone,
        created_at,
        updated_at
      ),
      recurrence_parent:recurrence_parent_id (
        id,
        meeting_at,
        user_id,
        title,
        location,
        audio_file_path,
        recurrence:meeting_recurrences (
          id,
          frequency,
          interval,
          weekdays,
          monthly_option,
          monthly_day_of_month,
          monthly_weekday,
          monthly_weekday_position,
          end_type,
          end_date,
          occurrence_count,
          starts_at,
          timezone,
          created_at,
          updated_at
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    return { data: null, error }
  }

  const {
    recurrence_parent: recurringParent,
    ...meetingRest
  } = data as unknown as Meetings & {
    recurrence_parent?: (Meetings & { recurrence?: MeetingRecurrence | null }) | null
  }

  const effectiveRecurrence = meetingRest.recurrence ?? recurringParent?.recurrence ?? null

  const normalizedMeeting: Meetings = {
    ...meetingRest,
    recurrence: effectiveRecurrence,
  }

  return { data: normalizedMeeting, error: null }
}

export async function createMeeting(data: Omit<Meetings, "id" | "created_at" | "updated_at" | "user_id">) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for creating meeting")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { data: newMeeting, error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .insert([{ ...data, user_id: user.id, audio_file_path: data.audio_file_path || "" }])
      .select()
      .single()
    
    if (error) {
      console.error("Error creating meeting:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    return { success: true, data: newMeeting }
  } catch (error) {
    console.error("Unexpected error creating meeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateMeeting(id: string, data: Partial<Omit<Meetings, "id" | "created_at" | "updated_at">>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for updating meeting")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { data: updatedMeeting, error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating meeting:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    revalidatePath(`/workspace/meetings/${id}`)
    return { success: true, data: updatedMeeting }
  } catch (error) {
    console.error("Unexpected error updating meeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function multiUpdateMeetings(meetingIds: string[], data: Partial<Omit<Meetings, "id" | "created_at" | "updated_at">>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for multi updating meetings")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    // Only process fields that are actually provided (not undefined)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    )
    
    if (Object.keys(fieldsToUpdate).length === 0) {
      return { success: true, updatedCount: 0 }
    }
    
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update(fieldsToUpdate)
      .in("id", meetingIds)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error multi updating meetings:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    // Revalidate individual meeting pages
    meetingIds.forEach(id => revalidatePath(`/workspace/meetings/${id}`))
    
    return { success: true, updatedCount: meetingIds.length }
  } catch (error) {
    console.error("Unexpected error multi updating meetings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteMeetings(meetingIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for deleting meetings")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .delete()
      .in("id", meetingIds)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting meetings:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    return { success: true, deletedCount: meetingIds.length }
  } catch (error) {
    console.error("Unexpected error deleting meetings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

type RecurrenceScopeOption = "series" | "following"

type SeriesBaseMeeting = Pick<Database["ai_transcriber"]["Tables"]["meetings"]["Row"], "id" | "user_id" | "meeting_at" | "title" | "location" | "audio_file_path">

type AttendeeTemplate = Pick<Database["ai_transcriber"]["Tables"]["meeting_attendees"]["Row"], "contact_id" | "invitation_status" | "attendance_status" | "role" | "notes">

type TagTemplate = Pick<Database["ai_transcriber"]["Tables"]["meeting_tags"]["Row"], "tag_id">

export async function upsertMeetingRecurrence(
  meetingId: string,
  input: MeetingRecurrenceInput,
  options?: { scope?: RecurrenceScopeOption }
) {
  const requestedScope: RecurrenceScopeOption = options?.scope ?? "series"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for updating recurrence")
    return { success: false, error: "User not authenticated" }
  }

  if (input.end_type === "never") {
    return {
      success: false,
      error: "Recurring meetings must end on a specific date or after a set number of occurrences."
    }
  }

  try {
    const { data: meetingRecord, error: meetingError } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .select(`
        id,
        user_id,
        title,
        meeting_at,
        location,
        audio_file_path,
        recurrence_parent_id,
        recurrence_instance_index,
        recurrence:meeting_recurrences (
          id,
          frequency,
          interval,
          weekdays,
          monthly_option,
          monthly_day_of_month,
          monthly_weekday,
          monthly_weekday_position,
          end_type,
          end_date,
          occurrence_count,
          starts_at,
          timezone,
          created_at,
          updated_at
        ),
        recurrence_parent:recurrence_parent_id (
          id,
          user_id,
          title,
          meeting_at,
          location,
          audio_file_path,
          recurrence:meeting_recurrences (
            id,
            frequency,
            interval,
            weekdays,
            monthly_option,
            monthly_day_of_month,
            monthly_weekday,
            monthly_weekday_position,
            end_type,
            end_date,
            occurrence_count,
            starts_at,
            timezone,
            created_at,
            updated_at
          )
        )
      `)
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .single()

    if (meetingError || !meetingRecord) {
      console.error("Meeting not found or access denied for recurrence upsert", meetingError)
      return { success: false, error: "Meeting not found" }
    }

    type QueryMeeting = Database["ai_transcriber"]["Tables"]["meetings"]["Row"] & {
      recurrence?: MeetingRecurrence | null
      recurrence_parent?: (Database["ai_transcriber"]["Tables"]["meetings"]["Row"] & {
        recurrence?: MeetingRecurrence | null
      }) | null
    }

    const meeting = meetingRecord as QueryMeeting
    const seriesHead = meeting.recurrence_parent ?? meeting
    const seriesHeadId = seriesHead.id
    const isSeriesHead = !meeting.recurrence_parent_id
    const effectiveScope: RecurrenceScopeOption = requestedScope === "following" && isSeriesHead ? "series" : requestedScope

    const recurrenceRowToInput = (row: MeetingRecurrence): MeetingRecurrenceInput => ({
      frequency: row.frequency,
      interval: row.interval,
      weekdays: row.weekdays,
      monthly_option: row.monthly_option,
      monthly_day_of_month: row.monthly_day_of_month,
      monthly_weekday: row.monthly_weekday,
      monthly_weekday_position: row.monthly_weekday_position,
      end_type: row.end_type,
      end_date: row.end_date,
      occurrence_count: row.occurrence_count,
      starts_at: row.starts_at,
      timezone: row.timezone,
    })

    const syncSeries = async (
      baseMeeting: SeriesBaseMeeting,
      occurrences: Date[],
      preserveMeetingIds: string[] = []
    ): Promise<{ insertedMeetingIds: string[]; error?: string }> => {
      if (occurrences.length === 0) {
        return { insertedMeetingIds: [] }
      }

      const baseMeetingId = baseMeeting.id
      const ownerId = baseMeeting.user_id ?? user.id
      const preserveIds = new Set(preserveMeetingIds)

      const { data: childRows, error: childError } = await supabase
        .schema("ai_transcriber")
        .from("meetings")
        .select("id, meeting_at")
        .eq("recurrence_parent_id", baseMeetingId)

      if (childError) {
        return { insertedMeetingIds: [], error: childError.message }
      }

      const sortedChildren = (childRows ?? []).sort((a, b) => {
        const aDate = a.meeting_at ? new Date(a.meeting_at).getTime() : Number.MAX_SAFE_INTEGER
        const bDate = b.meeting_at ? new Date(b.meeting_at).getTime() : Number.MAX_SAFE_INTEGER
        return aDate - bDate
      })

      const existingSeries = [
        { id: baseMeetingId, meeting_at: baseMeeting.meeting_at, isBase: true },
        ...sortedChildren.map((child) => ({ id: child.id, meeting_at: child.meeting_at, isBase: false })),
      ]

      const updates: Array<{ id: string; data: Partial<Database["ai_transcriber"]["Tables"]["meetings"]["Update"]> }> = []
      const inserts: Database["ai_transcriber"]["Tables"]["meetings"]["Insert"][] = []
      const deletions: string[] = []

      occurrences.forEach((occurrence, index) => {
        const occurrenceIso = occurrence.toISOString()
        const recurrenceIndex = index + 1
        const existing = existingSeries[index]

        if (existing) {
          updates.push({
            id: existing.id,
            data: {
              meeting_at: occurrenceIso,
              recurrence_parent_id: index === 0 ? null : baseMeetingId,
              recurrence_instance_index: recurrenceIndex,
              ...(index === 0
                ? {}
                : {
                    title: baseMeeting.title,
                    location: baseMeeting.location,
                  }),
            },
          })
        } else {
          inserts.push({
            user_id: ownerId,
            title: baseMeeting.title,
            meeting_at: occurrenceIso,
            location: baseMeeting.location,
            audio_file_path: "",
            recurrence_parent_id: baseMeetingId,
            recurrence_instance_index: recurrenceIndex,
          })
        }
      })

      for (let index = occurrences.length; index < existingSeries.length; index += 1) {
        const candidate = existingSeries[index]
        if (candidate.id !== baseMeetingId && !preserveIds.has(candidate.id)) {
          deletions.push(candidate.id)
        }
      }

      for (const update of updates) {
        const { error: updateError } = await supabase
          .schema("ai_transcriber")
          .from("meetings")
          .update(update.data)
          .eq("id", update.id)
          .eq("user_id", ownerId)

        if (updateError) {
          return { insertedMeetingIds: [], error: updateError.message }
        }
      }

      let insertedMeetingIds: string[] = []

      if (inserts.length > 0) {
        const { data: insertedRows, error: insertError } = await supabase
          .schema("ai_transcriber")
          .from("meetings")
          .insert(inserts)
          .select("id")

        if (insertError) {
          return { insertedMeetingIds: [], error: insertError.message }
        }

        insertedMeetingIds = insertedRows?.map((row) => row.id) ?? []
      }

      if (deletions.length > 0) {
        const { error: deleteError } = await supabase
          .schema("ai_transcriber")
          .from("meetings")
          .delete()
          .in("id", deletions)
          .eq("user_id", ownerId)

        if (deleteError) {
          return { insertedMeetingIds: [], error: deleteError.message }
        }
      }

      return { insertedMeetingIds }
    }

    const loadTemplates = async (sourceMeetingId: string): Promise<{
      attendees: AttendeeTemplate[]
      tags: TagTemplate[]
    } | { error: string }> => {
      const [attendeesResult, tagsResult] = await Promise.all([
        supabase
          .schema("ai_transcriber")
          .from("meeting_attendees")
          .select("contact_id, invitation_status, attendance_status, role, notes")
          .eq("meeting_id", sourceMeetingId),
        supabase
          .schema("ai_transcriber")
          .from("meeting_tags")
          .select("tag_id")
          .eq("meeting_id", sourceMeetingId),
      ])

      if (attendeesResult.error) {
        return { error: attendeesResult.error.message }
      }

      if (tagsResult.error) {
        return { error: tagsResult.error.message }
      }

      return {
        attendees: attendeesResult.data ?? [],
        tags: tagsResult.data ?? [],
      }
    }

    const copyTemplatesToMeetings = async (
      meetingIds: string[],
      templates: { attendees: AttendeeTemplate[]; tags: TagTemplate[] },
      ownerId: string
    ): Promise<{ error?: string }> => {
      if (meetingIds.length === 0) {
        return {}
      }

      if (templates.attendees.length > 0) {
        const attendeePayload: Database["ai_transcriber"]["Tables"]["meeting_attendees"]["Insert"][] = meetingIds.flatMap((targetId) =>
          templates.attendees.map((attendee) => ({
            meeting_id: targetId,
            contact_id: attendee.contact_id,
            user_id: ownerId,
            invitation_status: attendee.invitation_status,
            attendance_status: attendee.attendance_status,
            role: attendee.role,
            notes: attendee.notes,
          }))
        )

        const { error: attendeeError } = await supabase
          .schema("ai_transcriber")
          .from("meeting_attendees")
          .insert(attendeePayload)

        if (attendeeError) {
          return { error: attendeeError.message }
        }
      }

      if (templates.tags.length > 0) {
        const tagPayload: Database["ai_transcriber"]["Tables"]["meeting_tags"]["Insert"][] = meetingIds.flatMap((targetId) =>
          templates.tags.map((tag) => ({
            meeting_id: targetId,
            tag_id: tag.tag_id,
            user_id: ownerId,
          }))
        )

        const { error: tagError } = await supabase
          .schema("ai_transcriber")
          .from("meeting_tags")
          .insert(tagPayload)

        if (tagError) {
          return { error: tagError.message }
        }
      }

      return {}
    }

    const baseMeeting: SeriesBaseMeeting = {
      id: seriesHeadId,
      user_id: seriesHead.user_id ?? user.id,
      meeting_at: seriesHead.meeting_at,
      title: seriesHead.title,
      location: seriesHead.location,
      audio_file_path: seriesHead.audio_file_path ?? null,
    }

    const handleSeriesUpdate = async (
      anchorStartsAt: string,
      recurrencePayload: MeetingRecurrenceInput,
      triggerMeetingId: string
    ) => {
      const { data: recurrenceRow, error: recurrenceError } = await supabase
        .schema("ai_transcriber")
        .from("meeting_recurrences")
        .upsert([
          {
            meeting_id: seriesHeadId,
            frequency: recurrencePayload.frequency,
            interval: recurrencePayload.interval,
            weekdays: recurrencePayload.weekdays,
            monthly_option: recurrencePayload.monthly_option,
            monthly_day_of_month: recurrencePayload.monthly_day_of_month,
            monthly_weekday: recurrencePayload.monthly_weekday,
            monthly_weekday_position: recurrencePayload.monthly_weekday_position,
            end_type: recurrencePayload.end_type,
            end_date: recurrencePayload.end_date,
            occurrence_count: recurrencePayload.occurrence_count,
            starts_at: anchorStartsAt,
            timezone: recurrencePayload.timezone,
          }
        ], { onConflict: "meeting_id" })
        .select()
        .single()

      if (recurrenceError) {
        console.error("Error upserting meeting recurrence:", recurrenceError)
        return { success: false, error: recurrenceError.message }
      }

      const occurrences = computeRecurrenceOccurrences({ ...recurrencePayload, starts_at: anchorStartsAt })

      const { insertedMeetingIds, error: syncError } = await syncSeries(baseMeeting, occurrences)
      if (syncError) {
        console.error("Failed to align recurring meetings", syncError)
        return { success: false, error: syncError }
      }

      if (insertedMeetingIds.length > 0) {
        const templatesResult = await loadTemplates(seriesHeadId)
        if ('error' in templatesResult) {
          console.error("Failed to load templates for recurring meetings", templatesResult.error)
          return { success: false, error: templatesResult.error }
        }

        const copyResult = await copyTemplatesToMeetings(insertedMeetingIds, templatesResult, baseMeeting.user_id ?? user.id)
        if (copyResult.error) {
          console.error("Failed to copy templates to new recurring meetings", copyResult.error)
          return { success: false, error: copyResult.error }
        }
      }

      revalidatePath("/workspace/meetings")
      revalidatePath(`/workspace/meetings/${seriesHeadId}`)
      if (triggerMeetingId !== seriesHeadId) {
        revalidatePath(`/workspace/meetings/${triggerMeetingId}`)
      }
      insertedMeetingIds.forEach((id) => revalidatePath(`/workspace/meetings/${id}`))

      return {
        success: true,
        data: recurrenceRow,
        generatedMeetingsCount: insertedMeetingIds.length,
      }
    }

    if (effectiveScope === "series") {
      const anchorStartsAt = seriesHead.meeting_at ?? input.starts_at
      if (!anchorStartsAt) {
        return { success: false, error: "Set the meeting date and time before configuring recurrence." }
      }

      return await handleSeriesUpdate(anchorStartsAt, input, meetingId)
    }

    // Following scope
    if (!meeting.meeting_at) {
      return {
        success: false,
        error: "Set the meeting date and time before updating following events."
      }
    }

    const parentRecurrenceRow = seriesHead.recurrence
    if (!parentRecurrenceRow) {
      return {
        success: false,
        error: "The original meeting does not have a recurrence configured."
      }
    }

    const parentInput = recurrenceRowToInput(parentRecurrenceRow)
    const parentOccurrences = computeRecurrenceOccurrences(parentInput)
    const targetOccurrenceIso = new Date(meeting.meeting_at).toISOString()
    const targetIndex = parentOccurrences.findIndex((occurrence) => occurrence.toISOString() === targetOccurrenceIso)

    if (targetIndex <= 0) {
      return await handleSeriesUpdate(parentInput.starts_at, input, meetingId)
    }

    const keepOccurrences = parentOccurrences.slice(0, targetIndex)
    if (keepOccurrences.length === 0) {
      return await handleSeriesUpdate(parentInput.starts_at, input, meetingId)
    }

    const parentUpdateData: Partial<Database["ai_transcriber"]["Tables"]["meeting_recurrences"]["Update"]> = {}
    if (parentRecurrenceRow.end_type === "after") {
      parentUpdateData.end_type = "after"
      parentUpdateData.occurrence_count = keepOccurrences.length
      parentUpdateData.end_date = null
    } else {
      const lastOccurrence = keepOccurrences[keepOccurrences.length - 1]
      parentUpdateData.end_type = "on"
      parentUpdateData.end_date = lastOccurrence.toISOString().slice(0, 10)
      parentUpdateData.occurrence_count = null
    }

    const { data: updatedParentRecurrence, error: parentUpdateError } = await supabase
      .schema("ai_transcriber")
      .from("meeting_recurrences")
      .update(parentUpdateData)
      .eq("meeting_id", seriesHeadId)
      .select()
      .single()

    if (parentUpdateError) {
      console.error("Failed to update parent recurrence", parentUpdateError)
      return { success: false, error: parentUpdateError.message }
    }

    const detachResult = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update({ recurrence_parent_id: null, recurrence_instance_index: 1 })
      .eq("id", meetingId)
      .eq("user_id", user.id)

    if (detachResult.error) {
      console.error("Failed to detach meeting from existing series", detachResult.error)
      return { success: false, error: detachResult.error.message }
    }

    const { data: siblingMeetings, error: siblingsError } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .select("id, meeting_at")
      .eq("recurrence_parent_id", seriesHeadId)

    if (siblingsError) {
      console.error("Failed to load sibling meetings", siblingsError)
      return { success: false, error: siblingsError.message }
    }

    const targetDateValue = new Date(meeting.meeting_at).getTime()
    const siblingDeleteIds = (siblingMeetings ?? [])
      .filter((sibling) => sibling.id !== meetingId && sibling.meeting_at && new Date(sibling.meeting_at).getTime() > targetDateValue)
      .map((sibling) => sibling.id)

    if (siblingDeleteIds.length > 0) {
      const { error: deleteFutureError } = await supabase
        .schema("ai_transcriber")
        .from("meetings")
        .delete()
        .in("id", siblingDeleteIds)
        .eq("user_id", user.id)

      if (deleteFutureError) {
        console.error("Failed to remove future meetings when splitting series", deleteFutureError)
        return { success: false, error: deleteFutureError.message }
      }
    }

    const { insertedMeetingIds: parentInsertedIds, error: parentSyncError } = await syncSeries(baseMeeting, keepOccurrences, [meetingId])
    if (parentSyncError) {
      console.error("Failed to synchronise parent series", parentSyncError)
      return { success: false, error: parentSyncError }
    }

    if (parentInsertedIds.length > 0) {
      const parentTemplatesResult = await loadTemplates(seriesHeadId)
      if ('error' in parentTemplatesResult) {
        console.error("Failed to load templates for parent series", parentTemplatesResult.error)
        return { success: false, error: parentTemplatesResult.error }
      }

      const parentCopyResult = await copyTemplatesToMeetings(parentInsertedIds, parentTemplatesResult, baseMeeting.user_id ?? user.id)
      if (parentCopyResult.error) {
        console.error("Failed to copy templates for parent series", parentCopyResult.error)
        return { success: false, error: parentCopyResult.error }
      }
    }

    const newSeriesAnchor = meeting.meeting_at ?? input.starts_at
    if (!newSeriesAnchor) {
      return {
        success: false,
        error: "Set the meeting date and time before updating following events."
      }
    }

    const { data: newRecurrenceRow, error: newRecurrenceError } = await supabase
      .schema("ai_transcriber")
      .from("meeting_recurrences")
      .upsert([
        {
          meeting_id: meetingId,
          frequency: input.frequency,
          interval: input.interval,
          weekdays: input.weekdays,
          monthly_option: input.monthly_option,
          monthly_day_of_month: input.monthly_day_of_month,
          monthly_weekday: input.monthly_weekday,
          monthly_weekday_position: input.monthly_weekday_position,
          end_type: input.end_type,
          end_date: input.end_date,
          occurrence_count: input.occurrence_count,
          starts_at: newSeriesAnchor,
          timezone: input.timezone,
        }
      ], { onConflict: "meeting_id" })
      .select()
      .single()

    if (newRecurrenceError) {
      console.error("Failed to create recurrence for split series", newRecurrenceError)
      return { success: false, error: newRecurrenceError.message }
    }

    const newSeriesOccurrences = computeRecurrenceOccurrences({ ...input, starts_at: newSeriesAnchor })

    const newSeriesBase: SeriesBaseMeeting = {
      id: meeting.id,
      user_id: meeting.user_id ?? user.id,
      meeting_at: meeting.meeting_at,
      title: meeting.title,
      location: meeting.location,
      audio_file_path: meeting.audio_file_path ?? null,
    }

    const { insertedMeetingIds: newSeriesInsertedIds, error: newSeriesSyncError } = await syncSeries(newSeriesBase, newSeriesOccurrences)
    if (newSeriesSyncError) {
      console.error("Failed to synchronise new series", newSeriesSyncError)
      return { success: false, error: newSeriesSyncError }
    }

    if (newSeriesInsertedIds.length > 0) {
      const newTemplatesResult = await loadTemplates(meetingId)
      if ('error' in newTemplatesResult) {
        console.error("Failed to load templates for new series", newTemplatesResult.error)
        return { success: false, error: newTemplatesResult.error }
      }

      const newSeriesCopyResult = await copyTemplatesToMeetings(newSeriesInsertedIds, newTemplatesResult, newSeriesBase.user_id ?? user.id)
      if (newSeriesCopyResult.error) {
        console.error("Failed to copy templates for new series", newSeriesCopyResult.error)
        return { success: false, error: newSeriesCopyResult.error }
      }
    }

    revalidatePath("/workspace/meetings")
    revalidatePath(`/workspace/meetings/${seriesHeadId}`)
    revalidatePath(`/workspace/meetings/${meetingId}`)
    parentInsertedIds.forEach((id) => revalidatePath(`/workspace/meetings/${id}`))
    newSeriesInsertedIds.forEach((id) => revalidatePath(`/workspace/meetings/${id}`))

    return {
      success: true,
      data: newRecurrenceRow,
      generatedMeetingsCount: newSeriesInsertedIds.length,
      parentRecurrence: updatedParentRecurrence,
    }
  } catch (error) {
    console.error("Unexpected error upserting meeting recurrence:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteMeetingRecurrence(meetingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for deleting recurrence")
    return { success: false, error: "User not authenticated" }
  }

  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_recurrences")
      .delete()
      .eq("meeting_id", meetingId)

    if (error) {
      console.error("Error deleting meeting recurrence:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting meeting recurrence:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
