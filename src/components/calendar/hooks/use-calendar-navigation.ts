import { useCallback, useMemo } from "react"

import { type CalendarView } from "../constants"

type UseCalendarNavigationResult = {
  currentDate: Date
  month: number
  year: number
  goToPreviousRange: () => void
  goToNextRange: () => void
  goToToday: () => void
  selectMonth: (monthValue: string) => void
  selectYear: (yearValue: string) => void
  selectDay: (dayValue: string) => void
  selectWeekStart: (startDateKey: string) => void
  selectDate: (nextDate: Date) => void
}

type UseCalendarNavigationOptions = {
  selectedView: CalendarView
  date: Date
  onDateChange: (nextDate: Date) => void
}

export const useCalendarNavigation = ({
  selectedView,
  date,
  onDateChange,
}: UseCalendarNavigationOptions): UseCalendarNavigationResult => {
  const currentDate = date

  const goToToday = useCallback(() => {
    onDateChange(new Date())
  }, [onDateChange])

  const selectDate = useCallback(
    (nextDate: Date) => {
      onDateChange(nextDate)
    },
    [onDateChange]
  )

  const goToPreviousRange = useCallback(() => {
    if (selectedView === "day") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1)
      )
      return
    }

    if (selectedView === "week") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)
      )
      return
    }

    if (selectedView === "agenda") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)
      )
      return
    }

    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }, [currentDate, onDateChange, selectedView])

  const goToNextRange = useCallback(() => {
    if (selectedView === "day") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      )
      return
    }

    if (selectedView === "week") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)
      )
      return
    }

    if (selectedView === "agenda") {
      onDateChange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)
      )
      return
    }

    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }, [currentDate, onDateChange, selectedView])

  const selectMonth = useCallback(
    (monthValue: string) => {
      const numericMonth = Number(monthValue)
      if (selectedView === "month") {
        onDateChange(new Date(currentDate.getFullYear(), numericMonth, 1))
        return
      }

      const currentDay = currentDate.getDate()
      const daysInTargetMonth = new Date(currentDate.getFullYear(), numericMonth + 1, 0).getDate()
      const nextDay = Math.min(currentDay, daysInTargetMonth)
      onDateChange(new Date(currentDate.getFullYear(), numericMonth, nextDay))
    },
    [currentDate, onDateChange, selectedView]
  )

  const selectYear = useCallback(
    (yearValue: string) => {
      const numericYear = Number(yearValue)
      if (selectedView === "month") {
        onDateChange(new Date(numericYear, currentDate.getMonth(), 1))
        return
      }

      const currentDay = currentDate.getDate()
      const daysInTargetMonth = new Date(
        numericYear,
        currentDate.getMonth() + 1,
        0
      ).getDate()
      const nextDay = Math.min(currentDay, daysInTargetMonth)
      onDateChange(new Date(numericYear, currentDate.getMonth(), nextDay))
    },
    [currentDate, onDateChange, selectedView]
  )

  const { month, year } = useMemo(() => {
    return { month: currentDate.getMonth(), year: currentDate.getFullYear() }
  }, [currentDate])

  const selectDay = useCallback(
    (dayValue: string) => {
      const numericDay = Number(dayValue)
      if (Number.isNaN(numericDay)) {
        return
      }

      const daysInTargetMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate()
      const clampedDay = Math.min(Math.max(1, numericDay), daysInTargetMonth)
      onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth(), clampedDay))
    },
    [currentDate, onDateChange]
  )

  const selectWeekStart = useCallback(
    (startDateKey: string) => {
      const parts = startDateKey.split("-")
      if (parts.length !== 3) {
        return
      }

      const [yearPart, monthPart, dayPart] = parts.map((part) => Number(part))
      if ([yearPart, monthPart, dayPart].some((part) => Number.isNaN(part))) {
        return
      }

      onDateChange(new Date(yearPart, monthPart - 1, dayPart))
    },
    [onDateChange]
  )

  return {
    currentDate,
    month,
    year,
    goToPreviousRange,
    goToNextRange,
    goToToday,
    selectMonth,
    selectYear,
    selectDay,
    selectWeekStart,
    selectDate,
  }
}
