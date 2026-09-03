/* Auto-generated stub. `npx convex dev` will overwrite this with real types. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ActionBuilder, HttpActionBuilder, MutationBuilder, QueryBuilder,
  GenericActionCtx, GenericMutationCtx, GenericQueryCtx,
} from "convex/server";
import type { DataModel } from "./dataModel";

export declare const query: QueryBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;
export declare const httpAction: HttpActionBuilder;

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
