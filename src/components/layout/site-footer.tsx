import Logo from "@/components/brand/logo.tsx";

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    items: ["Talent marketplace", "Managed hiring (EOR)", "HR management", "Verification"],
  },
  {
    title: "Markets",
    items: ["Nigeria", "Ghana (soon)", "Kenya (soon)", "South Africa (soon)"],
  },
  {
    title: "Company",
    items: ["About", "Careers", "Compliance", "Contact"],
  },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="max-w-xs pt-4 text-sm leading-relaxed text-sidebar-foreground/70">
              A trusted talent infrastructure platform for hiring, managing, and
              paying African talent globally.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2.5 pt-4">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-sidebar-foreground/70"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Annex Workforce. All rights reserved.</p>
          <p>Registered employer of record, Lagos, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
