# Project Status

## End Goal
Stay sharp on chess openings (Ponziani as White, Hippopotamus Defense as Black) through daily spaced-repetition drilling. App lives at https://athetus.github.io/chess-trainer/

## Done
- Single-file HTML app hosted on GitHub Pages (no build step, no backend)
- 29 Ponziani lines + 18 Hippo lines with tactical audits
- Gamification (XP, levels, streaks), spaced repetition via localStorage
- Error reporting synced to Supabase (project: oomuupminexahfipgktd, ap-southeast-1)
- `move_explanations` table for personalized wrong-move feedback

## In Progress
- Setting up GitHub Actions keep-alive to prevent Supabase free-tier pause

## Next Steps
- Create .github/workflows/supabase-keepalive.yml (cron every 3 days, GET move_explanations)
- Store SUPABASE_ANON_KEY as a GitHub Actions secret
- Resume drilling and add new lines as needed

## Blockers / Decisions
- Supabase free tier pauses after 7 days of inactivity; fix is a GitHub Actions cron job
