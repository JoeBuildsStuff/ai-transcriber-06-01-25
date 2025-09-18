"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { InputNumber } from "@/components/ui/input-number"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DateField, DateInput } from "@/components/ui/datefield-rac"
import { CalendarDate, parseDate } from "@internationalized/date"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { format } from "date-fns"
import { getLocalTimeZone } from "@internationalized/date"

import { deleteMeetingRecurrence, upsertMeetingRecurrence } from "../_lib/actions"
import type { MeetingRecurrence } from "../_lib/validations"

const CUSTOM_DIALOG_TRIGGER = "custom"
const CUSTOM_CURRENT_VALUE = "custom-current"

const DAY_CODES = ["su", "m", "t", "w", "th", "f", "sa"] as const
const DAY_LABELS: Record<typeof DAY_CODES[number], string> = {
  su: "Sunday",
  m: "Monday",
  t: "Tuesday",
  w: "Wednesday",
  th: "Thursday",
  f: "Friday",
  sa: "Saturday"
}
const ORDINAL_LABELS = ["1st", "2nd", "3rd", "4th", "5th"]

interface MeetingRepeatProps {
  meetingId: string
  meetingDate?: string | null
  recurrence?: MeetingRecurrence | null
  recurrenceParentId?: string | null
}

type FrequencyType = "day" | "week" | "month" | "year"
type EndOption = "on" | "after"
type MonthlyOption = "day" | "weekday"

type RecurrencePreset = "none" | "weekly" | "monthly" | "yearly" | typeof CUSTOM_CURRENT_VALUE

type RecurrenceScope = "series" | "following"

type RecurrenceFormPayload = {
  frequency: FrequencyType
  interval: number
  weekdays: string[] | null
  monthly_option: MonthlyOption | null
  monthly_day_of_month: number | null
  monthly_weekday: string | null
  monthly_weekday_position: number | null
  end_type: EndOption
  end_date: string | null
  occurrence_count: number | null
  starts_at: string
  timezone: string
}

const toCalendarDate = (date: Date): CalendarDate => parseDate(date.toISOString().slice(0, 10))
const getToggleValueForDate = (date: Date): typeof DAY_CODES[number] => DAY_CODES[date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6]
const getWeekdayOrdinal = (date: Date): number => Math.floor((date.getDate() - 1) / 7) + 1

const derivePresetFromRecurrence = (
  recurrence: MeetingRecurrence | null | undefined,
  anchorDay: typeof DAY_CODES[number]
): RecurrencePreset => {
  if (!recurrence) {
    return "none"
  }

  if (
    recurrence.frequency === "week" &&
    recurrence.interval === 1 &&
    recurrence.weekdays &&
    recurrence.weekdays.length === 1 &&
    recurrence.weekdays[0] === anchorDay
  ) {
    return "weekly"
  }

  if (
    recurrence.frequency === "month" &&
    recurrence.interval === 1
  ) {
    return "monthly"
  }

  if (
    recurrence.frequency === "year" &&
    recurrence.interval === 1
  ) {
    return "yearly"
  }

  return CUSTOM_CURRENT_VALUE
}

const formatMonthlySummary = (date: Date): string => {
  const ordinalIndex = getWeekdayOrdinal(date) - 1
  const ordinalLabel = ORDINAL_LABELS[ordinalIndex] ?? `${ordinalIndex + 1}th`
  const dayName = format(date, "EEEE")
  return `Monthly on the ${ordinalLabel} ${dayName}`
}

const buildCustomSummary = (
  frequencyType: FrequencyType,
  frequencyNumber: number,
  selectedDays: string[],
  monthlyOption: MonthlyOption,
  baseDate: Date
): string => {
  if (frequencyType === "day") {
    return frequencyNumber === 1 ? "Daily" : `Every ${frequencyNumber} days`
  }

  if (frequencyType === "week") {
    const dayNames = selectedDays.map((day) => DAY_LABELS[day as typeof DAY_CODES[number]])
    return frequencyNumber === 1
      ? `Weekly on ${dayNames.join(", ")}`
      : `Every ${frequencyNumber} weeks on ${dayNames.join(", ")}`
  }

  if (frequencyType === "month") {
    if (monthlyOption === "day") {
      return frequencyNumber === 1
        ? `Monthly on day ${baseDate.getDate()}`
        : `Every ${frequencyNumber} months on day ${baseDate.getDate()}`
    }

    return frequencyNumber === 1
      ? formatMonthlySummary(baseDate)
      : `Every ${frequencyNumber} months on the ${formatMonthlySummary(baseDate).split(" on the ")[1]}`
  }

  return frequencyNumber === 1
    ? `Yearly on ${format(baseDate, "MMMM d")}`
    : `Every ${frequencyNumber} years on ${format(baseDate, "MMMM d")}`
}

