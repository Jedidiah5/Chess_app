import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Profile not found</h1>
        <p className="mt-2 text-stone-600">No player with that username exists.</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-stone-700 underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
