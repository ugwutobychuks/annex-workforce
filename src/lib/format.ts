const CURRENCY_LOCALES: Record<string, string> = {
  NGN: "en-NG",
  KES: "en-KE",
  GHS: "en-GH",
  ZAR: "en-ZA",
  EGP: "en-EG",
};

/**
 * Country-currency aware money formatter. Falls back to NGN when the code
 * is unknown so old payslip rows (pre-M16) still render.
 */
export function formatMoney(amount: number, currency = "NGN"): string {
  if (!Number.isFinite(amount)) return "";
  const locale = CURRENCY_LOCALES[currency] ?? "en-NG";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

// Back-compat: existing call sites use formatNgn(amount) with implicit NGN.
export function formatNgn(amount: number): string {
  return formatMoney(amount, "NGN");
}
