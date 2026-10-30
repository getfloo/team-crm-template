import { z } from "zod";
import { ACTIVITY_KINDS, DEAL_STAGES } from "@/db/schema";

// Records as the API returns them. tests/api.test.ts parses every response a
// handler gives against the schema its operation declares.

const timestamp = z.iso.datetime();

export const CompanyJson = z.object({
  id: z.uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const CompanySummaryJson = CompanyJson.extend({
  contactCount: z.int(),
  openDealCount: z.int().meta({ description: "Deals in lead, qualified or proposal." }),
  openDealValue: z.int().meta({ description: "Total value of the open deals." }),
});

export const ContactJson = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const DealJson = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  companyName: z.string(),
  title: z.string(),
  value: z.int(),
  stage: z.enum(DEAL_STAGES),
  ownerId: z.string().nullable().meta({ description: "The owner's user id; null while unassigned." }),
  ownerName: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const ActivityJson = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  dealId: z.uuid().nullable(),
  kind: z.enum(ACTIVITY_KINDS),
  body: z.string(),
  authorId: z.string().meta({ description: "The user or API consumer that logged it." }),
  authorName: z.string(),
  createdAt: timestamp,
});

export const CompanyDetailJson = CompanyJson.extend({
  contacts: z.array(ContactJson),
  deals: z.array(DealJson),
  activities: z.array(ActivityJson).meta({ description: "Newest first, up to 200." }),
});
