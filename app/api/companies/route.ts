import { errorResponse, readJson, readQuery } from "@/lib/api";
import { createCompany, parseCompanyInput, parseCompanySearch, searchCompanies } from "@/lib/companies";
import { callerFrom } from "@/lib/identity";

// The contract is in ./openapi.ts.

export async function GET(request: Request): Promise<Response> {
  callerFrom(request.headers);
  try {
    const { q } = parseCompanySearch(readQuery(request));
    return Response.json({ companies: await searchCompanies(q) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  callerFrom(request.headers);
  try {
    const company = await createCompany(parseCompanyInput(await readJson(request)));
    return Response.json({ company }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
