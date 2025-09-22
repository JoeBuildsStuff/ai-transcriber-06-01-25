import { notFound } from "next/navigation"

import { TaskEditForm } from "../_components/form-wrapper"
import { getTaskById } from "../_lib/queries"
import { updateTask } from "../_lib/actions"
import type { TaskWithAssociations } from "../_lib/validations"

// Wrapper function to match the expected signature for TaskEditForm
async function updateTaskWrapper(id: string, payload: Partial<TaskWithAssociations>) {
  "use server"
  const result = await updateTask(id, payload as Record<string, unknown>)
  
  // Transform the result to match the expected return type
  if (result.success) {
    return { success: true }
  } else {
    return { success: false, error: result.error }
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const task = (await getTaskById(id)) as TaskWithAssociations

    return (
      <main className="p-1">
        <TaskEditForm data={task} updateAction={updateTaskWrapper} />
      </main>
    )
  } catch (error) {
    console.error("Error fetching task:", error)
    notFound()
  }
}
