import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { NotFound, optionalText, parse, parseId, requireCompany, requiredText } from "@/lib/crm";

const contactFields = {
  name: requiredText(200),
  email: optionalText(320).pipe(z.email().nullable()),
  phone: optionalText(50),
  title: optionalText(200).meta({ description: "Job title, such as \"Head of Operations\"." }),
};

export const ContactInput = z.object({
  companyId: z.uuid(),
  name: contactFields.name,
  email: contactFields.email.optional(),
  phone: contactFields.phone.optional(),
  title: contactFields.title.optional(),
});

/** Every field optional: only the fields sent change. Null or "" clears an optional field. */
export const ContactUpdate = z.object(contactFields).partial();

export const parseContactInput = (value: unknown) => parse(ContactInput, value);
export const parseContactUpdate = (value: unknown) => parse(ContactUpdate, value);

export type Contact = typeof contacts.$inferSelect;

export async function createContact(input: z.infer<typeof ContactInput>): Promise<Contact> {
  await requireCompany(input.companyId);
  const [contact] = await getDb().insert(contacts).values(input).returning();
  return contact;
}

export async function updateContact(id: string, input: z.infer<typeof ContactUpdate>): Promise<Contact> {
  const [contact] = await getDb().update(contacts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contacts.id, parseId(id, "contact")))
    .returning();
  if (!contact) {
    throw new NotFound(`No contact with id ${id}.`);
  }
  return contact;
}

export async function deleteContact(id: string): Promise<void> {
  await getDb().delete(contacts).where(eq(contacts.id, parseId(id, "contact")));
}
