export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#ebe4d6] px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-stone-900">You&apos;re offline</h1>
        <p className="mt-3 text-sm text-stone-600">
          Online play, the leaderboard, and your cloud archive need a connection.
          Pass &amp; play and vs computer still work on this device.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/play/computer"
            className="rounded-md bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
          >
            Play vs computer
          </a>
          <a
            href="/play/local"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Pass &amp; play
          </a>
          <a
            href="/play"
            className="text-sm text-stone-700 underline-offset-2 hover:underline"
          >
            Play menu
          </a>
        </div>
      </div>
    </main>
  );
}
