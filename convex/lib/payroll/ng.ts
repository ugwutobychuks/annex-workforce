import type { PayslipResult } from "./index";

/**
 * Nigeria — Finance Act 2020 (still in force under Finance Act 2024).
 * CRA = greater of ₦200,000 or 1% of gross annual, plus 20% of gross annual.
 */
export type NgOptions = {
  grossMonthly: number;
  pensionRatePct: number; // employee, typically 8
  employerPensionRatePct: number; // typically 10
  nhfEligible: boolean;
};

const BANDS: Array<{ width: number | null; rate: number }> = [
  { width: 300_000, rate: 0.07 },
  { width: 300_000, rate: 0.11 },
  { width: 500_000, rate: 0.15 },
  { width: 500_000, rate: 0.19 },
  { width: 1_600_000, rate: 0.21 },
  { width: null, rate: 0.24 },
];

function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeNG(opts: NgOptions): PayslipResult {
  const gross = opts.grossMonthly;
  const grossAnnual = gross * 12;
  const craAnnual = Math.max(200_000, grossAnnual * 0.01) + grossAnnual * 0.2;
  const taxableAnnual = Math.max(0, grossAnnual - craAnnual);

  let remaining = taxableAnnual;
  let annualPaye = 0;
  const bandBreakdown = [];
  let cursor = 0;
  for (const band of BANDS) {
    if (remaining <= 0) break;
    const width = band.width ?? remaining;
    const taxed = Math.min(width, remaining);
    const tax = taxed * band.rate;
    bandBreakdown.push({ from: cursor, to: band.width == null ? null : cursor + width, rate: band.rate, taxed, tax });
    annualPaye += tax;
    remaining -= taxed;
    cursor += width;
  }

  const paye = round2(annualPaye / 12);
  const pension = round2(gross * (opts.pensionRatePct / 100));
  const nhf = opts.nhfEligible ? round2(gross * 0.025) : 0;
  const employerPension = round2(gross * (opts.employerPensionRatePct / 100));
  const net = round2(gross - paye - pension - nhf);

  return {
    country: "NG",
    currency: "NGN",
    gross,
    paye,
    pension,
    nhf,
    otherDeductions: [],
    net,
    employerPension,
    employerExtras: [],
    craMonthly: round2(craAnnual / 12),
    taxableMonthly: round2(taxableAnnual / 12),
    bands: bandBreakdown,
  };
}
