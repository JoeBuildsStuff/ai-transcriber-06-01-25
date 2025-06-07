"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const newContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  nickname: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),
  primary_phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  is_favorite: z.coerce.boolean().default(false).optional(),
  tags: z.string().optional(),
})

export async function createContact(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    display_name: formData.get("display_name"),
    nickname: formData.get("nickname"),
    primary_email: formData.get("primary_email"),
    primary_phone: formData.get("primary_phone"),
    company: formData.get("company"),
    job_title: formData.get("job_title"),
    birthday: formData.get("birthday"),
    notes: formData.get("notes"),
    is_favorite: formData.get("is_favorite"),
    tags: formData.get("tags"),
  }

  const validatedFields = newContactSchema.safeParse(rawData)

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors)
    return {
      error: "Invalid fields",
    }
  }

  const { tags, ...contactData } = validatedFields.data
  const tagsArray = tags
    ? tags.split(",").map((tag) => tag.trim())
    : undefined

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to create a contact.",
    }
  }

  const { error } = await supabase
    .from("contacts")
    .insert({ ...contactData, tags: tagsArray, user_id: userData.user.id })

  if (error) {
    return {
      error: error.message,
    }
  }

  revalidatePath("/workspace/contacts")

  return {
    data: "Contact created successfully",
  }
} 