"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { DataTableState } from "@/lib/data-table"
import type { Json } from "@/types/supabase"

export interface SavedViewState {
  sorting: DataTableState["sorting"]
  columnFilters: DataTableState["columnFilters"]
  columnVisibility: DataTableState["columnVisibility"]
  columnOrder: DataTableState["columnOrder"]
  pagination?: DataTableState["pagination"]
}

const createEmptySavedViewState = (): SavedViewState => ({
  sorting: [],
  columnFilters: [],
  columnVisibility: {},
  columnOrder: [],
})

const deserializeSavedViewState = (value: unknown): SavedViewState => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      ...createEmptySavedViewState(),
      ...(value as Partial<SavedViewState>),
    }
  }

  return createEmptySavedViewState()
}

const serializeSavedViewState = (value: SavedViewState): Json => {
  return value as unknown as Json
}

export interface SavedViewRecord {
  id: string
  name: string
  description: string | null
  tableKey: string
  state: SavedViewState
  createdAt: string
  updatedAt: string
}

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function listSavedViews(tableKey: string): Promise<ActionResult<SavedViewRecord[]>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return {
      success: false,
      error: "You must be logged in to load saved views.",
    }
  }

  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("saved_views")
    .select("id, name, description, table_key, state, created_at, updated_at")
    .eq("table_key", tableKey)
    .eq("user_id", userData.user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching saved views:", error.message)
    return {
      success: false,
      error: "Failed to load saved views.",
    }
  }

  const records: SavedViewRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    tableKey: row.table_key,
    state: deserializeSavedViewState(row.state),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return { success: true, data: records }
}

interface SaveViewInput {
  tableKey: string
  name: string
  description?: string
  state: SavedViewState
  viewId?: string
}

export async function saveView({ tableKey, name, description, state, viewId }: SaveViewInput): Promise<ActionResult<SavedViewRecord>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return {
      success: false,
      error: "You must be logged in to save views.",
    }
  }

  const basePayload = {
    table_key: tableKey,
    name,
    description: description || null,
    state: serializeSavedViewState(state),
    updated_at: new Date().toISOString(),
  }

  const query = supabase
    .schema("ai_transcriber")
    .from("saved_views")

  let response
  if (viewId) {
    response = await query
      .update(basePayload)
      .eq("id", viewId)
      .eq("user_id", userData.user.id)
      .select("id, name, description, table_key, state, created_at, updated_at")
      .single()
  } else {
    response = await query
      .upsert(basePayload, {
        onConflict: "user_id,table_key,name",
        ignoreDuplicates: false,
      })
      .select("id, name, description, table_key, state, created_at, updated_at")
      .single()
  }

  const { data, error } = response

  if (error || !data) {
    console.error("Error saving view:", error?.message)
    return {
      success: false,
      error: error?.message || "Failed to save view.",
    }
  }

  // Revalidate generic workspace routes that may rely on saved views lists
  revalidatePath("/workspace")

  const record: SavedViewRecord = {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    tableKey: data.table_key,
    state: deserializeSavedViewState(data.state),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return { success: true, data: record }
}

export async function deleteView(viewId: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return {
      success: false,
      error: "You must be logged in to delete views.",
    }
  }

  const { error } = await supabase
    .schema("ai_transcriber")
    .from("saved_views")
    .delete()
    .eq("id", viewId)
    .eq("user_id", userData.user.id)

  if (error) {
    console.error("Error deleting view:", error.message)
    return {
      success: false,
      error: "Failed to delete view.",
    }
  }

  revalidatePath("/workspace")

  return { success: true, data: { id: viewId } }
}
