import type { PayslipResult } from "./index";

/**
 * Kenya — 2024 rules (simplified).
 *
 * PAYE (monthly bands, KES):
 *   up to 24,000  → 10%
 *   next 8,333    → 25%    (i.e. up to 32,333)
 *   next 467,667  → 30%    (up to 500,000)
 *   next 300,000  → 32.5%  (up to 800,000)
 *   above         → 35%
 *
 * Personal relief: 2,400 KES/month (applied after PAYE, non-refundable).
 * NSSF Tier I + II (2024): 6% up to 36,000 = 2,160 max, matched by employer.
 * SHIF (replaces NHIF from 2024): 2.75% of gross.
 * Housing Levy: 1.5% employee + 1.5% employer.
 */
export type KeOptions = {
  grossMonthly: number;
};

const MONTHLY_BANDS: Array<{ width: number | null; rate: number }> = [
  { width: 24_000, rate: 0.10 },
  { width: 8_333, rate: 0.25 },
  { width: 467_667, rate: 0.30 },
  { width: 300_000, rate: 0.325 },
  { width: null, rate: 0.35 },
];
const PERSONAL_RELIEF_MO = 2_400;
const NSSF_CAP = 36_000;
const NSSF_RATE = 0.06;

function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeKE(opts: KeOptions): PayslipResult {
  const gross = opts.grossMonthly;

  let remaining = gross;
  let paye = 0;
  const bands = [];
  let cursor = 0;
  for (const b of MONTHLY_BANDS) {
    if (remaining <= 0) break;
    const width = b.width ?? remaining;
    const taxed = Math.min(width, remaining);
    const tax = taxed * b.rate;
    bands.push({ from: cursor, to: b.width == null ? null : cursor + width, rate: b.rate, taxed, tax });
    paye += tax;
    remaining -= taxed;
    cursor += width;
  }
  paye = Math.max(0, paye - PERSONAL_RELIEF_MO);

  const nssf = round2(Math.min(gross, NSSF_CAP) * NSSF_RATE);
  const shif = round2(gross * 0.0275);
  const housingLevyEmployee = round2(gross * 0.015);
  const housingLevyEmployer = round2(gross * 0.015);
  const nssfEmployer = nssf; // matched

  paye = round2(paye);
  const otherDeductions = [
    { name: "NSSF", amount: nssf },
    { name: "SHIF", amount: shif },
    { name: "Housing Levy", amount: housingLevyEmployee },
  ];
  const employerExtras = [
    { name: "NSSF (employer)", amount: nssfEmployer },
    { name: "Housing Levy (employer)", amount: housingLevyEmployer },
  ];
  const net = round2(gross - paye - otherDeductions.reduce((s, d) => s + d.amount, 0));

  return {
    country: "KE",
    currency: "KES",
    gross,
    paye,
    pension: nssf, // treat NSSF as pension-equivalent line for reporting compatibility
    nhf: 0,
    otherDeductions: otherDeductions.filter((d) => d.name !== "NSSF"), // NSSF surfaced as `pension` above
    net,
    employerPension: nssfEmployer,
    employerExtras: employerExtras.filter((d) => d.name !== "NSSF (employer)"),
    craMonthly: PERSONAL_RELIEF_MO,
    taxableMonthly: gross,
    bands,
  };
}
