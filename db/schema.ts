import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const DEAL_STAGES = ["lead", "qualified", "proposal", "won", "lost"] as const;
export const ACTIVITY_KINDS = ["note", "call", "email"] as const;

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/** People who have signed in, synced from the gateway on every page load. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  ...timestamps,
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  ...timestamps,
});

// Deleting a company deletes its contacts, deals and activity.
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  ...timestamps,
}, (table) => [index("contacts_company_id_idx").on(table.companyId)]);

// owner_id is a users.id, or null while nobody owns the deal. It is not a foreign
// key so the users table stays a cache of gateway identity that can be rebuilt.
export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Whole currency units (see CURRENCY in app/ui.tsx). */
  value: integer("value").notNull(),
  stage: text("stage", { enum: DEAL_STAGES }).notNull(),
  ownerId: text("owner_id"),
  ...timestamps,
}, (table) => [
  index("deals_company_id_idx").on(table.companyId),
  index("deals_owner_id_idx").on(table.ownerId),
]);

// The author is whoever the gateway asserted: a signed-in user or an API consumer
// (an agent). author_name is copied at write time because an API consumer has no
// users row. Activity on a deal also carries the deal's company, so a company's
// timeline is one query; it stays on the company if the deal is deleted.
export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  kind: text("kind", { enum: ACTIVITY_KINDS }).notNull(),
  body: text("body").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("activities_company_id_created_at_idx").on(table.companyId, table.createdAt),
  index("activities_deal_id_idx").on(table.dealId),
]);
