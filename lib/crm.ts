import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import type { User } from "@/lib/identity";

// Shared by every feature module in lib/: the errors the API maps to status codes,
// the one parse step forms and the API both run, and who may delete.

/** Input the caller can fix. The API answers 400; a form never submits it past its own checks. */
export class InvalidInput extends Error {}

/** A record id that does not exist. The API answers 404; pages call notFound(). */
export class NotFound extends Error {}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".");
    throw new InvalidInput(field ? `${field}: ${issue.message}` : issue.message);
  }
  return parsed.data;
}

/** A path id. Anything that is not a UUID cannot name a record, so it is a 404, not a database error. */
export function parseId(id: string, what: string): string {
  if (!z.uuid().safeParse(id).success) {
    throw new NotFound(`No ${what} with id ${id}.`);
  }
  return id;
}

/** Required text: trimmed, 1 to `max` characters. */
export const requiredText = (max: number) => z.string().trim().min(1).max(max);

/** Optional text: trimmed, and an empty value is stored as null. */
export const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().transform((value) => value || null);

/** Any member can create and edit. Deleting is for admins; every delete action checks this server side. */
export function canDelete(user: User): boolean {
  return user.role === "admin";
}

/** Throws NotFound unless the company exists, so a bad companyId is a 404, not a foreign key error. */
export async function requireCompany(id: string): Promise<void> {
  const [found] = await getDb().select({ id: companies.id }).from(companies).where(eq(companies.id, parseId(id, "company")));
  if (!found) {
    throw new NotFound(`No company with id ${id}.`);
  }
}
