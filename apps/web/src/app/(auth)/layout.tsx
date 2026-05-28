import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side — form */}
      <div className="flex flex-col px-6 sm:px-10 lg:px-16 py-10">
        <Link href="/" className="flex items-center gap-2.5 mb-12 w-fit">
          <div className="w-7 h-7 rounded-sm bg-forest-900 flex items-center justify-center text-white font-display font-bold text-sm">
            A
          </div>
          <span className="font-display text-lg font-semibold">Annex Workforce</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {children}
        </div>
        <p className="mt-12 text-xs text-stone-500">
          © {new Date().getFullYear()} Annex Workforce Ltd. · Built in Lagos.
        </p>
      </div>

      {/* Right side — editorial visual */}
      <div className="hidden lg:flex relative bg-forest-950 text-stone-100 p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-[0.06] pointer-events-none"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-forest-700/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative">
          <div className="text-xs uppercase tracking-[0.22em] text-sand-300 mb-3">Vol. 01 · Issue 04</div>
          <div className="font-mono text-xs text-stone-400">{new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</div>
        </div>

        <blockquote className="relative max-w-md font-display">
          <p className="text-3xl leading-[1.15] tracking-tight">
            "We replaced four vendors with one. The first month, payroll
            ran itself for the first time in <em>three years.</em>"
          </p>
          <footer className="mt-8 flex items-center gap-3 text-sm">
            <div className="w-10 h-10 rounded-full bg-forest-800 border border-forest-700 flex items-center justify-center text-sand-300 font-semibold">
              AE
            </div>
            <div>
              <div className="text-stone-100 font-sans">Amaka Eze</div>
              <div className="text-stone-400 text-xs font-sans">Head of People · TechStartup Inc.</div>
            </div>
          </footer>
        </blockquote>

        <div className="relative grid grid-cols-3 gap-px bg-forest-800">
          {[
            { k: '1,200+', l: 'verified candidates' },
            { k: '47', l: 'active employers' },
            { k: '94%', l: 'placement rate' },
          ].map((s) => (
            <div key={s.k} className="bg-forest-950 px-4 py-5">
              <div className="font-display text-2xl">{s.k}</div>
              <div className="text-xs uppercase tracking-wider text-stone-400 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
