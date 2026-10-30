import { z } from "zod";
import { ContactInput, ContactUpdate } from "@/lib/contacts";
import { ApiError, type Operation } from "@/lib/openapi";
import { ContactJson } from "../schemas";

// The contract for ./route.ts and ./[id]/route.ts.
export const operations: Operation[] = [
  {
    method: "post",
    path: "/api/contacts",
    operationId: "createContact",
    summary: "Add a contact to a company.",
    request: ContactInput,
    responses: {
      201: { description: "The created contact.", schema: z.object({ contact: ContactJson }) },
      400: { description: "The body is not JSON or a field is invalid.", schema: ApiError },
      404: { description: "No company has this companyId.", schema: ApiError },
    },
  },
  {
    method: "patch",
    path: "/api/contacts/{id}",
    operationId: "updateContact",
    summary: "Change a contact. Only the fields sent change; null clears an optional field.",
    request: ContactUpdate,
    responses: {
      200: { description: "The updated contact.", schema: z.object({ contact: ContactJson }) },
      400: { description: "The body is not JSON or a field is invalid.", schema: ApiError },
      404: { description: "No contact has this id.", schema: ApiError },
    },
  },
];
