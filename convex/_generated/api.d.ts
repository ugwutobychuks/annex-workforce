/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as applications from "../applications.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as candidates from "../candidates.js";
import type * as employer from "../employer.js";
import type * as hrms from "../hrms.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as jobs from "../jobs.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_payeCalc from "../lib/payeCalc.js";
import type * as lib_payments from "../lib/payments.js";
import type * as lib_payroll_eg from "../lib/payroll/eg.js";
import type * as lib_payroll_gh from "../lib/payroll/gh.js";
import type * as lib_payroll_index from "../lib/payroll/index.js";
import type * as lib_payroll_ke from "../lib/payroll/ke.js";
import type * as lib_payroll_ng from "../lib/payroll/ng.js";
import type * as lib_payroll_za from "../lib/payroll/za.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as payroll from "../payroll.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as signatures from "../signatures.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  applications: typeof applications;
  assessments: typeof assessments;
  auth: typeof auth;
  candidates: typeof candidates;
  employer: typeof employer;
  hrms: typeof hrms;
  http: typeof http;
  interviews: typeof interviews;
  jobs: typeof jobs;
  "lib/ai": typeof lib_ai;
  "lib/hash": typeof lib_hash;
  "lib/payeCalc": typeof lib_payeCalc;
  "lib/payments": typeof lib_payments;
  "lib/payroll/eg": typeof lib_payroll_eg;
  "lib/payroll/gh": typeof lib_payroll_gh;
  "lib/payroll/index": typeof lib_payroll_index;
  "lib/payroll/ke": typeof lib_payroll_ke;
  "lib/payroll/ng": typeof lib_payroll_ng;
  "lib/payroll/za": typeof lib_payroll_za;
  messages: typeof messages;
  notifications: typeof notifications;
  payments: typeof payments;
  payroll: typeof payroll;
  reviews: typeof reviews;
  seed: typeof seed;
  signatures: typeof signatures;
  users: typeof users;
  verification: typeof verification;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
