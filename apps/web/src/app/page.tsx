import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Briefcase, Globe2, FileSpreadsheet } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <header className="border-b border-stone-200/80 backdrop-blur-sm sticky top-0 z-40 bg-[var(--bg)]/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-sm bg-forest-900 flex items-center justify-center text-white font-display font-bold text-sm">
              A
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Annex</span>
            <span className="text-xs uppercase tracking-[0.18em] text-stone-500 -ml-1 hidden sm:inline">Workforce</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <Link href="/jobs" className="hover:text-forest-700 transition-colors">Find work</Link>
            <Link href="#hire" className="hover:text-forest-700 transition-colors">Hire talent</Link>
            <Link href="#eor" className="hover:text-forest-700 transition-colors">EOR &amp; payroll</Link>
            <Link href="#about" className="hover:text-forest-700 transition-colors">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/register" className="btn-primary">
              Get started <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-24 lg:pt-24 lg:pb-32 relative">
        {/* Editorial issue marker */}
        <div className="flex items-center gap-3 mb-10 text-xs uppercase tracking-[0.22em] text-stone-500">
          <span>Vol. 01</span>
          <span className="w-8 h-px bg-stone-400"></span>
          <span>Lagos · Nairobi · Accra</span>
          <span className="w-8 h-px bg-stone-400"></span>
          <span>{new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-8">
            <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-7xl leading-[0.96] tracking-tight">
              Hire, manage, and pay <em className="italic text-forest-800">African talent</em>—
              <span className="text-stone-500"> without setting up locally.</span>
            </h1>
            <p className="mt-8 text-lg lg:text-xl text-stone-700 max-w-2xl leading-relaxed">
              Annex Workforce is the trusted talent infrastructure for Africa. A verified marketplace,
              employer-of-record, and HR system in one platform—built for compliance the rest of the world doesn't understand.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register?role=EMPLOYER" className="btn-primary text-base px-7 py-3">
                Hire on Annex <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/register?role=CANDIDATE" className="btn-secondary text-base px-7 py-3">
                Join as talent
              </Link>
            </div>
          </div>

          {/* Side card — sample verified candidate */}
          <aside className="lg:col-span-4 bg-white border border-stone-200 rounded-md p-6 shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_48px_-12px_rgba(10,77,60,0.12)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-forest-700 via-sand-400 to-ember-500" />
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-4">A verified profile</div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center font-display text-forest-900 font-semibold">
                CO
              </div>
              <div className="flex-1">
                <div className="font-medium">Chinedu Okafor</div>
                <div className="text-sm text-stone-600">Senior Backend Engineer · Lagos, NG</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chip">TypeScript</span>
              <span className="chip">NestJS</span>
              <span className="chip">PostgreSQL</span>
              <span className="chip">+8</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-stone-500">Expected</dt>
                <dd className="font-medium">₦1.2M / mo</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Available</dt>
                <dd className="font-medium">2 weeks</dd>
              </div>
            </dl>
            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="verified-badge">
                <ShieldCheck className="w-3 h-3" /> Identity verified
              </span>
              <span className="text-xs text-stone-500">7 yrs exp.</span>
            </div>
          </aside>
        </div>

        {/* Trust strip */}
        <div className="mt-20 pt-10 border-t border-stone-200">
          <div className="text-xs uppercase tracking-[0.22em] text-stone-500 mb-6">Why teams hire Africa through Annex</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
            {[
              { k: '6→2', v: 'Weeks. Average time-to-hire, vs. industry.' },
              { k: '100%', v: 'Of placed candidates pass identity & credential checks.' },
              { k: '54', v: 'Statutory deductions automatically computed monthly.' },
              { k: '1', v: 'Platform replaces marketplace + EOR + HRMS stack.' },
            ].map((s) => (
              <div key={s.k}>
                <div className="font-display text-3xl text-forest-900">{s.k}</div>
                <div className="text-sm text-stone-600 mt-1.5 leading-snug">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Three pillars ───────────────────────────────── */}
      <section id="hire" className="bg-forest-950 text-stone-100 py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] bg-grain pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 relative">
          <div className="text-xs uppercase tracking-[0.22em] text-sand-300 mb-4">The three pillars</div>
          <h2 className="font-display text-4xl lg:text-5xl max-w-3xl leading-[1.05]">
            One product replaces three. <span className="text-stone-400 italic">Trust, compliance, and operations</span>—on a single backbone.
          </h2>

          <div className="mt-16 grid md:grid-cols-3 gap-px bg-forest-800">
            {[
              {
                n: '01',
                icon: ShieldCheck,
                title: 'Verified marketplace',
                body:
                  'Every candidate passes identity (NIN), credential, and employment-history checks. Search by skill, salary band, availability—every result is real and reachable.',
              },
              {
                n: '02',
                icon: Briefcase,
                title: 'Employer of record',
                body:
                  'We become the legal employer locally. Contracts, monthly payroll, PAYE/Pension/NHF remittance, and compliance reports—handled. You manage the work.',
              },
              {
                n: '03',
                icon: FileSpreadsheet,
                title: 'Integrated HR system',
                body:
                  'Once hired, leave, performance, documents, and onboarding live in the same platform. No five-tool stack. No reconciliations.',
              },
            ].map((p) => (
              <div key={p.n} className="bg-forest-950 p-8 lg:p-10">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-mono text-xs text-sand-300">{p.n}</span>
                  <p.icon className="w-5 h-5 text-sand-400" />
                </div>
                <h3 className="font-display text-2xl mb-3">{p.title}</h3>
                <p className="text-stone-300 leading-relaxed text-[15px]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EOR strip ───────────────────────────────────── */}
      <section id="eor" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-stone-500 mb-4">Employer of record</div>
            <h2 className="font-display text-4xl lg:text-5xl leading-[1.05]">
              Compliance is <em className="italic">our problem.</em>
            </h2>
            <p className="mt-6 text-lg text-stone-700 leading-relaxed">
              We hold the local entity. We file the taxes. We disburse the salary. We keep
              the receipts. You get a single monthly invoice and a workforce that's fully on the books.
            </p>
            <ul className="mt-8 space-y-3 text-stone-700">
              {[
                'Onboarding in 5–10 business days',
                'Local-currency payroll (NGN, KES, GHS, ZAR)',
                'PAYE, Pension, NHF—automatic remittance',
                'Compliance reports per pay cycle',
              ].map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-ember-500"></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            {/* Sample payslip */}
            <div className="bg-white border border-stone-200 rounded-md p-8 shadow-sm relative">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-4 mb-5">
                <div className="font-display text-lg">Payslip · May 2025</div>
                <div className="text-xs text-stone-500 font-mono">PSL-2025-05-1042</div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-2 text-stone-600">Gross salary</td><td className="text-right font-mono">₦1,200,000.00</td></tr>
                  <tr className="text-stone-500"><td className="py-1.5 text-xs">— PAYE</td><td className="text-right text-xs font-mono">−₦122,800</td></tr>
                  <tr className="text-stone-500"><td className="py-1.5 text-xs">— Pension (8%)</td><td className="text-right text-xs font-mono">−₦48,000</td></tr>
                  <tr className="text-stone-500 border-b border-stone-100"><td className="py-1.5 text-xs">— NHF (2.5%)</td><td className="text-right text-xs font-mono">−₦15,000</td></tr>
                  <tr className="font-medium"><td className="pt-3">Net pay</td><td className="text-right pt-3 font-mono text-forest-900 text-base">₦1,014,200.00</td></tr>
                </tbody>
              </table>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
                <Globe2 className="w-3 h-3" />
                Filed with FIRS · PenCom · Federal Mortgage Bank
              </div>
            </div>
            <div className="absolute -z-10 inset-0 translate-x-3 translate-y-3 bg-sand-100 rounded-md"></div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <h2 className="font-display text-4xl lg:text-5xl leading-[1.05]">
            Stop rebuilding the same payroll<br />for every new market.
          </h2>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/register?role=EMPLOYER" className="btn-primary text-base px-7 py-3">
              Start hiring <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-7 py-3">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-sm bg-forest-900 flex items-center justify-center text-white font-display font-bold text-xs">A</div>
              <span className="font-display font-semibold">Annex Workforce</span>
            </div>
            <p className="text-stone-600 leading-relaxed text-[13px]">
              Trusted talent infrastructure for Africa. Built in Lagos.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">Product</div>
            <ul className="space-y-2 text-stone-700">
              <li><Link href="/jobs" className="hover:text-forest-700">Find work</Link></li>
              <li><Link href="/register?role=EMPLOYER" className="hover:text-forest-700">Hire talent</Link></li>
              <li><Link href="#eor" className="hover:text-forest-700">EOR &amp; payroll</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">Company</div>
            <ul className="space-y-2 text-stone-700">
              <li><Link href="#" className="hover:text-forest-700">About</Link></li>
              <li><Link href="#" className="hover:text-forest-700">Careers</Link></li>
              <li><Link href="#" className="hover:text-forest-700">Press</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">Legal</div>
            <ul className="space-y-2 text-stone-700">
              <li><Link href="#" className="hover:text-forest-700">Privacy</Link></li>
              <li><Link href="#" className="hover:text-forest-700">Terms</Link></li>
              <li><Link href="#" className="hover:text-forest-700">Compliance</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-wrap items-center justify-between text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Annex Workforce Ltd.</span>
            <span className="font-mono">v0.1 · MVP</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
