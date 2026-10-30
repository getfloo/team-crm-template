import "server-only";
import { and, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { DEAL_STAGES, companies, deals, users } from "@/db/schema";
import { userIdByEmail } from "@/db/users";
import { InvalidInput, NotFound, parse, parseId, requireCompany, requiredText } from "@/lib/crm";

export type DealStage = (typeof DEAL_STAGES)[number];

/** Stages still in play. Won and lost are closed. */
export const OPEN_STAGES: DealStage[] = ["lead", "qualified", "proposal"];

const dealFields = {
  title: requiredText(200).meta({ description: "What is being sold, such as \"Annual plan, 40 seats\"." }),
  value: z.number().int().min(0).max(2_000_000_000)
    .meta({ description: "Deal value in whole currency units." }),
  stage: z.enum(DEAL_STAGES),
  ownerEmail: z.email().nullable().optional().meta({
    description: "Email of the teammate who owns the deal. They must have signed in once. Null means unassigned.",
  }),
};

export const DealInput = z.object({
  companyId: z.uuid(),
  ...dealFields,
  stage: dealFields.stage.default("lead"),
});

/** Every field optional: only the fields sent change. */
export const DealUpdate = z.object(dealFields).partial();

export const parseDealInput = (value: unknown) => parse(DealInput, value);
export const parseDealUpdate = (value: unknown) => parse(DealUpdate, value);

// A deal row with its company name and owner, the shape every reader gets.
function selectDeals() {
  return getDb()
    .select({ ...getTableColumns(deals), companyName: companies.name, ownerName: users.name, ownerEmail: users.email })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(users, eq(deals.ownerId, users.id));
}

export type Deal = Awaited<ReturnType<typeof selectDeals>>[number];

/** The filters GET /api/deals takes. */
export const DealFilter = z.object({
  stage: z.enum(DEAL_STAGES).optional(),
  ownerEmail: z.email().optional().meta({ description: "Only deals owned by this teammate." }),
});

export const parseDealFilter = (value: unknown) => parse(DealFilter, value);

/** Deals matching every filter given, most recently updated first. */
export async function listDeals(
  filter: z.infer<typeof DealFilter> & { companyId?: string; ownerId?: string } = {},
): Promise<Deal[]> {
  const conditions: SQL[] = [];
  if (filter.companyId) conditions.push(eq(deals.companyId, filter.companyId));
  if (filter.ownerId) conditions.push(eq(deals.ownerId, filter.ownerId));
  if (filter.ownerEmail) conditions.push(eq(sql`lower(${users.email})`, filter.ownerEmail.toLowerCase()));
  if (filter.stage) conditions.push(eq(deals.stage, filter.stage));
  return selectDeals().where(and(...conditions)).orderBy(desc(deals.updatedAt));
}

export async function getDeal(id: string): Promise<Deal> {
  const [deal] = await selectDeals().where(eq(deals.id, parseId(id, "deal")));
  if (!deal) {
    throw new NotFound(`No deal with id ${id}.`);
  }
  return deal;
}

/** The users.id for an owner email; null unassigns, undefined leaves the owner unchanged. */
async function resolveOwner(email: string | null | undefined): Promise<string | null | undefined> {
  if (!email) return email;
  const id = await userIdByEmail(email);
  if (!id) {
    throw new InvalidInput(`ownerEmail: ${email} has not signed in to this app yet.`);
  }
  return id;
}

export async function createDeal(input: z.infer<typeof DealInput>): Promise<Deal> {
  await requireCompany(input.companyId);
  const { ownerEmail, ...values } = input;
  const ownerId = (await resolveOwner(ownerEmail)) ?? null;
  const [deal] = await getDb().insert(deals).values({ ...values, ownerId }).returning({ id: deals.id });
  return getDeal(deal.id);
}

export async function updateDeal(id: string, input: z.infer<typeof DealUpdate>): Promise<Deal> {
  const { ownerEmail, ...values } = input;
  const ownerId = await resolveOwner(ownerEmail);
  const [deal] = await getDb().update(deals)
    .set({ ...values, ...(ownerId !== undefined && { ownerId }), updatedAt: new Date() })
    .where(eq(deals.id, parseId(id, "deal")))
    .returning({ id: deals.id });
  if (!deal) {
    throw new NotFound(`No deal with id ${id}.`);
  }
  return getDeal(deal.id);
}

/** The deal's activity stays on its company's timeline (deal_id is set to null). */
export async function deleteDeal(id: string): Promise<void> {
  await getDb().delete(deals).where(eq(deals.id, parseId(id, "deal")));
}
