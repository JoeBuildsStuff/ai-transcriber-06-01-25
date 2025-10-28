# Calendar Hooks

This directory hosts reusable helpers that keep the calendar views lean.

- `use-calendar-days.ts` – builds the day/week/month grid depending on the active view while flagging which dates fall inside the current month.
- `use-calendar-meetings.ts` – normalises `MeetingSummary` data into day buckets with formatted labels that the grid components can consume.
- `use-calendar-navigation.ts` – manages the currently selected date and exposes helpers for moving between ranges or selecting specific days.
- `use-current-time.ts` – rounds the local browser time to the nearest 10-minute mark and returns its position within the day as a percentage for rendering the current-time indicator.
