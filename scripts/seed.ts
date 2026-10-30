// Fills an empty database with sample companies, contacts, deals and activity so
// you can see the app working. Run it yourself against the dev database:
//   floo run --service web -- npm run seed
// It never runs on deploy, and it refuses to touch a database that has companies.
// Sign in to the app once first so sample deals are spread across your team.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { activities, companies, contacts, deals, users } from "../db/schema";

type Stage = (typeof deals.$inferInsert)["stage"];
type Kind = (typeof activities.$inferInsert)["kind"];

const SAMPLE: {
  name: string;
  domain: string;
  contacts: { name: string; title: string; email: string; phone?: string }[];
  deals: { title: string; value: number; stage: Stage; daysAgo: number }[];
  activities: { kind: Kind; body: string; daysAgo: number; deal?: number }[];
}[] = [
  {
    name: "Northwind Logistics",
    domain: "northwind.example",
    contacts: [
      { name: "Dana Whitfield", title: "Head of Operations", email: "dana@northwind.example", phone: "+1 555 0142" },
      { name: "Marcus Lee", title: "IT Manager", email: "marcus@northwind.example" },
    ],
    deals: [
      { title: "Fleet tracking rollout, 120 trucks", value: 48000, stage: "proposal", daysAgo: 2 },
      { title: "Driver onboarding pilot", value: 6000, stage: "won", daysAgo: 30 },
    ],
    activities: [
      { kind: "call", body: "Dana confirmed budget for Q1. Wants the proposal to cover two regional depots first.", daysAgo: 2, deal: 0 },
      { kind: "email", body: "Sent the security questionnaire Marcus asked for.", daysAgo: 5, deal: 0 },
      { kind: "note", body: "Pilot went live with 14 drivers. Good reference account.", daysAgo: 30, deal: 1 },
    ],
  },
  {
    name: "Bluebird Dental Group",
    domain: "bluebirddental.example",
    contacts: [
      { name: "Priya Raman", title: "Practice Director", email: "priya@bluebirddental.example", phone: "+1 555 0178" },
    ],
    deals: [{ title: "Scheduling for 6 clinics", value: 18000, stage: "qualified", daysAgo: 4 }],
    activities: [
      { kind: "call", body: "Discovery call. Front desk spends about 10 hours a week on reschedules. Decision by end of month.", daysAgo: 4, deal: 0 },
      { kind: "note", body: "Met Priya at the regional practice managers meetup.", daysAgo: 12 },
    ],
  },
  {
    name: "Harbor & Pine Architects",
    domain: "harborpine.example",
    contacts: [
      { name: "Tomás Ortega", title: "Managing Partner", email: "tomas@harborpine.example" },
      { name: "Helen Cho", title: "Studio Manager", email: "helen@harborpine.example", phone: "+1 555 0193" },
    ],
    deals: [
      { title: "Project time tracking, 35 seats", value: 12600, stage: "lead", daysAgo: 1 },
      { title: "Document archive migration", value: 9000, stage: "lost", daysAgo: 21 },
    ],
    activities: [
      { kind: "email", body: "Helen replied to the intro email and asked for pricing tiers.", daysAgo: 1, deal: 0 },
      { kind: "note", body: "Lost the archive migration on timing. They will revisit next fiscal year.", daysAgo: 21, deal: 1 },
    ],
  },
  {
    name: "Kestrel Analytics",
    domain: "kestrel.example",
    contacts: [{ name: "Sam Adeyemi", title: "VP Engineering", email: "sam@kestrel.example" }],
    deals: [
      { title: "Platform license, annual", value: 72000, stage: "proposal", daysAgo: 3 },
      { title: "Support add-on", value: 8000, stage: "lead", daysAgo: 3 },
    ],
    activities: [
      { kind: "call", body: "Walked Sam's team through the API. They want SSO and an audit log in the proposal.", daysAgo: 3, deal: 0 },
    ],
  },
  {
    name: "Maple Street Bakery Co.",
    domain: "maplestreet.example",
    contacts: [{ name: "Ruth Anders", title: "Owner", email: "ruth@maplestreet.example", phone: "+1 555 0110" }],
    deals: [{ title: "Wholesale ordering portal", value: 4500, stage: "won", daysAgo: 9 }],
    activities: [
      { kind: "note", body: "Signed. Kickoff scheduled for next Tuesday.", daysAgo: 9, deal: 0 },
    ],
  },
  {
    name: "Orbit Freight Partners",
    domain: "orbitfreight.example",
    contacts: [],
    deals: [{ title: "Customs paperwork automation", value: 30000, stage: "qualified", daysAgo: 6 }],
    activities: [
      { kind: "email", body: "Inbound from the website form. Asked for a demo next week.", daysAgo: 6, deal: 0 },
    ],
  },
];

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Missing DATABASE_URL. Run: floo run --service web -- npm run seed");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

try {
  const existing = await db.select({ id: companies.id }).from(companies).limit(1);
  if (existing.length > 0) {
    console.log("The database already has companies. The seed only fills an empty database; nothing changed.");
  } else {
    const team = await db.select({ id: users.id }).from(users);
    let next = 0;
    // Round-robin the sample deals across everyone who has signed in, or leave them unassigned.
    const owner = () => (team.length > 0 ? team[next++ % team.length].id : null);

    await db.transaction(async (tx) => {
      for (const sample of SAMPLE) {
        const [company] = await tx.insert(companies)
          .values({ name: sample.name, domain: sample.domain }).returning({ id: companies.id });
        if (sample.contacts.length > 0) {
          await tx.insert(contacts).values(sample.contacts.map((contact) => ({ ...contact, companyId: company.id })));
        }
        const dealIds: string[] = [];
        for (const deal of sample.deals) {
          const when = daysAgo(deal.daysAgo);
          const [row] = await tx.insert(deals).values({
            companyId: company.id, title: deal.title, value: deal.value, stage: deal.stage,
            ownerId: owner(), createdAt: when, updatedAt: when,
          }).returning({ id: deals.id });
          dealIds.push(row.id);
        }
        await tx.insert(activities).values(sample.activities.map((activity) => ({
          companyId: company.id,
          dealId: activity.deal === undefined ? null : dealIds[activity.deal],
          kind: activity.kind,
          body: activity.body,
          authorId: "seed",
          authorName: "Sample data",
          createdAt: daysAgo(activity.daysAgo),
        })));
      }
    });
    console.log(`Added ${SAMPLE.length} sample companies.` +
      (team.length > 0 ? ` Deals are spread across ${team.length} teammate(s).` : " Deals are unassigned: sign in first to own some."));
  }
} finally {
  await client.end();
}
