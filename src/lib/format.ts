const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNgn(amount: number): string {
  if (!Number.isFinite(amount)) return "₦0";
  return NGN.format(Math.round(amount));
}
