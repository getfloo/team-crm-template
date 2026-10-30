import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => { throw new Error("tests never open a database"); } }));
vi.mock("@/lib/companies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/companies")>()),
  deleteCompany: vi.fn(),
  updateCompany: vi.fn(),
}));
vi.mock("@/lib/contacts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/contacts")>()),
  deleteContact: vi.fn(),
}));
vi.mock("@/lib/deals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/deals")>()),
  deleteDeal: vi.fn(),
  updateDeal: vi.fn(),
}));
vi.mock("@/lib/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/activities")>()),
  deleteActivity: vi.fn(),
}));

import { headers } from "next/headers";
import { editCompany, editDeal, removeActivity, removeCompany, removeContact, removeDeal } from "../app/actions";
import { deleteActivity } from "../lib/activities";
import { deleteCompany, updateCompany } from "../lib/companies";
import { deleteContact } from "../lib/contacts";
import { deleteDeal, updateDeal } from "../lib/deals";

const ID = "0b8f3c2e-6a1d-4f5b-9c7e-2d4a6b8c0e1f";

function signedInAs(role: string) {
  vi.mocked(headers).mockResolvedValue(new Headers({
    "X-Floo-User-Id": "user-123",
    "X-Floo-User-Email": "pat@example.com",
    "X-Floo-User-Name": "Pat",
    "X-Floo-User-Role": role,
  }) as Awaited<ReturnType<typeof headers>>);
}

const deletes = [
  ["removeCompany", removeCompany, deleteCompany],
  ["removeContact", removeContact, deleteContact],
  ["removeDeal", removeDeal, deleteDeal],
  ["removeActivity", removeActivity, deleteActivity],
] as const;

beforeEach(() => vi.clearAllMocks());

describe("deleting", () => {
  it.each(deletes)("%s refuses a member", async (_name, action, remove) => {
    signedInAs("member");
    await expect(action(ID)).rejects.toThrow("Only admins can delete.");
    expect(remove).not.toHaveBeenCalled();
  });

  it.each(deletes)("%s lets an admin delete", async (_name, action, remove) => {
    signedInAs("admin");
    await action(ID);
    expect(remove).toHaveBeenCalledWith(ID);
  });
});

describe("editing", () => {
  it("lets a member edit a company", async () => {
    signedInAs("member");
    const form = new FormData();
    form.set("name", "Northwind Logistics");
    form.set("domain", "");
    await editCompany(ID, form);
    expect(updateCompany).toHaveBeenCalledWith(ID, { name: "Northwind Logistics", domain: null });
  });

  it("reads a deal form: the value as a number and an empty owner as unassigned", async () => {
    signedInAs("member");
    const form = new FormData();
    for (const [key, value] of Object.entries({ title: "Fleet rollout", value: "48000", stage: "proposal", ownerEmail: "" })) {
      form.set(key, value);
    }
    await editDeal(ID, form);
    expect(updateDeal).toHaveBeenCalledWith(ID, { title: "Fleet rollout", value: 48000, stage: "proposal", ownerEmail: null });
  });
});
