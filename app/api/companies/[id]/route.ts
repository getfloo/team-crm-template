import { errorResponse } from "@/lib/api";
import { getCompany } from "@/lib/companies";
import { callerFrom } from "@/lib/identity";

// The contract is in ../openapi.ts.

export async function GET(request: Request, { params }: RouteContext<"/api/companies/[id]">): Promise<Response> {
  callerFrom(request.headers);
  try {
    return Response.json({ company: await getCompany((await params).id) });
  } catch (error) {
    return errorResponse(error);
  }
}
