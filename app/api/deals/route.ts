import { errorResponse, readJson, readQuery } from "@/lib/api";
import { createDeal, listDeals, parseDealFilter, parseDealInput } from "@/lib/deals";
import { callerFrom } from "@/lib/identity";

// The contract is in ./openapi.ts.

export async function GET(request: Request): Promise<Response> {
  callerFrom(request.headers);
  try {
    return Response.json({ deals: await listDeals(parseDealFilter(readQuery(request))) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  callerFrom(request.headers);
  try {
    const deal = await createDeal(parseDealInput(await readJson(request)));
    return Response.json({ deal }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
