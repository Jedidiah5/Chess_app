import Link from "next/link";

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-md space-y-4">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Play chess</h1>
          <p className="mt-2 text-sm text-stone-600">Choose how you want to play.</p>
        </header>

        <Link
          href="/play/online"
          className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Play online</h2>
          <p className="mt-1 text-sm text-stone-600">
            Create a game and invite a friend with a link.
          </p>
        </Link>

        <Link
          href="/play/local"
          className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Pass &amp; play</h2>
          <p className="mt-1 text-sm text-stone-600">
            Two players on one device. No account needed.
          </p>
        </Link>

        <div className="flex justify-center gap-4 pt-2 text-sm">
          <Link href="/leaderboard" className="text-stone-700 underline-offset-2 hover:underline">
            Leaderboard
          </Link>
          <Link href="/games" className="text-stone-700 underline-offset-2 hover:underline">
            Archive
          </Link>
        </div>
      </div>
    </main>
  );
}
