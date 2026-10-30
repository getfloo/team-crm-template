import { readFileSync } from "node:fs";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { describe, expect, it } from "vitest";

describe("committed migrations", () => {
  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
  const sql = migrations.flatMap((migration) => migration.sql).join("\n");
  const tables = new Map(Array.from(
    sql.matchAll(/CREATE TABLE "(\w+)"\s*\(([\s\S]*?)\n\);/g),
    ([, name, columns]) => [name, columns],
  ));

  it("creates users with the gateway ID and profile fields", () => {
    expect(tables.get("users")).toMatch(/"id" text PRIMARY KEY NOT NULL/);
    for (const column of ["email", "name", "role", "created_at", "updated_at"]) {
      expect(tables.get("users")).toContain(`"${column}"`);
    }
  });

  it("creates the CRM tables", () => {
    expect([...tables.keys()].sort()).toEqual(["activities", "companies", "contacts", "deals", "users"]);
    expect(tables.get("deals")).toContain('"value" integer NOT NULL');
    expect(tables.get("deals")).toContain('"stage" text NOT NULL');
    expect(tables.get("deals")).toContain('"owner_id" text,');
    expect(tables.get("activities")).toContain('"author_id" text NOT NULL');
    expect(tables.get("activities")).toContain('"author_name" text NOT NULL');
  });

  it("deletes a company's records with it and keeps a deleted deal's activity on the company", () => {
    for (const table of ["contacts", "deals", "activities"]) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE "${table}" ADD CONSTRAINT .*FOREIGN KEY \\("company_id"\\) REFERENCES "companies"\\("id"\\) ON DELETE cascade`));
    }
    expect(sql).toMatch(/FOREIGN KEY \("deal_id"\) REFERENCES "deals"\("id"\) ON DELETE set null/);
  });

  it("does not tie owners or authors to the users table, which only caches gateway identity", () => {
    expect(sql).not.toMatch(/REFERENCES "users"/);
  });

  it("keeps SQL portable across managed tenant schemas", () => {
    expect(sql).not.toMatch(/"public"\.|CREATE SCHEMA|SET search_path|CREATE TYPE/i);
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    expect(journal.entries).toHaveLength(migrations.length);
    expect(migrations.length).toBeGreaterThan(0);
  });
});
