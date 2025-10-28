# Calendar Components

This directory hosts the calendar UI, its supporting hooks, and shared utilities. Everything the calendar needs should live alongside it so future changes stay cohesive and easy to reason about.

## Folder structure

- `calendar.tsx` — top-level calendar component that stitches together state, hooks, and presentation.
- `calendar-header.tsx` — navigation controls for month/year selection, view switching, and quick "Today" access.
- `calendar-weekday-header.tsx` — static weekday label row displayed above the grid.
- `calendar-grid.tsx` — renders the calendar cells plus meeting lists within each day.
- `constants.ts` — shared labels, ranges, and types used across calendar components.
- `hooks/` — shared hooks that encapsulate reusable state or derived data. Currently includes:
  - `use-calendar-days.ts` for grid calculations (leading/current/trailing days).
  - `use-calendar-meetings.ts` for meeting grouping and formatting helpers.

## Development guidance

- Keep calendar-related hooks, types, and helpers inside this folder. For example, add new hooks to `hooks/`, new types to `types.ts`, or shared utilities to `lib/` if they concern the calendar only.
- Avoid importing calendar internals elsewhere. Instead, expose high-level building blocks from this directory when needed.
- Follow the existing accessibility and interaction patterns (e.g., `ButtonGroup`, dropdown controls, aria labels) when expanding functionality.
- When introducing new features, prefer extracting discrete components or hooks within this directory to keep responsibilities focused and testable.
- The calendar supports both month and week layouts. Use the `selectedView` state and `useCalendarDays` hook to keep additional view logic centralized. The week layout renders a time-based grid with hour slots, so reuse the existing `CalendarGrid` helpers instead of duplicating formatting logic elsewhere.
