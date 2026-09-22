export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased">
      <div
        className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
