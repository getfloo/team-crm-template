import { errorResponse, readJson } from "@/lib/api";
import { parseContactUpdate, updateContact } from "@/lib/contacts";
import { callerFrom } from "@/lib/identity";

// The contract is in ../openapi.ts.

export async function PATCH(request: Request, { params }: RouteContext<"/api/contacts/[id]">): Promise<Response> {
  callerFrom(request.headers);
  try {
    const input = parseContactUpdate(await readJson(request));
    return Response.json({ contact: await updateContact((await params).id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}
