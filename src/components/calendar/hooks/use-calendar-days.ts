import { useMemo } from "react"

import type { CalendarView } from "../constants"

export type CalendarDay = {
  date: Date
  inCurrentMonth: boolean
}

export const useCalendarDays = (currentDate: Date, view: CalendarView): CalendarDay[] =>
  useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dayOfWeek = currentDate.getDay()
    const daysFromMonday = (dayOfWeek + 6) % 7
    const weekViewStartDate = currentDate.getDate() - daysFromMonday

    if (view === "day") {
      const date = new Date(year, month, currentDate.getDate())
      return [{ date, inCurrentMonth: date.getMonth() === month }]
    }

    if (view === "week") {
      return Array.from({ length: 5 }, (_, index): CalendarDay => {
        const date = new Date(year, month, weekViewStartDate + index)
        return { date, inCurrentMonth: date.getMonth() === month }
      })
    }

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const previousMonthLastDay = new Date(year, month, 0).getDate()

    const leadingDays = Array.from(
      { length: firstDayOfMonth },
      (_, index): CalendarDay => {
        const dayNumber = previousMonthLastDay - firstDayOfMonth + index + 1
        const date = new Date(year, month - 1, dayNumber)
        return { date, inCurrentMonth: false }
      }
    )

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, index): CalendarDay => {
      const dayNumber = index + 1
      const date = new Date(year, month, dayNumber)
      return { date, inCurrentMonth: true }
    })

    const totalCellsWithoutTrailing = leadingDays.length + currentMonthDays.length
    const trailingCellCount = (7 - (totalCellsWithoutTrailing % 7)) % 7

    const trailingDays = Array.from(
      { length: trailingCellCount },
      (_, index): CalendarDay => {
        const dayNumber = index + 1
        const date = new Date(year, month + 1, dayNumber)
        return { date, inCurrentMonth: false }
      }
    )
    return [...leadingDays, ...currentMonthDays, ...trailingDays]
  }, [currentDate, view])
