import { createActivity, parseActivityInput } from "@/lib/activities";
import { errorResponse, readJson } from "@/lib/api";
import { callerFrom } from "@/lib/identity";

// The contract is in ./openapi.ts.

export async function POST(request: Request): Promise<Response> {
  const caller = callerFrom(request.headers);
  try {
    const activity = await createActivity(parseActivityInput(await readJson(request)), caller);
    return Response.json({ activity }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
