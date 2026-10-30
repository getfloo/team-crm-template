import { errorResponse, readJson } from "@/lib/api";
import { createContact, parseContactInput } from "@/lib/contacts";
import { callerFrom } from "@/lib/identity";

// The contract is in ./openapi.ts.

export async function POST(request: Request): Promise<Response> {
  callerFrom(request.headers);
  try {
    const contact = await createContact(parseContactInput(await readJson(request)));
    return Response.json({ contact }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
