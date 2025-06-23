
"use server"

import { createClient } from "@/lib/supabase/server"
import { Meetings } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

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
    .select("*")
    .eq("id", id)
    .single()

  return { data: data as Meetings | null, error }
}
