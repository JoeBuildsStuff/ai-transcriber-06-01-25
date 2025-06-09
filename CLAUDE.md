# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start Next.js development server on http://localhost:3000
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint checks
- `pnpm start` - Start production server

## Architecture Overview

This is a Next.js 15 app that provides AI-powered transcription and summarization of audio meetings using Deepgram and OpenAI APIs.

### Core Data Flow
1. **Audio Upload**: Files uploaded to Supabase Storage via `src/hooks/use-supabase-upload.ts`
2. **Transcription**: `/api/transcribe` endpoint streams Deepgram results and stores in `meetings` table
3. **Summarization**: `/api/summarize` endpoint processes transcripts with OpenAI and updates meeting records
4. **Workspace**: Users manage meetings through workspace pages with advanced data tables

### Authentication Architecture
- Supabase Auth with email, Google, and GitHub providers
- Three Supabase client patterns:
  - `src/lib/supabase/client.ts` - Browser client for client components
  - `src/lib/supabase/server.ts` - Server client for API routes and server actions
  - `src/lib/supabase/middleware.ts` - Middleware for auth redirects
- Auth context in `src/contexts/auth-context.tsx` provides session state across app
- Route groups: `(Auth)` for authentication pages, `(workspace)` for authenticated features

### API Integration
- **Streaming Transcription**: Edge runtime in `/api/transcribe` with Server-Sent Events
- **AI Services**: Deepgram for speech-to-text, OpenAI for summarization
- **Database Schema**: `ai_transcriber` schema with `meetings` table storing transcriptions and metadata

### UI Framework
- shadcn/ui components with Radix UI primitives
- Tailwind CSS for styling with custom theme
- Advanced data table with sorting, filtering, and pagination for meetings/contacts
- Custom audio player with transcript synchronization

### File Organization
- Route groups organize pages by authentication state
- Server actions in `src/actions/` for auth flows and contact management  
- Custom hooks in `src/hooks/` handle file uploads and live transcription state
- Type-safe imports use `@/*` path mapping

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEEPGRAM_API_KEY=<your-deepgram-key>
OPENAI_API_KEY=<your-openai-key>
```