# Supabase-Integrated Components

This directory contains UI components that are integrated with Supabase for automatic data persistence.

## Components

### InputSupabase
Auto-saving text input field that saves to database on blur.

```tsx
import InputSupabase from "@/components/supabase/_components/input-supabase"

<InputSupabase 
  table="meetings" 
  field="title" 
  id={meetingId} 
  initialValue={meeting.title || ''} 
/>
```

### DateFieldSupabase & TimeFieldSupabase
Auto-saving date and time fields that save to database on blur.

```tsx
import { DateFieldSupabase, TimeFieldSupabase, DateInputSupabase } from "@/components/supabase/_components/datefield-rac-supabase"

<DateFieldSupabase 
  table="meetings" 
  field="meeting_at" 
  id={meetingId} 
  initialValue={meeting.meeting_at}
>
  <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
  <DateInputSupabase />
</DateFieldSupabase>

<TimeFieldSupabase 
  table="meetings" 
  field="meeting_at" 
  id={meetingId} 
  initialValue={meeting.meeting_at}
>
  <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
  <DateInputSupabase />
</TimeFieldSupabase>
```

### SwitchSupabase
Auto-saving toggle switch that saves immediately on change.

```tsx
import SwitchSupabase from "@/components/supabase/_components/switch-supabase"

<SwitchSupabase 
  table="meetings" 
  field="meeting_reviewed" 
  id={meetingId} 
  initialValue={meeting.meeting_reviewed || false} 
/>
```

## Features

- **Auto-saving**: Changes are automatically saved to the database
- **Visual feedback**: Unsaved changes are highlighted in blue
- **Loading states**: Components are disabled during updates
- **Error handling**: Failed updates are rolled back automatically
- **Optimistic updates**: UI updates immediately for better UX
- **Temporary ID support**: Can create new records with temp IDs

## Props

All components accept these common props:

- `table`: Database table name
- `field`: Field name in the table
- `id`: Record ID (can be temporary with 'temp-' prefix)
- `initialValue`: Initial value from database
- `onNoteCreated?`: Callback when a new record is created (for temp IDs)
- `className?`: Additional CSS classes

## Hooks

The components use custom hooks that can be used directly if needed:

- `useSupabaseInput`: For text inputs
- `useSupabaseDateField`: For date fields
- `useSupabaseTimeField`: For time fields
- `useSupabaseField`: For simple fields (switches, etc.)
