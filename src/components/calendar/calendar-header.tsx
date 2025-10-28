import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  CALENDAR_VIEWS,
  DAYS_OF_WEEK,
  MONTHS,
  YEARS,
  type CalendarView,
} from "./constants"

type CalendarHeaderProps = {
  month: number
  year: number
  currentDate: Date
  selectedView: CalendarView
  selectedViewLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onMonthSelect: (month: string) => void
  onYearSelect: (year: string) => void
  onViewSelect: (nextView: string) => void
  onDaySelect: (day: string) => void
  onWeekSelect: (startDateKey: string) => void
}

const getDateKey = (date: Date): string => {
  const yearPart = String(date.getFullYear())
  const monthPart = String(date.getMonth() + 1).padStart(2, "0")
  const dayPart = String(date.getDate()).padStart(2, "0")
  return `${yearPart}-${monthPart}-${dayPart}`
}

const createWeekLabel = (weekStart: Date, weekEnd: Date, baseMonth: number): string => {
  const startMonth = weekStart.getMonth()
  const endMonth = weekEnd.getMonth()

  if (startMonth === endMonth && startMonth === baseMonth) {
    return `${weekStart.getDate()} - ${weekEnd.getDate()}`
  }

  if (startMonth === endMonth) {
    return `${MONTHS[startMonth]} ${weekStart.getDate()} - ${weekEnd.getDate()}`
  }

  const startLabel = `${MONTHS[startMonth]} ${weekStart.getDate()}`
  const endLabel = `${MONTHS[endMonth]} ${weekEnd.getDate()}`
  return `${startLabel} - ${endLabel}`
}

export const CalendarHeader = ({
  month,
  year,
  currentDate,
  selectedView,
  selectedViewLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  onMonthSelect,
  onYearSelect,
  onViewSelect,
  onDaySelect,
  onWeekSelect,
}: CalendarHeaderProps) => {
  let previousRangeLabel = "Previous month"
  let nextRangeLabel = "Next month"

  if (selectedView === "day") {
    previousRangeLabel = "Previous day"
    nextRangeLabel = "Next day"
  } else if (selectedView === "week") {
    previousRangeLabel = "Previous week"
    nextRangeLabel = "Next week"
  }

  const selectableViews = CALENDAR_VIEWS.filter(({ value }) =>
    value === "day" || value === "week" || value === "month"
  )

  const daysInCurrentMonth = useMemo(() => {
    if (selectedView !== "day") {
      return []
    }
    const totalDays = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: totalDays }, (_, index) => index + 1)
  }, [month, selectedView, year])

  const currentWeekStartDate = useMemo(() => {
    if (selectedView !== "week") {
      return undefined
    }

    const dayOfWeek = currentDate.getDay()
    const daysFromMonday = (dayOfWeek + 6) % 7
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - daysFromMonday
    )
  }, [currentDate, selectedView])

  const currentWeekStartKey = useMemo(() => {
    if (!currentWeekStartDate) {
      return ""
    }

    return getDateKey(currentWeekStartDate)
  }, [currentWeekStartDate])

  const weekOptions = useMemo(() => {
    if (selectedView !== "week") {
      return []
    }

    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)
    const firstWeekStart = new Date(
      year,
      month,
      1 - ((firstOfMonth.getDay() + 6) % 7)
    )
    const options: { value: string; label: string }[] = []

    let cursor = firstWeekStart
    while (cursor <= lastOfMonth) {
      const weekStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      const weekEnd = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + 4
      )
      options.push({ value: getDateKey(weekStart), label: createWeekLabel(weekStart, weekEnd, month) })
      cursor = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
    }

    return options
  }, [month, selectedView, year])

  const dateControlLabel = selectedView === "week" && currentWeekStartDate
    ? createWeekLabel(
        currentWeekStartDate,
        new Date(
          currentWeekStartDate.getFullYear(),
          currentWeekStartDate.getMonth(),
          currentWeekStartDate.getDate() + 4
        ),
        month
      )
    : String(currentDate.getDate())

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <div className="flex items-center gap-3 w-full justify-between">
          <ButtonGroup aria-label="Calendar navigation and date selection">
            <Button type="button" variant="outline" size="sm" onClick={onPrevMonth}>
              <span className="sr-only">{previousRangeLabel}</span>
              <ChevronLeft className="h-4 w-4">
                <title>Go to {previousRangeLabel.toLowerCase()}</title>
              </ChevronLeft>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {MONTHS[month]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" aria-label="Select month">
                <DropdownMenuRadioGroup value={String(month)} onValueChange={onMonthSelect}>
                  {MONTHS.map((label, index) => (
                    <DropdownMenuRadioItem key={label} value={String(index)}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {(selectedView === "day" || selectedView === "week") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    {dateControlLabel}
                  </Button>
                </DropdownMenuTrigger>
                {selectedView === "day" ? (
                  <DropdownMenuContent align="center" aria-label="Select day">
                    <DropdownMenuRadioGroup value={String(currentDate.getDate())} onValueChange={onDaySelect}>
                      {daysInCurrentMonth.map((dayOption) => (
                        <DropdownMenuRadioItem key={dayOption} value={String(dayOption)}>
                          {dayOption}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                ) : (
                  <DropdownMenuContent align="center" aria-label="Select week range">
                    <DropdownMenuRadioGroup value={currentWeekStartKey} onValueChange={onWeekSelect}>
                      {weekOptions.map(({ value, label }) => (
                        <DropdownMenuRadioItem key={value} value={value}>
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {year}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" aria-label="Select year" className="h-64">
                <DropdownMenuRadioGroup value={String(year)} onValueChange={onYearSelect}>
                  {YEARS.map((yearOption) => (
                    <DropdownMenuRadioItem key={yearOption} value={String(yearOption)}>
                      {yearOption}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" variant="outline" size="sm" onClick={onNextMonth}>
              <span className="sr-only">{nextRangeLabel}</span>
              <ChevronRight className="h-4 w-4">
                <title>Go to {nextRangeLabel.toLowerCase()}</title>
              </ChevronRight>
            </Button>
          </ButtonGroup>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={selectedView}
              onValueChange={(nextView) => {
                if (nextView) {
                  onViewSelect(nextView)
                }
              }}
              aria-label={`Select calendar view (currently ${selectedViewLabel})`}
            >
              {selectableViews.map(({ label, value }) => (
                <ToggleGroupItem key={value} value={value}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button type="button" variant="outline" size="sm" onClick={onToday}>
              Today
              <ChevronRight className="h-4 w-4">
                <title>Jump to today</title>
              </ChevronRight>
            </Button>
          </div>
        </div>
      </div>
      {selectedView === "month" && (
        <div className="grid grid-cols-7 mt-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
