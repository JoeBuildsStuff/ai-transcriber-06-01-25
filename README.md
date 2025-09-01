# AI Next Steps

AI Next Steps is a Next.js application that turns uploaded audio into searchable meeting transcripts and summaries. Audio is stored in Supabase Storage, transcribed with Deepgram and summarized with OpenAI. User authentication, meeting data and files are all managed through Supabase.

## Features
- Email, Google and GitHub authentication using Supabase
- Upload audio files and track processing status
- Streaming transcription from `/api/transcribe` using Deepgram
- Streaming summarization from `/api/summarize` using OpenAI
- Workspace to view past meetings, edit titles and delete recordings
- Built with shadcn/ui components and Tailwind CSS

## Project Structure
- **`src/app`** – Next.js routes
  - `(Auth)` – sign in, sign up, OTP verification and password reset
  - `(workspace)/workspace` – upload page, meetings list and meeting detail
  - `api/` – transcription, summarization and meeting CRUD endpoints
- **`src/actions`** – server actions for authentication flows
- **`src/components`** – React components and UI primitives
- **`src/contexts`** – authentication context provider
- **`src/hooks`** – custom hooks for file upload and live transcription
- **`src/lib`** – Supabase client helpers and shared utilities
- **`supabase/migrations`** – SQL migrations for the `meetings` table

## Getting Started
### Prerequisites
- Node.js 18+
- A Supabase project
- API keys for Deepgram and OpenAI

### Installation
1. Install dependencies
   ```bash
   pnpm install
   ```
2. Create a `.env.local` file in the project root and set the following variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   DEEPGRAM_API_KEY=<your-deepgram-key>
   OPENAI_API_KEY=<your-openai-key>
   ```
3. Start the development server
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`.

## Scripts
- `pnpm dev` – run the Next.js dev server
- `pnpm build` – build for production
- `pnpm start` – start the production server
- `pnpm lint` – run ESLint

## Deployment
Deploy to any platform that supports Node.js. Set the environment variables from above in your hosting provider.

## Migrations
Database migrations are located in `supabase/migrations`. Apply them to your Supabase project using the Supabase CLI.

## License
This project is licensed under the MIT License.
