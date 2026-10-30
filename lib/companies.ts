import "server-only";
import { and, asc, desc, eq, exists, getTableColumns, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, companies, contacts, deals } from "@/db/schema";
import { NotFound, optionalText, parse, parseId, requiredText } from "@/lib/crm";
import { OPEN_STAGES, listDeals } from "@/lib/deals";

export const CompanyInput = z.object({
  name: requiredText(200).meta({ description: "Company name." }),
  domain: optionalText(200).optional().meta({ description: "Website domain, such as acme.com." }),
});

export const parseCompanyInput = (value: unknown) => parse(CompanyInput, value);

/** The query GET /api/companies and the companies page take. */
export const CompanySearch = z.object({
  q: z.string().trim().max(200).optional().meta({
    description: "Matches company name or domain, or a contact's name or email. Case-insensitive.",
  }),
});

export const parseCompanySearch = (value: unknown) => parse(CompanySearch, value);

export type Company = typeof companies.$inferSelect;
export type CompanySummary = Awaited<ReturnType<typeof searchCompanies>>[number];

/**
 * Companies whose name or domain, or one of whose contacts' name or email,
 * contains `query` (case-insensitive). No query lists every company. Alphabetical.
 */
export async function searchCompanies(query = "") {
  const db = getDb();
  const pattern = `%${query.trim()}%`;
  const matches = query.trim()
    ? or(
        ilike(companies.name, pattern),
        ilike(companies.domain, pattern),
        exists(db.select().from(contacts).where(and(
          eq(contacts.companyId, companies.id),
          or(ilike(contacts.name, pattern), ilike(contacts.email, pattern)),
        ))),
      )
    : undefined;
  const openDeals = and(eq(deals.companyId, companies.id), inArray(deals.stage, OPEN_STAGES));
  return db
    .select({
      ...getTableColumns(companies),
      contactCount: sql<number>`(select count(*) from ${contacts} where ${eq(contacts.companyId, companies.id)})`.mapWith(Number),
      openDealCount: sql<number>`(select count(*) from ${deals} where ${openDeals})`.mapWith(Number),
      openDealValue: sql<number>`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${openDeals})`.mapWith(Number),
    })
    .from(companies)
    .where(matches)
    .orderBy(asc(companies.name))
    .limit(200);
}

/** A company with everything its page shows: contacts, deals, and its activity timeline. */
export async function getCompany(id: string) {
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, parseId(id, "company")));
  if (!company) {
    throw new NotFound(`No company with id ${id}.`);
  }
  const [companyContacts, companyDeals, timeline] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(asc(contacts.name)),
    listDeals({ companyId: id }),
    db.select().from(activities).where(eq(activities.companyId, id)).orderBy(desc(activities.createdAt)).limit(200),
  ]);
  return { ...company, contacts: companyContacts, deals: companyDeals, activities: timeline };
}

export async function createCompany(input: z.infer<typeof CompanyInput>): Promise<Company> {
  const [company] = await getDb().insert(companies).values(input).returning();
  return company;
}

export async function updateCompany(id: string, input: z.infer<typeof CompanyInput>): Promise<Company> {
  const [company] = await getDb().update(companies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(companies.id, parseId(id, "company")))
    .returning();
  if (!company) {
    throw new NotFound(`No company with id ${id}.`);
  }
  return company;
}

/** Also deletes the company's contacts, deals and activity (ON DELETE CASCADE). */
export async function deleteCompany(id: string): Promise<void> {
  await getDb().delete(companies).where(eq(companies.id, parseId(id, "company")));
}
