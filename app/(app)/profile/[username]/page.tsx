import Link from "next/link";
import { notFound } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getProfileByUsername } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  currentStreak,
  fetchHeadToHead,
  fetchPlayerGames,
  winRate,
} from "@/lib/supabase/stats";
import { isOnboarded } from "@/types/profile";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: usernameParam } = await params;
  const supabase = await createClient();

  const profile = await getProfileByUsername(supabase, usernameParam);

  if (!profile || !isOnboarded(profile)) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;
  const rate = winRate(profile);

  const ratedGames = await fetchPlayerGames(supabase, profile.id, {
    includeUnrated: false,
  });
  const streak = currentStreak(ratedGames, profile.id);

  let h2h = null;
  if (user && !isOwnProfile) {
    h2h = await fetchHeadToHead(supabase, user.id, profile.id);
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
              Profile
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-900">
              {profile.username}
            </h1>
          </div>

          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-xl font-semibold text-stone-600"
              aria-hidden="true"
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-md bg-stone-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Rating
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">
              {profile.rating}
            </dd>
          </div>
          <div className="rounded-md bg-stone-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Wins
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">
              {profile.wins}
            </dd>
          </div>
          <div className="rounded-md bg-stone-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Losses
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">
              {profile.losses}
            </dd>
          </div>
          <div className="rounded-md bg-stone-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Draws
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">
              {profile.draws}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-stone-500">
          {profile.games_played} rated games
          {rate !== null ? ` · ${rate}% win rate` : ""}
          {streak.type && streak.count > 0
            ? ` · ${streak.count}${streak.type} streak`
            : ""}
        </p>

        {h2h && h2h.total > 0 && (
          <div className="mt-6 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="font-medium text-stone-800">Head-to-head</p>
            <p className="mt-1 text-stone-600">
              {h2h.wins}W · {h2h.losses}L · {h2h.draws}D ({h2h.total} games)
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {isOwnProfile && (
            <Link
              href="/play"
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Play
            </Link>
          )}
          <Link
            href="/leaderboard"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Leaderboard
          </Link>
          {isOwnProfile && (
            <Link
              href="/games"
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Archive
            </Link>
          )}
          <Link
            href="/play/local"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Pass &amp; play
          </Link>
          {isOwnProfile && <SignOutButton />}
        </div>
      </div>
    </main>
  );
}
