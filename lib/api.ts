import "server-only";
import { InvalidInput, NotFound } from "@/lib/crm";

// Shared by the handlers under app/api. The gateway has already checked the key
// and its "api" scope before any of them runs.

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InvalidInput("Send a JSON object as the request body.");
  }
}

/** Query string values as a plain object, for a zod query schema. */
export function readQuery(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

/** Answers the errors a caller can fix. Anything else is a bug and propagates as a 500. */
export function errorResponse(error: unknown): Response {
  if (error instanceof InvalidInput) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFound) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  throw error;
}