const normalizePositiveInteger = (value: number | null | undefined, fallback: number): number => {
  if (!value || Number.isNaN(value) || value <= 0) {
    return fallback
  }
  return Math.floor(value)
}

const mapRecurrenceEndType = (value: MeetingRecurrence["end_type"] | null | undefined): EndOption => {
  if (value === "on") {
    return "on"
  }
  return "after"
}

export default function MeetingRepeat({ meetingId, meetingDate, recurrence, recurrenceParentId }: MeetingRepeatProps) {
  const router = useRouter()
  const anchorDate = useMemo(() => {
    if (recurrence?.starts_at) return new Date(recurrence.starts_at)
    if (meetingDate) return new Date(meetingDate)
    return new Date()
  }, [meetingDate, recurrence?.starts_at])

  const defaultEndDate = useMemo(() => {
    const date = new Date(anchorDate)
    date.setFullYear(date.getFullYear() + 1)
    return toCalendarDate(date)
  }, [anchorDate])

  const anchorDay = useMemo(() => getToggleValueForDate(anchorDate), [anchorDate])

  const isSeriesHead = !recurrenceParentId

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedValue, setSelectedValue] = useState<RecurrencePreset>("none")
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("day")
  const [frequencyNumber, setFrequencyNumber] = useState<number>(1)
  const [selectedDays, setSelectedDays] = useState<string[]>([anchorDay])
  const [monthlyOption, setMonthlyOption] = useState<MonthlyOption>("day")
  const [endOption, setEndOption] = useState<EndOption>("after")
  const [endDate, setEndDate] = useState<CalendarDate>(defaultEndDate)
  const [occurrenceCount, setOccurrenceCount] = useState<number>(12)
  const [isScopeDialogOpen, setIsScopeDialogOpen] = useState(false)
  const [scopeChoice, setScopeChoice] = useState<RecurrenceScope>("series")
  const [pendingPayload, setPendingPayload] = useState<RecurrenceFormPayload | null>(null)
  const [pendingPresetValue, setPendingPresetValue] = useState<RecurrencePreset | null>(null)

  useEffect(() => {
    setSelectedDays(recurrence?.weekdays ?? [anchorDay])
    setFrequencyType((recurrence?.frequency as FrequencyType) ?? "day")
    setFrequencyNumber(recurrence?.interval ?? 1)
    setMonthlyOption((recurrence?.monthly_option as MonthlyOption) ?? "day")
    setEndOption(mapRecurrenceEndType(recurrence?.end_type))
    setEndDate(recurrence?.end_date ? parseDate(recurrence.end_date) : defaultEndDate)
    setOccurrenceCount(normalizePositiveInteger(recurrence?.occurrence_count, 12))
    setSelectedValue(derivePresetFromRecurrence(recurrence, anchorDay))
  }, [recurrence, anchorDay, defaultEndDate])

  useEffect(() => {
    setSelectedDays((previous) => (previous.length === 0 ? [anchorDay] : previous))
  }, [anchorDay])

  const buildPayload = (options?: {
    frequency?: FrequencyType
    interval?: number
    days?: string[]
    monthStrategy?: MonthlyOption
    endStrategy?: EndOption
    endBoundary?: CalendarDate
    occurrenceTotal?: number
  }): RecurrenceFormPayload => {
    const effectiveFrequency = options?.frequency ?? frequencyType
    const effectiveInterval = normalizePositiveInteger(options?.interval ?? frequencyNumber, 1)
    const effectiveDays = options?.days ?? selectedDays
    const effectiveMonthlyOption = options?.monthStrategy ?? monthlyOption
    const effectiveEndOption = options?.endStrategy ?? endOption
    const effectiveEndDate = options?.endBoundary ?? endDate
    const effectiveOccurrenceCount = normalizePositiveInteger(options?.occurrenceTotal ?? occurrenceCount, 1)

    if (effectiveFrequency === "week" && (!effectiveDays || effectiveDays.length === 0)) {
      throw new Error("Select at least one weekday for a weekly recurrence")
    }

    if (effectiveEndOption === "on" && !effectiveEndDate) {
      throw new Error("Choose an end date for the recurrence")
    }

    const timezone = getLocalTimeZone()
    const monthlyDayOfMonth =
      effectiveFrequency === "month" && effectiveMonthlyOption === "day" ? anchorDate.getDate() : null
    const monthlyWeekday =
      effectiveFrequency === "month" && effectiveMonthlyOption === "weekday" ? anchorDay : null
    const monthlyWeekdayPosition =
      effectiveFrequency === "month" && effectiveMonthlyOption === "weekday" ? getWeekdayOrdinal(anchorDate) : null

    return {
      frequency: effectiveFrequency as MeetingRecurrence["frequency"],
      interval: effectiveInterval,
      weekdays: effectiveFrequency === "week" ? effectiveDays : null,
      monthly_option:
        effectiveFrequency === "month"
          ? (effectiveMonthlyOption as MeetingRecurrence["monthly_option"])
          : null,
      monthly_day_of_month: monthlyDayOfMonth,
      monthly_weekday: monthlyWeekday,
      monthly_weekday_position: monthlyWeekdayPosition,
      end_type: effectiveEndOption,
      end_date: effectiveEndOption === "on" ? effectiveEndDate.toString() : null,
      occurrence_count: effectiveEndOption === "after" ? effectiveOccurrenceCount : null,
      starts_at: anchorDate.toISOString(),
      timezone
    }
  }

  const resetScopeDialogState = () => {
    setPendingPayload(null)
    setPendingPresetValue(null)
    setScopeChoice("series")
    setIsScopeDialogOpen(false)
  }

  const finalizeRecurrenceSave = async (
    payload: RecurrenceFormPayload,
    scope: RecurrenceScope,
    presetValue: RecurrencePreset | null
  ) => {
    const effectiveScope: RecurrenceScope = scope === "following" && isSeriesHead ? "series" : scope
    const currentMeetingIso = meetingDate ? new Date(meetingDate).toISOString() : null

    if (effectiveScope === "following" && !currentMeetingIso) {
      toast.error("Set a date and time for this meeting before updating following events")
      return
    }

    const scopedPayload: RecurrenceFormPayload =
      effectiveScope === "following" && currentMeetingIso
        ? { ...payload, starts_at: currentMeetingIso }
        : payload

    setIsSaving(true)
    try {
      const result = await upsertMeetingRecurrence(meetingId, scopedPayload, { scope: effectiveScope })
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update recurrence")
      }

      if (presetValue) {
        setSelectedValue(presetValue)
      } else {
        setSelectedValue(CUSTOM_CURRENT_VALUE)
      }

      const successMessage =
        effectiveScope === "following"
          ? "Recurrence updated for this and following events"
          : "Recurrence updated for all events"

      toast.success(successMessage)
      resetScopeDialogState()
      setIsDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving recurrence", error)
      toast.error(error instanceof Error ? error.message : "Failed to update recurrence")
      if (!isSeriesHead && scope === "following") {
        setIsScopeDialogOpen(true)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const queueRecurrenceSave = (payload: RecurrenceFormPayload, presetValue: RecurrencePreset | null) => {
    if (!isSeriesHead) {
      setPendingPayload(payload)
      setPendingPresetValue(presetValue ?? CUSTOM_CURRENT_VALUE)
      setScopeChoice("series")
      setIsScopeDialogOpen(true)
      return
    }

    void finalizeRecurrenceSave(payload, "series", presetValue)
  }

  const handleDeleteRecurrence = async () => {
    if (!isSeriesHead) {
      toast.info("Open the first meeting in the series to remove the recurrence")
      return
    }

    setIsSaving(true)
    try {
      const result = await deleteMeetingRecurrence(meetingId)
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove recurrence")
        return
      }

      setSelectedValue("none")
      setFrequencyType("day")
      setFrequencyNumber(1)
      setSelectedDays([anchorDay])
      setMonthlyOption("day")
      setEndOption("after")
      setEndDate(defaultEndDate)
      setOccurrenceCount(12)
      toast.success("Recurrence removed")
      router.refresh()
    } catch (error) {
      console.error("Error deleting recurrence", error)
      toast.error("Failed to remove recurrence")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePresetSelection = (value: RecurrencePreset) => {
    if (value === CUSTOM_CURRENT_VALUE) {
      setIsDialogOpen(true)
      return
    }

    if (value === "none") {
      void handleDeleteRecurrence()
      return
    }

    try {
      const presetOptions: Record<Exclude<RecurrencePreset, "none" | typeof CUSTOM_CURRENT_VALUE>, () => void> = {
        weekly: () => {
          setFrequencyType("week")
          setFrequencyNumber(1)
          setSelectedDays([anchorDay])
          setMonthlyOption("day")
          setEndOption("after")
          setEndDate(defaultEndDate)
          setOccurrenceCount(12)
        },
        monthly: () => {
          setFrequencyType("month")
          setFrequencyNumber(1)
          setSelectedDays([anchorDay])
          setMonthlyOption("weekday")
          setEndOption("after")
          setEndDate(defaultEndDate)
          setOccurrenceCount(12)
        },
        yearly: () => {
          setFrequencyType("year")
          setFrequencyNumber(1)
          setSelectedDays([anchorDay])
          setMonthlyOption("day")
          setEndOption("after")
          setEndDate(defaultEndDate)
          setOccurrenceCount(12)
        }
      }

      presetOptions[value]()

      const payload = buildPayload({
        frequency: value === "weekly" ? "week" : value === "monthly" ? "month" : "year",
        interval: 1,
        days: value === "weekly" ? [anchorDay] : undefined,
        monthStrategy: value === "monthly" ? "weekday" : "day",
        endStrategy: "after"
      })

      queueRecurrenceSave(payload, value)
    } catch (error) {
      console.error("Error preparing preset recurrence", error)
      toast.error(error instanceof Error ? error.message : "Failed to prepare recurrence changes")
    }
  }

  const handleSaveCustomRecurrence = () => {
    try {
      const payload = buildPayload()
      setIsDialogOpen(false)
      queueRecurrenceSave(payload, CUSTOM_CURRENT_VALUE)
    } catch (error) {
      console.error("Error preparing custom recurrence", error)
      toast.error(error instanceof Error ? error.message : "Failed to prepare recurrence changes")
    }
  }

  const baseDateDisplay = anchorDate

  const customSummary = buildCustomSummary(
    frequencyType,
    frequencyNumber,
    selectedDays,
    monthlyOption,
    anchorDate
  )

  const handleSelectChange = (value: string) => {
    if (value === CUSTOM_DIALOG_TRIGGER) {
      setIsDialogOpen(true)
      return
    }

    handlePresetSelection(value as RecurrencePreset)
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="flex flex-col gap-1">
          <Select value={selectedValue} onValueChange={handleSelectChange} disabled={isSaving}>
            <SelectTrigger className="shadow-none border-none">
              <SelectValue placeholder="Select repeat">
                {selectedValue === CUSTOM_CURRENT_VALUE ? customSummary : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled={!isSeriesHead}>
                Does not repeat
              </SelectItem>
              <SelectItem value="weekly">Weekly on {format(baseDateDisplay, "EEEE")}</SelectItem>
              <SelectItem value="monthly">{formatMonthlySummary(baseDateDisplay)}</SelectItem>
              <SelectItem value="yearly">Yearly on {format(baseDateDisplay, "MMMM d")}</SelectItem>
              {selectedValue === CUSTOM_CURRENT_VALUE && (
                <SelectItem
                  value={CUSTOM_CURRENT_VALUE}
                  onSelect={(event) => {
                    event.preventDefault()
                    setIsDialogOpen(true)
                  }}
                >
                  Custom — {customSummary}
                </SelectItem>
              )}
              <SelectItem
                value={CUSTOM_DIALOG_TRIGGER}
                onSelect={(event) => {
                  event.preventDefault()
                  setIsDialogOpen(true)
                }}
              >
                Custom
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogContent className="w-fit rounded-3xl p-4">
          <DialogHeader>
            <DialogTitle>Custom Recurrence</DialogTitle>
            <DialogDescription>Configure how often this meeting repeats.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-8">
            <Label htmlFor="frequency">Repeat every</Label>
            <div className="flex flex-row items-center gap-2">
              <InputNumber
                placeholder="1"
                className="w-[5rem]"
                value={frequencyNumber}
                onChange={(value) => setFrequencyNumber(normalizePositiveInteger(value, 1))}
              />
              <Select value={frequencyType} onValueChange={(value) => setFrequencyType(value as FrequencyType)}>
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">day</SelectItem>
                  <SelectItem value="week">week</SelectItem>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(frequencyType === "week" || frequencyType === "month") && (
            <div className="flex flex-row items-center justify-between gap-2">
              <Label htmlFor="days" className="w-[8rem]">Repeat on</Label>

              {frequencyType === "week" && (
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  value={selectedDays}
                  onValueChange={(values) => setSelectedDays(values.length ? values : [anchorDay])}
                  className="w-full"
                >
                  <ToggleGroupItem value="su">S</ToggleGroupItem>
                  <ToggleGroupItem value="m">M</ToggleGroupItem>
                  <ToggleGroupItem value="t">T</ToggleGroupItem>
                  <ToggleGroupItem value="w">W</ToggleGroupItem>
                  <ToggleGroupItem value="th">T</ToggleGroupItem>
                  <ToggleGroupItem value="f">F</ToggleGroupItem>
                  <ToggleGroupItem value="sa">S</ToggleGroupItem>
                </ToggleGroup>
              )}

              {frequencyType === "month" && (
                <Select value={monthlyOption} onValueChange={(value) => setMonthlyOption(value as MonthlyOption)}>
                  <SelectTrigger className="w-fit">
                    <SelectValue placeholder={`Monthly on day ${anchorDate.getDate()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Monthly on day {anchorDate.getDate()}</SelectItem>
                    <SelectItem value="weekday">{formatMonthlySummary(anchorDate)}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Label htmlFor="ends">Ends</Label>
            <div>
              <RadioGroup value={endOption} onValueChange={(value) => setEndOption(value as EndOption)} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="on" id="end-on" />
                    <Label htmlFor="end-on">On</Label>
                  </div>
                  <DateField value={endDate} onChange={(value) => value && setEndDate(value)}>
                    <DateInput />
                  </DateField>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="after" id="end-after" />
                    <Label htmlFor="end-after">After</Label>
                  </div>
                  <InputNumber
                    placeholder="12"
                    className="w-[5rem]"
                    value={occurrenceCount}
                    onChange={(value) => setOccurrenceCount(normalizePositiveInteger(value, 1))}
                  />
                </div>
              </RadioGroup>
            </div>
          </div>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button variant="default" onClick={handleSaveCustomRecurrence} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isScopeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetScopeDialogState()
          } else {
            setIsScopeDialogOpen(true)
          }
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply recurrence changes</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how these recurrence updates should apply to your meetings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3">
            <RadioGroup
              value={scopeChoice}
              onValueChange={(value) => setScopeChoice(value as RecurrenceScope)}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="series" id="scope-series" />
                <Label htmlFor="scope-series" className="font-normal leading-snug">
                  All events in the series
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="following" id="scope-following" disabled={isSeriesHead} />
                <Label htmlFor="scope-following" className="font-normal leading-snug">
                  This and following events
                  {isSeriesHead && " (open a future meeting to use this option)"}
                </Label>
              </div>
            </RadioGroup>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving || !pendingPayload}
              onClick={async (event) => {
                event.preventDefault()
                if (!pendingPayload) return
                await finalizeRecurrenceSave(
                  pendingPayload,
                  scopeChoice,
                  pendingPresetValue ?? CUSTOM_CURRENT_VALUE
                )
              }}
            >
              {isSaving ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
