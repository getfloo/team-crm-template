import { z } from "zod";
import { CompanyInput, CompanySearch } from "@/lib/companies";
import { ApiError, type Operation } from "@/lib/openapi";
import { CompanyDetailJson, CompanyJson, CompanySummaryJson } from "../schemas";

// The contract for ./route.ts and ./[id]/route.ts.
export const operations: Operation[] = [
  {
    method: "get",
    path: "/api/companies",
    operationId: "searchCompanies",
    summary: "Search companies by name, domain, or a contact's name or email. Alphabetical, up to 200.",
    query: CompanySearch,
    responses: {
      200: { description: "Matching companies with contact and open deal totals.", schema: z.object({ companies: z.array(CompanySummaryJson) }) },
      400: { description: "The query is too long.", schema: ApiError },
    },
  },
  {
    method: "post",
    path: "/api/companies",
    operationId: "createCompany",
    summary: "Create a company.",
    request: CompanyInput,
    responses: {
      201: { description: "The created company.", schema: z.object({ company: CompanyJson }) },
      400: { description: "The body is not JSON or a field is invalid.", schema: ApiError },
    },
  },
  {
    method: "get",
    path: "/api/companies/{id}",
    operationId: "getCompany",
    summary: "Get a company with its contacts, deals and activity timeline.",
    responses: {
      200: { description: "The company.", schema: z.object({ company: CompanyDetailJson }) },
      404: { description: "No company has this id.", schema: ApiError },
    },
  },
];
