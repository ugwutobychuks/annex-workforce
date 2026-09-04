/**
 * Multi-country payroll dispatcher.
 *
 * Each `compute<Country>` returns a normalized PayslipResult so the rest
 * of the app doesn't have to know per-country quirks. Nigeria stays
 * bit-identical to the pre-M16 calculator.
 *
 * ⚠ Tax law evolves; the country modules here use publicly documented
 * rules current as of 2024 and MUST be re-verified against the local
 * revenue authority before running production payroll.
 */

import { computeNG, type NgOptions } from "./ng";
import { computeKE, type KeOptions } from "./ke";
import { computeGH, type GhOptions } from "./gh";
import { computeZA, type ZaOptions } from "./za";
import { computeEG, type EgOptions } from "./eg";

export type CountryCode = "NG" | "KE" | "GH" | "ZA" | "EG";

export const COUNTRIES: Array<{ code: CountryCode; label: string; currency: string; symbol: string }> = [
  { code: "NG", label: "Nigeria", currency: "NGN", symbol: "₦" },
  { code: "KE", label: "Kenya", currency: "KES", symbol: "KSh" },
  { code: "GH", label: "Ghana", currency: "GHS", symbol: "GH₵" },
  { code: "ZA", label: "South Africa", currency: "ZAR", symbol: "R" },
  { code: "EG", label: "Egypt", currency: "EGP", symbol: "E£" },
];

export type PayslipResult = {
  country: CountryCode;
  currency: string;
  gross: number;
  paye: number;
  pension: number;
  nhf: number; // NG-only; other countries put their extras in `otherDeductions`
  otherDeductions: Array<{ name: string; amount: number }>;
  net: number;
  employerPension: number;
  employerExtras: Array<{ name: string; amount: number }>;
  craMonthly: number; // NG relief; 0 elsewhere but re-purposed as "personal relief"
  taxableMonthly: number;
  bands: Array<{ from: number; to: number | null; rate: number; taxed: number; tax: number }>;
};

export type ComputeOptions =
  | ({ country: "NG" } & NgOptions)
  | ({ country: "KE" } & KeOptions)
  | ({ country: "GH" } & GhOptions)
  | ({ country: "ZA" } & ZaOptions)
  | ({ country: "EG" } & EgOptions);

export function computePayslip(opts: ComputeOptions): PayslipResult {
  switch (opts.country) {
    case "NG": return computeNG(opts);
    case "KE": return computeKE(opts);
    case "GH": return computeGH(opts);
    case "ZA": return computeZA(opts);
    case "EG": return computeEG(opts);
  }
}

export function currencyFor(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.currency ?? "";
}
export function symbolFor(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.symbol ?? "";
}
