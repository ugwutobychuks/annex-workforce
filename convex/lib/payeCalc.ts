// Nigerian PAYE calculator — Finance Act 2020/2024 bands.
//
// NOTE: Tax rules evolve; production use MUST verify against current FIRS
// guidance and the specific state IRS (e.g., LIRS for Lagos). This module
// intentionally uses a simplified basis (gross monthly) rather than a full
// basic/housing/transport breakdown so it stays interpretable and reviewable.

export type PayeBand = { from: number; to: number | null; rate: number; taxed: number; tax: number };

export type PayeResult = {
  grossMonthly: number;
  grossAnnual: number;
  craAnnual: number;
  craMonthly: number;
  taxableAnnual: number;
  taxableMonthly: number;
  annualPaye: number;
  monthlyPaye: number;
  bands: PayeBand[];
};

// Annual PAYE bands (₦), Finance Act 2020 (still in force under Finance Act 2024).
const BANDS: Array<{ width: number | null; rate: number }> = [
  { width: 300_000, rate: 0.07 },
  { width: 300_000, rate: 0.11 },
  { width: 500_000, rate: 0.15 },
  { width: 500_000, rate: 0.19 },
  { width: 1_600_000, rate: 0.21 },
  { width: null, rate: 0.24 }, // remainder
];

/**
 * Consolidated Relief Allowance = greater of ₦200,000 or 1% of gross annual, plus 20% of gross annual.
 * (Statutory pension/NHF are separately deductible from gross before applying CRA in a fully
 * accurate model; the simplified model here treats them as separate line-items on the payslip
 * and applies CRA on gross — a minor over-taxation relative to strict FIRS guidance.)
 */
export function computeCra(grossAnnual: number): number {
  return Math.max(200_000, grossAnnual * 0.01) + grossAnnual * 0.2;
}

export function computePaye(grossMonthly: number): PayeResult {
  const grossAnnual = grossMonthly * 12;
  const craAnnual = computeCra(grossAnnual);
  const taxableAnnual = Math.max(0, grossAnnual - craAnnual);

  let remaining = taxableAnnual;
  let annualPaye = 0;
  const bandBreakdown: PayeBand[] = [];
  let cursor = 0;

  for (const band of BANDS) {
    if (remaining <= 0) break;
    const width = band.width ?? remaining;
    const taxed = Math.min(width, remaining);
    const tax = taxed * band.rate;
    bandBreakdown.push({
      from: cursor,
      to: band.width == null ? null : cursor + width,
      rate: band.rate,
      taxed,
      tax,
    });
    annualPaye += tax;
    remaining -= taxed;
    cursor += width;
  }

  return {
    grossMonthly,
    grossAnnual,
    craAnnual,
    craMonthly: craAnnual / 12,
    taxableAnnual,
    taxableMonthly: taxableAnnual / 12,
    annualPaye,
    monthlyPaye: annualPaye / 12,
    bands: bandBreakdown,
  };
}

export type PayslipCalc = {
  gross: number;
  paye: number;
  pension: number;
  nhf: number;
  net: number;
  employerPension: number;
  craMonthly: number;
  taxableMonthly: number;
  bands: PayeBand[];
};

/**
 * Full payslip line-items for one month.
 * - pensionRatePct: employee contribution, typically 8% under the Pension Reform Act.
 * - employerPensionRatePct: employer contribution, typically 10%.
 * - nhfEligible: 2.5% NHF applies (Nigerian employees earning ≥₦3,000/mo who elect in).
 */
export function computePayslip(opts: {
  grossMonthly: number;
  pensionRatePct: number;
  employerPensionRatePct: number;
  nhfEligible: boolean;
}): PayslipCalc {
  const gross = opts.grossMonthly;
  const paye = computePaye(gross);
  const pension = round2(gross * (opts.pensionRatePct / 100));
  const nhf = opts.nhfEligible ? round2(gross * 0.025) : 0;
  const employerPension = round2(gross * (opts.employerPensionRatePct / 100));
  const monthlyPaye = round2(paye.monthlyPaye);
  const net = round2(gross - monthlyPaye - pension - nhf);
  return {
    gross,
    paye: monthlyPaye,
    pension,
    nhf,
    net,
    employerPension,
    craMonthly: round2(paye.craMonthly),
    taxableMonthly: round2(paye.taxableMonthly),
    bands: paye.bands,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
