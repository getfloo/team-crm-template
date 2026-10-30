import { errorResponse, readJson } from "@/lib/api";
import { parseDealUpdate, updateDeal } from "@/lib/deals";
import { callerFrom } from "@/lib/identity";

// The contract is in ../openapi.ts.

export async function PATCH(request: Request, { params }: RouteContext<"/api/deals/[id]">): Promise<Response> {
  callerFrom(request.headers);
  try {
    const input = parseDealUpdate(await readJson(request));
    return Response.json({ deal: await updateDeal((await params).id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}
