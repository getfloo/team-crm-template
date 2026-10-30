import { z } from "zod";
import { DealFilter, DealInput, DealUpdate } from "@/lib/deals";
import { ApiError, type Operation } from "@/lib/openapi";
import { DealJson } from "../schemas";

// The contract for ./route.ts and ./[id]/route.ts.
export const operations: Operation[] = [
  {
    method: "get",
    path: "/api/deals",
    operationId: "listDeals",
    summary: "List deals, most recently updated first, optionally by stage or owner.",
    query: DealFilter,
    responses: {
      200: { description: "Matching deals.", schema: z.object({ deals: z.array(DealJson) }) },
      400: { description: "An unknown stage or a malformed email.", schema: ApiError },
    },
  },
  {
    method: "post",
    path: "/api/deals",
    operationId: "createDeal",
    summary: "Open a deal on a company. Stage defaults to lead; without ownerEmail it is unassigned.",
    request: DealInput,
    responses: {
      201: { description: "The created deal.", schema: z.object({ deal: DealJson }) },
      400: { description: "The body is not JSON, a field is invalid, or the owner has not signed in.", schema: ApiError },
      404: { description: "No company has this companyId.", schema: ApiError },
    },
  },
  {
    method: "patch",
    path: "/api/deals/{id}",
    operationId: "updateDeal",
    summary: "Change a deal's title, value, stage or owner. Only the fields sent change.",
    request: DealUpdate,
    responses: {
      200: { description: "The updated deal.", schema: z.object({ deal: DealJson }) },
      400: { description: "The body is not JSON, a field is invalid, or the owner has not signed in.", schema: ApiError },
      404: { description: "No deal has this id.", schema: ApiError },
    },
  },
];
