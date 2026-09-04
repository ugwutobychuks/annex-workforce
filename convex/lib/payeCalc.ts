// Kept as a thin re-export so existing imports continue to work; the real
// per-country calculators now live in ./payroll/*.
export { computePayslip, currencyFor, symbolFor, COUNTRIES } from "./payroll";
export type { CountryCode, PayslipResult, ComputeOptions } from "./payroll";
