# Clarity

A personal, AI-powered mental health companion. Private daily-use tool to log emotions, identify patterns, get honest feedback, and build a living record of your emotional life.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Deploy**: Vercel

## Setup

### 1. Supabase

1. Create a new Supabase project
2. Run `supabase-schema.sql` in the SQL Editor
3. Create a user via Authentication > Users > Add User (email/password)

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run Locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

1. Connect this repo to Vercel
2. Set root directory to `./` (or `clarity/` if in monorepo)
3. Add the 3 environment variables above
4. Deploy

## Features

- Daily mood check-ins with AI reflection
- Full conversational chat with Claude
- Guided emotion audit flow
- Journal with all entries
- Weekly emotional reports
- Life Audit (persistent context for AI)
- Daily affirmations and micro-challenges
