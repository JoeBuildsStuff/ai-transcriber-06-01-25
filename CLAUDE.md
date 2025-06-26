# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start Next.js development server on http://localhost:3000
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint checks
- `pnpm start` - Start production server
- `pnpm install` - Install dependencies (using pnpm package manager)

## Architecture Overview

This is a Next.js 15 app that provides AI-powered transcription and summarization of audio meetings using Deepgram and OpenAI APIs.

### Core Data Flow
1. **Audio Upload**: Files uploaded to Supabase Storage bucket `ai-transcriber-audio` via `src/hooks/use-supabase-upload.ts`
2. **Transcription**: `/api/transcribe` endpoint streams Deepgram results using Server-Sent Events and stores in `meetings` table
3. **Summarization**: `/api/summarize` endpoint processes transcripts with OpenAI GPT-4o and updates meeting records with structured output
4. **Workspace**: Users manage meetings through workspace pages with advanced data tables supporting filtering, sorting, and infinite scroll

### Authentication Architecture
- Supabase Auth with email, Google, and GitHub providers
- Three Supabase client patterns:
  - `src/lib/supabase/client.ts` - Browser client for client components
  - `src/lib/supabase/server.ts` - Server client for API routes and server actions  
  - `src/lib/supabase/middleware.ts` - Middleware for auth redirects
- Auth context in `src/contexts/auth-context.tsx` provides session state across app
- Server actions in `src/actions/auth.ts` handle authentication flows
- Route groups: `(Auth)` for authentication pages, `(workspace)` for authenticated features

### Database Schema
The app uses PostgreSQL with custom `ai_transcriber` schema containing:
- **meetings**: Core meeting data with transcription, summary, action items
- **contacts**: Contact management with relationships to meetings
- **contact_emails**, **contact_phones**, **contact_addresses**: Related contact data
- Types are generated in `src/types/supabase.ts`

### API Integration
- **Streaming Transcription**: Edge runtime in `/api/transcribe` with Server-Sent Events
  - Uses Deepgram Nova-3 model with speaker diarization
  - Returns real-time progress updates during processing
- **AI Services**: 
  - Deepgram SDK for speech-to-text transcription
  - OpenAI API for meeting summarization with Zod schema validation
- **Meeting CRUD**: API routes handle meeting creation, updates, and deletion

### UI Framework
- shadcn/ui components with Radix UI primitives in `src/components/ui/`
- Tailwind CSS v4 for styling with custom theme configuration
- Advanced data tables using TanStack Table for meetings/contacts lists
- Custom audio player with synchronized transcript display
- TipTap rich text editor for user notes
- Dark/light theme support with next-themes

### Key Implementation Patterns
- **State Management**: React Query (TanStack Query) for server state
- **Form Handling**: React Hook Form with Zod validation schemas
- **Infinite Scrolling**: Custom `use-infinite-query.ts` hook for pagination
- **File Uploads**: react-dropzone integration in `use-supabase-upload.ts`
- **Real-time Updates**: Server-Sent Events for live transcription progress
- **Type Safety**: Full TypeScript coverage with strict mode enabled

### File Organization
- Route groups organize pages by authentication state
- Server actions in `src/actions/` for auth flows and contact management  
- Custom hooks in `src/hooks/` handle file uploads and live transcription state
- Type-safe imports use `@/*` path mapping configured in tsconfig.json
- Edge runtime APIs in `src/app/api/` for streaming endpoints

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEEPGRAM_API_KEY=<your-deepgram-key>
OPENAI_API_KEY=<your-openai-key>
```

## Database Setup

Run migrations in `supabase/migrations/` to set up the required schema. The app expects:
- Custom `ai_transcriber` schema
- Storage bucket named `ai-transcriber-audio` for file uploads
- Row-level security policies for user data isolation