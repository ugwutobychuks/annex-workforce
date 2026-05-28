import { Injectable } from '@nestjs/common';

/**
 * Nigerian Tax Engine (Finance Act 2020)
 *
 * Calculates monthly statutory deductions:
 *  - Pension contribution: 8% employee / 10% employer (Pension Reform Act 2014)
 *  - National Housing Fund (NHF): 2.5% of basic salary
 *  - PAYE income tax: graduated bands on Consolidated Relief Allowance (CRA)
 *
 * Designed for clarity over micro-optimization. All inputs/outputs in
 * Nigerian Naira (₦), monthly figures.
 *
 * NOTE: Tax law evolves. Verify against current FIRS guidelines before
 * production payroll runs. This is a starting point that gets the math
 * structurally right, not a substitute for tax counsel.
 */

export interface PayrollComputation {
  grossSalary: number;
  basicSalary: number;
  pensionEmployee: number;
  nhf: number;
  payeTax: number;
  otherDeductions: number;
  netSalary: number;
  // Employer-side (for reporting / cost calculation)
  pensionEmployer: number;
  totalEmployerCost: number;
}

export interface PayrollInput {
  grossSalary: number;
  basicSalaryRatio?: number;     // default 50% — common Nigerian practice
  pensionEnrolled?: boolean;      // default true
  nhfEnrolled?: boolean;          // default true if salary >= NHF threshold
  otherDeductions?: number;       // loans, advances, etc.
}

@Injectable()
export class TaxEngineService {
  /** PAYE annual graduated bands (Personal Income Tax Act, as amended) */
  private readonly PAYE_BANDS = [
    { upTo: 300_000, rate: 0.07 },
    { upTo: 600_000, rate: 0.11 },
    { upTo: 1_100_000, rate: 0.15 },
    { upTo: 1_600_000, rate: 0.19 },
    { upTo: 3_200_000, rate: 0.21 },
    { upTo: Infinity, rate: 0.24 },
  ];

  /** Consolidated Relief Allowance: ₦200,000/yr + 20% of gross income */
  private readonly CRA_FIXED_ANNUAL = 200_000;
  private readonly CRA_PERCENT = 0.20;

  /** Statutory rates */
  private readonly PENSION_EMPLOYEE_RATE = 0.08;
  private readonly PENSION_EMPLOYER_RATE = 0.10;
  private readonly NHF_RATE = 0.025;
  private readonly NHF_MIN_MONTHLY = 30_000;

  compute(input: PayrollInput): PayrollComputation {
    const grossMonthly = input.grossSalary;
    const grossAnnual = grossMonthly * 12;
    const basicMonthly = grossMonthly * (input.basicSalaryRatio ?? 0.5);

    // ── Pension ───────────────────────────────────────────────
    const pensionEmployee = (input.pensionEnrolled ?? true)
      ? this.round(basicMonthly * this.PENSION_EMPLOYEE_RATE)
      : 0;
    const pensionEmployer = (input.pensionEnrolled ?? true)
      ? this.round(basicMonthly * this.PENSION_EMPLOYER_RATE)
      : 0;

    // ── NHF ───────────────────────────────────────────────────
    const nhfEnrolled = input.nhfEnrolled ?? grossMonthly >= this.NHF_MIN_MONTHLY;
    const nhf = nhfEnrolled ? this.round(basicMonthly * this.NHF_RATE) : 0;

    // ── PAYE ──────────────────────────────────────────────────
    // Step 1: Annual statutory deductions
    const annualPension = pensionEmployee * 12;
    const annualNhf = nhf * 12;

    // Step 2: Gross Income After Statutory Deductions
    const annualGrossAfterStat = grossAnnual - annualPension - annualNhf;

    // Step 3: CRA = max(₦200k, 1% of gross) + 20% of gross-after-stat
    const craAnnual =
      Math.max(this.CRA_FIXED_ANNUAL, grossAnnual * 0.01) +
      annualGrossAfterStat * this.CRA_PERCENT;

    // Step 4: Taxable income
    const taxableAnnual = Math.max(0, annualGrossAfterStat - craAnnual);

    // Step 5: Apply graduated bands
    const annualPaye = this.applyBands(taxableAnnual);
    const monthlyPaye = this.round(annualPaye / 12);

    // ── Net ───────────────────────────────────────────────────
    const otherDeductions = input.otherDeductions ?? 0;
    const netSalary = this.round(
      grossMonthly - pensionEmployee - nhf - monthlyPaye - otherDeductions,
    );

    return {
      grossSalary: grossMonthly,
      basicSalary: this.round(basicMonthly),
      pensionEmployee,
      nhf,
      payeTax: monthlyPaye,
      otherDeductions,
      netSalary,
      pensionEmployer,
      totalEmployerCost: this.round(grossMonthly + pensionEmployer),
    };
  }

  private applyBands(taxableAnnual: number): number {
    let remaining = taxableAnnual;
    let tax = 0;
    let lastCap = 0;

    for (const band of this.PAYE_BANDS) {
      if (remaining <= 0) break;
      const slice = Math.min(remaining, band.upTo - lastCap);
      tax += slice * band.rate;
      remaining -= slice;
      lastCap = band.upTo;
    }
    return tax;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
