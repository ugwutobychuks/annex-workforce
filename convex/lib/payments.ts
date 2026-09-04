/**
 * Pluggable payment adapters.
 *
 * Adapters are pure functions that describe what to do — the caller
 * (a Convex action) is responsible for the actual HTTP or DB effects.
 * This keeps the whole file testable and swappable.
 *
 * The active provider is chosen by the `PAYMENT_PROVIDER` Convex env var:
 * `stub` (default, no network), `paystack`, or `flutterwave`. Real providers
 * additionally need `PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY`.
 */

export type ProviderName = "stub" | "paystack" | "flutterwave";

export type CheckoutInput = {
  reference: string;
  amountMinorUnits: number; // e.g. kobo for NGN
  currency: string; // e.g. "NGN"
  email: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string; // where the provider should redirect after
};

export type CheckoutResult =
  | { ok: true; checkoutUrl: string; providerRef: string; autoSucceeded?: boolean }
  | { ok: false; error: string };

export type VerifyResult =
  | { ok: true; status: "succeeded" | "failed"; providerRef: string; amountMinorUnits: number; currency: string }
  | { ok: false; error: string };

export function pickProvider(): ProviderName {
  const p = (process.env.PAYMENT_PROVIDER || "stub").toLowerCase();
  if (p === "paystack" || p === "flutterwave") return p;
  return "stub";
}

// ── Stub adapter (local demo) ────────────────────────────────────────────────

export function stubCheckout(input: CheckoutInput): CheckoutResult {
  // The stub returns a fake checkout URL that immediately loops back to
  // /billing?success=1&reference=<ref> — the client treats it as complete.
  const url = `${input.callbackUrl ?? "/billing"}?success=1&reference=${encodeURIComponent(input.reference)}`;
  return { ok: true, checkoutUrl: url, providerRef: `stub_${input.reference}`, autoSucceeded: true };
}

export function stubVerify(input: { reference: string; amountMinorUnits: number; currency: string }): VerifyResult {
  return {
    ok: true,
    status: "succeeded",
    providerRef: `stub_${input.reference}`,
    amountMinorUnits: input.amountMinorUnits,
    currency: input.currency,
  };
}

// ── Paystack adapter (HTTP) ──────────────────────────────────────────────────

export async function paystackCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return { ok: false, error: "PAYSTACK_SECRET_KEY not configured" };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinorUnits,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  if (!res.ok) return { ok: false, error: `Paystack init failed: ${res.status}` };
  const json = (await res.json()) as { status: boolean; data?: { authorization_url: string; reference: string } };
  if (!json.status || !json.data) return { ok: false, error: "Paystack rejected the initialize call" };
  return { ok: true, checkoutUrl: json.data.authorization_url, providerRef: json.data.reference };
}

export async function paystackVerify(reference: string): Promise<VerifyResult> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return { ok: false, error: "PAYSTACK_SECRET_KEY not configured" };
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return { ok: false, error: `Paystack verify failed: ${res.status}` };
  const json = (await res.json()) as {
    status: boolean;
    data?: { status: string; reference: string; amount: number; currency: string };
  };
  if (!json.status || !json.data) return { ok: false, error: "Paystack verify: bad payload" };
  return {
    ok: true,
    status: json.data.status === "success" ? "succeeded" : "failed",
    providerRef: json.data.reference,
    amountMinorUnits: json.data.amount,
    currency: json.data.currency,
  };
}

// ── Flutterwave adapter (HTTP) ───────────────────────────────────────────────

export async function flutterwaveCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) return { ok: false, error: "FLUTTERWAVE_SECRET_KEY not configured" };
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: input.amountMinorUnits / 100, // FLW uses major units
      currency: input.currency,
      redirect_url: input.callbackUrl,
      customer: { email: input.email },
      meta: input.metadata,
    }),
  });
  if (!res.ok) return { ok: false, error: `Flutterwave init failed: ${res.status}` };
  const json = (await res.json()) as { status: string; data?: { link: string } };
  if (json.status !== "success" || !json.data) return { ok: false, error: "Flutterwave rejected the initialize call" };
  return { ok: true, checkoutUrl: json.data.link, providerRef: input.reference };
}

export async function flutterwaveVerify(reference: string): Promise<VerifyResult> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) return { ok: false, error: "FLUTTERWAVE_SECRET_KEY not configured" };
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return { ok: false, error: `Flutterwave verify failed: ${res.status}` };
  const json = (await res.json()) as {
    status: string;
    data?: { status: string; tx_ref: string; amount: number; currency: string };
  };
  if (json.status !== "success" || !json.data) return { ok: false, error: "Flutterwave verify: bad payload" };
  return {
    ok: true,
    status: json.data.status === "successful" ? "succeeded" : "failed",
    providerRef: json.data.tx_ref,
    amountMinorUnits: Math.round(json.data.amount * 100),
    currency: json.data.currency,
  };
}
