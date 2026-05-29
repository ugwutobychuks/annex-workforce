import Link from 'next/link';
import { ShieldCheck, Users, Briefcase } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left side — form */}
      <div className="flex flex-col px-6 sm:px-10 lg:px-16 py-10">
        <Link href="/" className="flex items-center gap-2.5 mb-12 w-fit">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-display font-bold text-sm">
            A
          </div>
          <span className="font-display text-lg font-bold">Annex Workforce</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {children}
        </div>
        <p className="mt-12 text-xs text-slate-500">
          © {new Date().getFullYear()} Annex Workforce Ltd. · Built in Lagos.
        </p>
      </div>

      {/* Right side — blue gradient panel */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-16 flex-col justify-between overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-400/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-brand-200 mb-3 font-medium">
            Annex Workforce
          </div>
          <div className="font-mono text-xs text-brand-200/80">
            {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}
          </div>
        </div>

        <blockquote className="relative max-w-md">
          <p className="font-display text-3xl leading-tight tracking-tight">
            "We replaced four vendors with one. The first month, payroll ran itself for the first time in three years."
          </p>
          <footer className="mt-8 flex items-center gap-3 text-sm">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-brand-100 font-semibold">
              AE
            </div>
            <div>
              <div className="text-white font-medium">Amaka Eze</div>
              <div className="text-brand-200 text-xs">Head of People · TechStartup Inc.</div>
            </div>
          </footer>
        </blockquote>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: Users, k: '12,000+', l: 'Verified candidates' },
            { icon: Briefcase, k: '500+', l: 'Active employers' },
            { icon: ShieldCheck, k: '94%', l: 'Placement rate' },
          ].map((s) => (
            <div key={s.k} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4 border border-white/10">
              <s.icon className="w-4 h-4 text-brand-200 mb-2" />
              <div className="font-display text-xl font-bold">{s.k}</div>
              <div className="text-[11px] text-brand-200 mt-0.5 leading-tight">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
