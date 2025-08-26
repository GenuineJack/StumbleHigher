import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';

export default function HomePage() {
  return (
    <div className="bg-zinc-900 text-white flex flex-col justify-center items-center min-h-screen text-center relative">
      {/* About trigger */}
      <button className="absolute top-5 right-5 text-2xl">❓</button>

      {/* Auth button */}
      <div className="absolute top-5 left-5">
        <AuthButton />
      </div>

      {/* Hero */}
      <h1 className="text-5xl md:text-6xl font-extrabold">
        Stumble <span style={{ color: 'var(--brand)' }}>Higher</span>
      </h1>
      <p className="max-w-xl mx-auto mt-6 text-lg md:text-2xl opacity-80">
        A one-click portal to curated articles, books, and tools that push your thinking higher.
      </p>
      <Link href="/stumble" className="btn-brand mt-16">
        Start Stumbling →
      </Link>

      {/* Footer */}
      <footer className="mt-24 text-sm opacity-70">
        A{' '}
        <a href="https://highermarket.xyz/" className="underline hover:text-orange-300">
          HIGHER MARKET
        </a>{' '}
        PROJECT
      </footer>

      {/* About modal */}
      <div id="aboutModal" className="fixed inset-0 bg-black/70 hidden flex items-center justify-center">
        <div className="bg-zinc-800 p-6 rounded-2xl text-center max-w-md">
          <h2 className="text-xl font-bold mb-3">About Stumble Higher</h2>
          <p className="text-sm leading-relaxed mb-4">
            Tap <strong>Start Stumbling</strong> to load a random hand-picked site,<br />
            then hit <em>STUMBLE HIGHER</em> anytime for something new.
          </p>
          <button className="btn-brand px-8 py-2 text-base">Got it</button>
        </div>
      </div>
    </div>
  );
}
