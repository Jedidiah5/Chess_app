-- Live ladder: stream rating / games_played changes to the leaderboard page.
-- profiles is already world-readable (profiles_read), so no RLS change is needed.

alter publication supabase_realtime add table public.profiles;
