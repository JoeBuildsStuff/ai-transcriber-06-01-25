"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import MultipleSelector, { Option } from "@/components/ui/multiselect"
import {
  addTagsToMeeting,
  createAndAttachTag,
  getAllTags,
  removeTagsFromMeeting,
} from "@/actions/meetings"
import { Database } from "@/types/supabase"

type TagRow = Database["ai_transcriber"]["Tables"]["tags"]["Row"]

interface MeetingTagsSelectorProps {
  meetingId: string
  initialTags: TagRow[]
}

const sanitizeTagName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")

const formatTagPreview = (value: string) =>
  value
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

const mapTagToOption = (tag: TagRow): Option => ({
  value: tag.id,
  label: tag.name,
})

const mergeOptions = (base: Option[], incoming: Option[]) => {
  const optionMap = new Map<string, Option>()
  for (const option of base) {
    optionMap.set(option.value, option)
  }
  for (const option of incoming) {
    optionMap.set(option.value, option)
  }
  return Array.from(optionMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

export default function MeetingTagsSelector({ meetingId, initialTags }: MeetingTagsSelectorProps) {
  const initialOptions = useMemo(() => initialTags.map(mapTagToOption), [initialTags])
  const [availableOptions, setAvailableOptions] = useState<Option[]>(() =>
    mergeOptions([], initialOptions)
  )
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setSelectedOptions(initialOptions)
    setAvailableOptions((prev) => mergeOptions(prev, initialOptions))
  }, [initialOptions])

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getAllTags()
        const tagOptions = tags.map(mapTagToOption)
        setAvailableOptions((prev) => mergeOptions(prev, tagOptions))
      } catch (error) {
        console.error("Error loading tags:", error)
        toast.error("Failed to load tags")
      }
    }

    void loadTags()
  }, [])

  const handleTagChange = async (nextSelected: Option[]) => {
    setIsLoading(true)

    try {
      const existingValues = new Set(availableOptions.map((option) => option.value))
      const replacements = new Map<string, Option>()
      const failedValues = new Set<string>()
      const createdIds: string[] = []

      for (const option of nextSelected) {
        if (existingValues.has(option.value)) continue

        const sanitized = sanitizeTagName(option.label)

        if (!sanitized) {
          toast.error("Tag name cannot be empty")
          failedValues.add(option.value)
          continue
        }

        const result = await createAndAttachTag(meetingId, sanitized)
        if ('error' in result && result.error) {
          toast.error(result.error)
          failedValues.add(option.value)
          continue
        }

        if (result.data) {
          const createdOption = mapTagToOption(result.data)
          replacements.set(option.value, createdOption)
          createdIds.push(result.data.id)
        }
      }

      const finalSelection = nextSelected
        .filter((option) => !failedValues.has(option.value))
        .map((option) => replacements.get(option.value) ?? option)

      if (replacements.size > 0) {
        setAvailableOptions((prev) => mergeOptions(prev, Array.from(replacements.values())))
        replacements.forEach((value) => {
          toast.success(`Tag "${value.label}" added`)
        })
      }

      const previousIds = new Set(selectedOptions.map((option) => option.value))
      const finalIds = new Set(finalSelection.map((option) => option.value))

      const idsToRemove = Array.from(previousIds).filter((id) => !finalIds.has(id))
      const idsToAdd = Array.from(finalIds).filter(
        (id) => !previousIds.has(id) && !createdIds.includes(id)
      )

      if (idsToRemove.length > 0) {
        const removal = await removeTagsFromMeeting(meetingId, idsToRemove)
        if (removal.error) {
          toast.error(removal.error)
          return
        }
        if (removal.message) {
          toast.success(removal.message)
        }
      }

      if (idsToAdd.length > 0) {
        const addition = await addTagsToMeeting(meetingId, idsToAdd)
        if (addition.error) {
          toast.error(addition.error)
          return
        }
        if (addition.message) {
          toast.success(addition.message)
        }
      }

      setSelectedOptions(finalSelection)
    } catch (error) {
      console.error("Error updating tags:", error)
      toast.error("Failed to update tags")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1">
      <MultipleSelector
        value={selectedOptions}
        options={availableOptions}
        placeholder="Select tags..."
        className="font-extralight border-none bg-input/30"
        hidePlaceholderWhenSelected
        hideClearAllButton
        creatable
        createLabel={(value) => {
          const preview = formatTagPreview(value)
          const sanitized = sanitizeTagName(value)

          if (!preview.replace(/-/g, "").trim()) {
            return "Add tag?"
          }

          return sanitized ? `Add ${preview}?` : `Add ${preview}?`
        }}
        emptyIndicator={<p className="text-center text-sm font-extralight">No tags found</p>}
        onChange={handleTagChange}
        disabled={isLoading}
      />
    </div>
  )
}
