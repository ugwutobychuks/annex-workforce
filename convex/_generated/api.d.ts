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
import type * as applications from "../applications.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as candidates from "../candidates.js";
import type * as employer from "../employer.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as jobs from "../jobs.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_payeCalc from "../lib/payeCalc.js";
import type * as lib_payments from "../lib/payments.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as payroll from "../payroll.js";
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
  applications: typeof applications;
  assessments: typeof assessments;
  auth: typeof auth;
  candidates: typeof candidates;
  employer: typeof employer;
  http: typeof http;
  interviews: typeof interviews;
  jobs: typeof jobs;
  "lib/hash": typeof lib_hash;
  "lib/payeCalc": typeof lib_payeCalc;
  "lib/payments": typeof lib_payments;
  messages: typeof messages;
  notifications: typeof notifications;
  payments: typeof payments;
  payroll: typeof payroll;
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
