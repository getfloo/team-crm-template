import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { ACTIVITY_KINDS, activities, deals } from "@/db/schema";
import type { Caller } from "@/lib/identity";
import { InvalidInput, NotFound, parse, parseId, requireCompany, requiredText } from "@/lib/crm";

export const MAX_ACTIVITY_LENGTH = 10_000;

export const ActivityInput = z.object({
  companyId: z.uuid().optional().meta({ description: "The company the activity is about. Optional when dealId is set." }),
  dealId: z.uuid().optional().meta({ description: "The deal the activity is about. The activity also shows on the deal's company." }),
  kind: z.enum(ACTIVITY_KINDS).default("note"),
  body: requiredText(MAX_ACTIVITY_LENGTH).meta({ description: "What happened, such as a call summary." }),
});

export const parseActivityInput = (value: unknown) => parse(ActivityInput, value);

export type Activity = typeof activities.$inferSelect;

/** Appends to the log. The author is the caller the gateway asserted, never a submitted name. */
export async function createActivity(input: z.infer<typeof ActivityInput>, author: Caller): Promise<Activity> {
  let companyId: string;
  if (input.dealId) {
    const [deal] = await getDb().select({ companyId: deals.companyId }).from(deals)
      .where(eq(deals.id, input.dealId));
    if (!deal) {
      throw new NotFound(`No deal with id ${input.dealId}.`);
    }
    if (input.companyId && input.companyId !== deal.companyId) {
      throw new InvalidInput("companyId: the deal belongs to a different company.");
    }
    companyId = deal.companyId;
  } else if (input.companyId) {
    await requireCompany(input.companyId);
    companyId = input.companyId;
  } else {
    throw new InvalidInput("Send a companyId, a dealId, or both.");
  }
  const authorName = author.kind === "user" ? author.name || author.email : author.name || "API key";
  const [activity] = await getDb().insert(activities).values({
    companyId,
    dealId: input.dealId ?? null,
    kind: input.kind,
    body: input.body,
    authorId: author.id,
    authorName,
  }).returning();
  return activity;
}

export async function deleteActivity(id: string): Promise<void> {
  await getDb().delete(activities).where(eq(activities.id, parseId(id, "activity")));
}
