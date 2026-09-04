import type { PayslipResult } from "./index";

/**
 * South Africa — 2024/25 SARS annual tax tables (simplified, natural persons
 * under 65). Primary rebate 17,235 applied against annual tax.
 *
 *   up to 237,100     → 18%
 *   237,101–370,500   → 42,678 + 26% above 237,100
 *   370,501–512,800   → 77,362 + 31% above 370,500
 *   512,801–673,000   → 121,475 + 36% above 512,800
 *   673,001–857,900   → 179,147 + 39% above 673,000
 *   857,901–1,817,000 → 251,258 + 41% above 857,900
 *   above             → 644,489 + 45%
 *
 * UIF: 1% employee, 1% employer, capped at gross of ZAR 17,712/mo
 * (contribution cap 177.12 each).
 * No mandatory pension/provident fund on the statutory side.
 */
export type ZaOptions = { grossMonthly: number };

type Band = { upto: number | null; base: number; rate: number; over: number };
const BANDS: Band[] = [
  { upto: 237_100,   base: 0,       rate: 0.18, over: 0 },
  { upto: 370_500,   base: 42_678,  rate: 0.26, over: 237_100 },
  { upto: 512_800,   base: 77_362,  rate: 0.31, over: 370_500 },
  { upto: 673_000,   base: 121_475, rate: 0.36, over: 512_800 },
  { upto: 857_900,   base: 179_147, rate: 0.39, over: 673_000 },
  { upto: 1_817_000, base: 251_258, rate: 0.41, over: 857_900 },
  { upto: null,      base: 644_489, rate: 0.45, over: 1_817_000 },
];
const PRIMARY_REBATE = 17_235;
const UIF_CAP_MONTHLY_CONTRIB = 177.12;
function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeZA(opts: ZaOptions): PayslipResult {
  const gross = opts.grossMonthly;
  const annual = gross * 12;
  let annualTax = 0;
  let matched: Band = BANDS[BANDS.length - 1];
  for (const b of BANDS) {
    if (b.upto == null || annual <= b.upto) { matched = b; break; }
  }
  annualTax = matched.base + (annual - matched.over) * matched.rate;
  annualTax = Math.max(0, annualTax - PRIMARY_REBATE);

  const payeMo = round2(annualTax / 12);
  const uifEmployee = Math.min(round2(gross * 0.01), UIF_CAP_MONTHLY_CONTRIB);
  const uifEmployer = uifEmployee;
  const net = round2(gross - payeMo - uifEmployee);

  return {
    country: "ZA",
    currency: "ZAR",
    gross,
    paye: payeMo,
    pension: 0,
    nhf: 0,
    otherDeductions: [{ name: "UIF", amount: uifEmployee }],
    net,
    employerPension: 0,
    employerExtras: [{ name: "UIF (employer)", amount: uifEmployer }],
    craMonthly: round2(PRIMARY_REBATE / 12),
    taxableMonthly: gross,
    bands: BANDS.map((b, i) => ({
      from: b.over,
      to: b.upto,
      rate: b.rate,
      taxed: 0, // per-band `taxed` isn't meaningful in a table-lookup system
      tax: i === BANDS.indexOf(matched) ? annualTax : 0,
    })),
  };
}
