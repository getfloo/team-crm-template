import { z } from "zod";
import { ActivityInput } from "@/lib/activities";
import { ApiError, type Operation } from "@/lib/openapi";
import { ActivityJson } from "../schemas";

// The contract for ./route.ts.
export const operations: Operation[] = [
  {
    method: "post",
    path: "/api/activities",
    operationId: "logActivity",
    summary: "Append a note, call or email to a company or deal. The author is the API key's consumer.",
    request: ActivityInput,
    responses: {
      201: { description: "The logged activity.", schema: z.object({ activity: ActivityJson }) },
      400: { description: "The body is not JSON, a field is invalid, or neither companyId nor dealId was sent.", schema: ApiError },
      404: { description: "No company or deal has the id sent.", schema: ApiError },
    },
  },
];
