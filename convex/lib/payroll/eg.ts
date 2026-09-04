import type { PayslipResult } from "./index";

/**
 * Egypt — 2024 personal income tax (simplified).
 *
 * Annual bands (EGP) — after personal relief of 20,000:
 *   0–30,000       → 0%
 *   30,001–45,000  → 10%
 *   45,001–60,000  → 15%
 *   60,001–200,000 → 20%
 *   200,001–400,000→ 22.5%
 *   above          → 25%
 *
 * Social insurance: employee 11%, employer 18.75% (up to the maximum
 * insurable wage; simplified — cap ignored here).
 */
export type EgOptions = { grossMonthly: number };

const PERSONAL_RELIEF = 20_000;
const BANDS: Array<{ width: number | null; rate: number }> = [
  { width: 30_000, rate: 0 },
  { width: 15_000, rate: 0.10 },
  { width: 15_000, rate: 0.15 },
  { width: 140_000, rate: 0.20 },
  { width: 200_000, rate: 0.225 },
  { width: null, rate: 0.25 },
];
function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeEG(opts: EgOptions): PayslipResult {
  const gross = opts.grossMonthly;
  const annual = gross * 12;
  const taxable = Math.max(0, annual - PERSONAL_RELIEF);
  let remaining = taxable;
  let paye = 0;
  const bands = [];
  let cursor = 0;
  for (const b of BANDS) {
    if (remaining <= 0) break;
    const width = b.width ?? remaining;
    const taxed = Math.min(width, remaining);
    const tax = taxed * b.rate;
    bands.push({ from: cursor, to: b.width == null ? null : cursor + width, rate: b.rate, taxed, tax });
    paye += tax;
    remaining -= taxed;
    cursor += width;
  }
  const payeMo = round2(paye / 12);
  const siEmployee = round2(gross * 0.11);
  const siEmployer = round2(gross * 0.1875);
  const net = round2(gross - payeMo - siEmployee);

  return {
    country: "EG",
    currency: "EGP",
    gross,
    paye: payeMo,
    pension: siEmployee,
    nhf: 0,
    otherDeductions: [],
    net,
    employerPension: siEmployer,
    employerExtras: [],
    craMonthly: round2(PERSONAL_RELIEF / 12),
    taxableMonthly: round2(taxable / 12),
    bands,
  };
}
