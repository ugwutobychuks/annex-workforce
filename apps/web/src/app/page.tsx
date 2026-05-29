import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Search,
  Briefcase,
  Building2,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  Globe2,
  Users,
  Clock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ─── Top nav ─────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-display font-bold text-sm">
              A
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Annex Workforce</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700">
            <Link href="#features" className="hover:text-brand-700 transition-colors">Features</Link>
            <Link href="/jobs" className="hover:text-brand-700 transition-colors">Find jobs</Link>
            <Link href="#solutions" className="hover:text-brand-700 transition-colors">Solutions</Link>
            <Link href="#pricing" className="hover:text-brand-700 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/register" className="btn-primary">
              Try free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Blue gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-100/40 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero left */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-800 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Now available across Nigeria, Kenya, Ghana &amp; South Africa
              </div>
              <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
                The complete platform to <span className="text-brand-600">hire African talent</span>.
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-600 max-w-2xl leading-relaxed">
                A verified marketplace, Employer-of-Record, and HR system in one platform.
                Hire faster, manage compliance, and pay your team — without setting up locally.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register?role=EMPLOYER" className="btn-primary text-base px-6 py-3">
                  Start hiring <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/register?role=CANDIDATE" className="btn-secondary text-base px-6 py-3">
                  Find a job
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> No setup fee</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free trial</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cancel anytime</span>
              </div>
            </div>

            {/* Hero right — candidate card stack */}
            <div className="lg:col-span-5 relative">
              {/* Main card */}
              <div className="relative bg-white rounded-2xl shadow-soft-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Verified candidate</span>
                  <span className="verified-badge">
                    <ShieldCheck className="w-3 h-3" /> ID verified
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-display font-bold text-lg">
                    CO
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">Chinedu Okafor</div>
                    <div className="text-sm text-slate-600">Senior Backend Engineer</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Globe2 className="w-3 h-3" /> Lagos, NG · Remote
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="chip">TypeScript</span>
                  <span className="chip">NestJS</span>
                  <span className="chip">PostgreSQL</span>
                  <span className="chip">+8 more</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Expected</div>
                    <div className="font-semibold text-slate-900">₦1.2M / mo</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Available</div>
                    <div className="font-semibold text-slate-900">2 weeks</div>
                  </div>
                </div>
                <button className="btn-primary w-full mt-5">
                  View full profile
                </button>
              </div>

              {/* Floating chip — applications today */}
              <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-soft-lg border border-slate-200 p-4 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Applications today</div>
                    <div className="font-semibold text-slate-900 text-lg">+47</div>
                  </div>
                </div>
              </div>

              {/* Floating chip — time-to-hire */}
              <div className="absolute -top-5 -right-5 bg-white rounded-xl shadow-soft-lg border border-slate-200 p-4 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Avg. time to hire</div>
                    <div className="font-semibold text-slate-900 text-lg">2 weeks</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust strip ─────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50/50 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-xs uppercase tracking-wider text-slate-500 text-center mb-8 font-medium">
            Trusted by 500+ teams hiring across Africa
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { k: '500+', v: 'Active employers' },
              { k: '12,000+', v: 'Verified candidates' },
              { k: '94%', v: 'Placement success rate' },
              { k: '2 wks', v: 'Average time-to-hire' },
            ].map((s) => (
              <div key={s.k} className="text-center">
                <div className="font-display text-3xl lg:text-4xl text-brand-700 font-bold">{s.k}</div>
                <div className="text-sm text-slate-600 mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Modules grid ────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold mb-3">
              All-in-one platform
            </div>
            <h2 className="font-display text-4xl lg:text-5xl leading-tight">
              Everything you need to hire and manage talent
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Stop juggling 5 different tools. Annex replaces your marketplace, ATS, EOR provider, and HR system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: 'Talent marketplace',
                body: 'Search 12,000+ verified candidates by skill, location, and availability. Every profile is identity-checked.',
              },
              {
                icon: Briefcase,
                title: 'Applicant tracking',
                body: 'A kanban pipeline that moves applicants from applied to hired. Real-time updates, notes, and team collaboration.',
              },
              {
                icon: Building2,
                title: 'Employer of Record',
                body: 'We become the legal employer locally. Contracts, payroll, and statutory compliance — all handled by us.',
              },
              {
                icon: FileSpreadsheet,
                title: 'Built-in payroll',
                body: 'Nigerian PAYE, Pension, and NHF calculated automatically. One-click monthly run, automatic filings.',
              },
              {
                icon: ShieldCheck,
                title: 'Identity verification',
                body: 'NIN, BVN, and credential checks via Smile Identity & Youverify. 100% of placed candidates verified.',
              },
              {
                icon: Sparkles,
                title: 'Leave & HR management',
                body: 'Approve time off, track balances, manage onboarding. Replaces the spreadsheet your HR team hates.',
              },
            ].map((f) => (
              <div key={f.title} className="card hover:border-brand-300 hover:shadow-soft-lg transition-all group">
                <div className="w-11 h-11 rounded-lg bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EOR section ─────────────────────────────────── */}
      <section id="solutions" className="bg-slate-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold mb-3">
                Employer of Record
              </div>
              <h2 className="font-display text-4xl lg:text-5xl leading-tight">
                Compliance is our problem, not yours.
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                We hold the local entity, file the taxes, and disburse the salary. You get a single monthly invoice
                and a workforce that's fully on the books.
              </p>
              <ul className="mt-8 space-y-3 text-slate-700">
                {[
                  'Onboarding in 5–10 business days',
                  'Local-currency payroll (NGN, KES, GHS, ZAR)',
                  'PAYE, Pension &amp; NHF — automatic remittance',
                  'Monthly compliance reports per pay cycle',
                  'No local entity required',
                ].map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: p }} />
                  </li>
                ))}
              </ul>
              <Link href="/register?role=EMPLOYER" className="btn-primary mt-8">
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Sample payslip card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-soft-lg border border-slate-200 p-8 relative z-10">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-4 mb-5">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Payslip</div>
                    <div className="font-display text-xl font-bold">May 2025</div>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">PSL-2025-05-1042</div>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 text-slate-700">Gross salary</td>
                      <td className="text-right font-mono text-slate-900">₦1,200,000</td>
                    </tr>
                    <tr className="text-slate-500">
                      <td className="py-1.5 text-xs pl-3">— PAYE tax</td>
                      <td className="text-right text-xs font-mono">−₦122,800</td>
                    </tr>
                    <tr className="text-slate-500">
                      <td className="py-1.5 text-xs pl-3">— Pension (8%)</td>
                      <td className="text-right text-xs font-mono">−₦48,000</td>
                    </tr>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <td className="py-1.5 text-xs pl-3 pb-3">— NHF (2.5%)</td>
                      <td className="text-right text-xs font-mono pb-3">−₦15,000</td>
                    </tr>
                    <tr>
                      <td className="pt-3 font-semibold text-slate-900">Net pay</td>
                      <td className="text-right pt-3 font-mono text-brand-700 text-lg font-bold">₦1,014,200</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Filed with FIRS · PenCom · Federal Mortgage Bank
                </div>
              </div>
              {/* Decorative offset card */}
              <div className="absolute inset-0 translate-x-3 translate-y-3 bg-brand-100 rounded-2xl -z-0"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold mb-3">How it works</div>
            <h2 className="font-display text-4xl lg:text-5xl leading-tight">
              From posting to paid in 4 steps
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Post a role', d: 'Create a job posting in minutes. Choose between traditional hiring or EOR-managed.' },
              { n: '02', t: 'Review applicants', d: 'Verified candidates apply. Move them through your custom pipeline.' },
              { n: '03', t: 'Hire on Annex EOR', d: 'We handle the contract, local entity, and onboarding. You meet your new hire.' },
              { n: '04', t: 'Pay monthly', d: 'One invoice. We run payroll, file taxes, and disburse salaries.' },
            ].map((s) => (
              <div key={s.n} className="relative">
                <div className="font-mono text-sm text-brand-600 font-bold mb-3">{s.n}</div>
                <h3 className="font-display text-xl mb-2">{s.t}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Big CTA ─────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-900/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-display text-4xl lg:text-5xl text-white leading-tight">
            Ready to build your African team?
          </h2>
          <p className="mt-5 text-lg text-brand-100 max-w-2xl mx-auto">
            Join 500+ companies hiring smarter. Free trial, no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/register?role=EMPLOYER"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-white text-brand-700 font-semibold hover:bg-brand-50 transition-colors"
            >
              Start hiring <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-display font-bold text-sm">A</div>
                <span className="font-display font-bold text-white">Annex Workforce</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Trusted talent infrastructure for Africa. Hire, manage, and pay your team — without setting up locally.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Product</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/jobs" className="hover:text-white">Find jobs</Link></li>
                <li><Link href="/register?role=EMPLOYER" className="hover:text-white">Hire talent</Link></li>
                <li><Link href="#solutions" className="hover:text-white">EOR &amp; payroll</Link></li>
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Company</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-wrap items-center justify-between text-sm text-slate-500">
            <span>© {new Date().getFullYear()} Annex Workforce Ltd. Built in Lagos.</span>
            <span className="font-mono text-xs">v0.1 · MVP</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
