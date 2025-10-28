import { useCallback, useMemo, useState } from "react"

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
}

export const useCalendarNavigation = (
  selectedView: CalendarView,
  initialDate?: Date
): UseCalendarNavigationResult => {
  const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date())

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPreviousRange = useCallback(() => {
    setCurrentDate((previousDate) => {
      if (selectedView === "day") {
        return new Date(
          previousDate.getFullYear(),
          previousDate.getMonth(),
          previousDate.getDate() - 1
        )
      }

      if (selectedView === "week") {
        return new Date(
          previousDate.getFullYear(),
          previousDate.getMonth(),
          previousDate.getDate() - 7
        )
      }

      return new Date(previousDate.getFullYear(), previousDate.getMonth() - 1, 1)
    })
  }, [selectedView])

  const goToNextRange = useCallback(() => {
    setCurrentDate((previousDate) => {
      if (selectedView === "day") {
        return new Date(
          previousDate.getFullYear(),
          previousDate.getMonth(),
          previousDate.getDate() + 1
        )
      }

      if (selectedView === "week") {
        return new Date(
          previousDate.getFullYear(),
          previousDate.getMonth(),
          previousDate.getDate() + 7
        )
      }

      return new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 1)
    })
  }, [selectedView])

  const selectMonth = useCallback(
    (monthValue: string) => {
      const numericMonth = Number(monthValue)
      setCurrentDate((previousDate) => {
        if (selectedView === "month") {
          return new Date(previousDate.getFullYear(), numericMonth, 1)
        }

        const currentDay = previousDate.getDate()
        const daysInTargetMonth = new Date(
          previousDate.getFullYear(),
          numericMonth + 1,
          0
        ).getDate()
        const nextDay = Math.min(currentDay, daysInTargetMonth)
        return new Date(previousDate.getFullYear(), numericMonth, nextDay)
      })
    },
    [selectedView]
  )

  const selectYear = useCallback(
    (yearValue: string) => {
      const numericYear = Number(yearValue)
      setCurrentDate((previousDate) => {
        if (selectedView === "month") {
          return new Date(numericYear, previousDate.getMonth(), 1)
        }

        const currentDay = previousDate.getDate()
        const daysInTargetMonth = new Date(
          numericYear,
          previousDate.getMonth() + 1,
          0
        ).getDate()
        const nextDay = Math.min(currentDay, daysInTargetMonth)
        return new Date(numericYear, previousDate.getMonth(), nextDay)
      })
    },
    [selectedView]
  )

  const { month, year } = useMemo(() => {
    const nextYear = currentDate.getFullYear()
    const nextMonth = currentDate.getMonth()
    return { month: nextMonth, year: nextYear }
  }, [currentDate])

  const selectDay = useCallback((dayValue: string) => {
    const numericDay = Number(dayValue)
    if (Number.isNaN(numericDay)) {
      return
    }

    setCurrentDate((previousDate) => {
      const daysInTargetMonth = new Date(
        previousDate.getFullYear(),
        previousDate.getMonth() + 1,
        0
      ).getDate()
      const clampedDay = Math.min(Math.max(1, numericDay), daysInTargetMonth)
      return new Date(previousDate.getFullYear(), previousDate.getMonth(), clampedDay)
    })
  }, [])

  const selectWeekStart = useCallback((startDateKey: string) => {
    const parts = startDateKey.split("-")
    if (parts.length !== 3) {
      return
    }

    const [yearPart, monthPart, dayPart] = parts.map((part) => Number(part))
    if ([yearPart, monthPart, dayPart].some((part) => Number.isNaN(part))) {
      return
    }

    setCurrentDate(new Date(yearPart, monthPart - 1, dayPart))
  }, [])

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
  }
}
