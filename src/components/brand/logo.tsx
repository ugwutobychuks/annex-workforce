type LogoProps = {
  className?: string;
};

/** Annex Workforce wordmark: gold monogram block + serif name. */
export default function Logo({ className }: LogoProps) {
  return (
    <span className={className}>
      <span className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-sm bg-accent font-serif text-lg font-bold text-accent-foreground">
          A
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-serif text-base font-bold tracking-tight">
            Annex
          </span>
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] opacity-70">
            Workforce
          </span>
        </span>
      </span>
    </span>
  );
}
