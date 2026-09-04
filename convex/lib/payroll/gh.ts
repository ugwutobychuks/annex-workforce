import type { PayslipResult } from "./index";

/**
 * Ghana — 2024 annual PAYE bands (GHS), simplified.
 *
 *   first 5,880    → 0%
 *   next 1,320     → 5%
 *   next 1,560     → 10%
 *   next 38,000    → 17.5%
 *   next 192,000   → 25%
 *   next 366,240   → 30%
 *   above          → 35%
 *
 * SSNIT: 5.5% employee, 13% employer (18.5% total; simplified).
 * No mandatory housing deduction.
 */
export type GhOptions = { grossMonthly: number };

const ANNUAL_BANDS: Array<{ width: number | null; rate: number }> = [
  { width: 5_880, rate: 0 },
  { width: 1_320, rate: 0.05 },
  { width: 1_560, rate: 0.10 },
  { width: 38_000, rate: 0.175 },
  { width: 192_000, rate: 0.25 },
  { width: 366_240, rate: 0.30 },
  { width: null, rate: 0.35 },
];
function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeGH(opts: GhOptions): PayslipResult {
  const gross = opts.grossMonthly;
  const annual = gross * 12;
  let remaining = annual;
  let paye = 0;
  const bands = [];
  let cursor = 0;
  for (const b of ANNUAL_BANDS) {
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
  const ssnitEmployee = round2(gross * 0.055);
  const ssnitEmployer = round2(gross * 0.13);
  const net = round2(gross - payeMo - ssnitEmployee);

  return {
    country: "GH",
    currency: "GHS",
    gross,
    paye: payeMo,
    pension: ssnitEmployee,
    nhf: 0,
    otherDeductions: [],
    net,
    employerPension: ssnitEmployer,
    employerExtras: [],
    craMonthly: 0,
    taxableMonthly: gross,
    bands,
  };
}
