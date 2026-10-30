import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => { throw new Error("tests never open a database"); } }));
// Validation stays real; only the functions that read or write the database are mocked.
vi.mock("@/lib/companies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/companies")>()),
  searchCompanies: vi.fn(),
  createCompany: vi.fn(),
  getCompany: vi.fn(),
}));
vi.mock("@/lib/contacts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/contacts")>()),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));
vi.mock("@/lib/deals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/deals")>()),
  listDeals: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
}));
vi.mock("@/lib/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/activities")>()),
  createActivity: vi.fn(),
}));

import * as activitiesRoute from "../app/api/activities/route";
import * as companyRoute from "../app/api/companies/[id]/route";
import * as companiesRoute from "../app/api/companies/route";
import * as contactRoute from "../app/api/contacts/[id]/route";
import * as contactsRoute from "../app/api/contacts/route";
import * as dealRoute from "../app/api/deals/[id]/route";
import * as dealsRoute from "../app/api/deals/route";
import { operations } from "../app/api/operations";
import { createActivity } from "../lib/activities";
import { createCompany, getCompany, searchCompanies } from "../lib/companies";
import { createContact, updateContact } from "../lib/contacts";
import { NotFound } from "../lib/crm";
import { createDeal, listDeals, updateDeal } from "../lib/deals";

const keyHeaders = {
  "X-Floo-Auth-Method": "api_key",
  "X-Floo-Api-Consumer-Id": "consumer-9",
  "X-Floo-Api-Consumer-Name": "call-notes-agent",
  "X-Floo-Api-Key-Id": "key-42",
  "X-Floo-Api-Key-Scopes": "api",
};

const COMPANY_ID = "0b8f3c2e-6a1d-4f5b-9c7e-2d4a6b8c0e1f";
const DEAL_ID = "5c1e9a7b-3d2f-4e8a-9b6c-1a2b3c4d5e6f";
const at = new Date("2026-01-01T00:00:00Z");
const company = { id: COMPANY_ID, name: "Northwind", domain: "northwind.example", createdAt: at, updatedAt: at };
const contact = { id: "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a", companyId: COMPANY_ID, name: "Dana", email: null, phone: null, title: null, createdAt: at, updatedAt: at };
const deal = {
  id: DEAL_ID, companyId: COMPANY_ID, companyName: "Northwind", title: "Fleet rollout", value: 48000, stage: "lead" as const,
  ownerId: null, ownerName: null, ownerEmail: null, createdAt: at, updatedAt: at,
};

function call(method: string, path: string, body?: BodyInit): Request {
  return new Request(`http://app${path}`, { method, headers: keyHeaders, body });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

// Every response a handler gives must match what the OpenAPI document declares.
async function expectDocumented(method: string, path: string, response: Response): Promise<unknown> {
  const declared = operations.find((operation) => operation.method === method && operation.path === path)
    ?.responses[response.status];
  expect(declared?.schema, `${method.toUpperCase()} ${path} ${response.status} is not documented`).toBeDefined();
  const body: unknown = await response.json();
  declared?.schema?.parse(body);
  return body;
}

beforeEach(() => vi.clearAllMocks());

describe("companies", () => {
  it("searches by the query string", async () => {
    vi.mocked(searchCompanies).mockResolvedValue([{ ...company, contactCount: 2, openDealCount: 1, openDealValue: 48000 }]);
    const response = await companiesRoute.GET(call("GET", "/api/companies?q=north"));
    expect(response.status).toBe(200);
    await expectDocumented("get", "/api/companies", response);
    expect(searchCompanies).toHaveBeenCalledWith("north");
  });

  it("creates a company and stores an empty domain as null", async () => {
    vi.mocked(createCompany).mockResolvedValue(company);
    const response = await companiesRoute.POST(call("POST", "/api/companies", JSON.stringify({ name: " Northwind ", domain: "" })));
    expect(response.status).toBe(201);
    await expectDocumented("post", "/api/companies", response);
    expect(createCompany).toHaveBeenCalledWith({ name: "Northwind", domain: null });
  });

  it.each([["not JSON", "nope"], ["JSON that is not an object", '"hi"'], ["an empty name", '{"name":""}']])(
    "answers %s with 400",
    async (_label, body) => {
      const response = await companiesRoute.POST(call("POST", "/api/companies", body));
      expect(response.status).toBe(400);
      await expectDocumented("post", "/api/companies", response);
      expect(createCompany).not.toHaveBeenCalled();
    },
  );

  it("answers an unknown company with 404", async () => {
    vi.mocked(getCompany).mockRejectedValue(new NotFound("No company with id x."));
    const response = await companyRoute.GET(call("GET", `/api/companies/${COMPANY_ID}`), params(COMPANY_ID));
    expect(response.status).toBe(404);
    await expectDocumented("get", "/api/companies/{id}", response);
  });

  it("refuses a request that did not come through the gateway", async () => {
    await expect(companiesRoute.GET(new Request("http://app/api/companies"))).rejects.toThrow("did not come through the floo gateway");
    expect(searchCompanies).not.toHaveBeenCalled();
  });
});

describe("contacts", () => {
  it("adds a contact to a company", async () => {
    vi.mocked(createContact).mockResolvedValue(contact);
    const response = await contactsRoute.POST(call("POST", "/api/contacts", JSON.stringify({ companyId: COMPANY_ID, name: "Dana" })));
    expect(response.status).toBe(201);
    await expectDocumented("post", "/api/contacts", response);
    expect(createContact).toHaveBeenCalledWith({ companyId: COMPANY_ID, name: "Dana" });
  });

  it("changes only the fields sent, and null clears one", async () => {
    vi.mocked(updateContact).mockResolvedValue(contact);
    const response = await contactRoute.PATCH(
      call("PATCH", `/api/contacts/${contact.id}`, JSON.stringify({ phone: null, title: "COO" })), params(contact.id),
    );
    expect(response.status).toBe(200);
    await expectDocumented("patch", "/api/contacts/{id}", response);
    expect(updateContact).toHaveBeenCalledWith(contact.id, { phone: null, title: "COO" });
  });

  it("rejects a malformed email", async () => {
    const response = await contactsRoute.POST(
      call("POST", "/api/contacts", JSON.stringify({ companyId: COMPANY_ID, name: "Dana", email: "not-an-email" })),
    );
    expect(response.status).toBe(400);
    await expectDocumented("post", "/api/contacts", response);
  });
});

describe("deals", () => {
  it("lists deals by stage", async () => {
    vi.mocked(listDeals).mockResolvedValue([deal]);
    const response = await dealsRoute.GET(call("GET", "/api/deals?stage=proposal"));
    expect(response.status).toBe(200);
    await expectDocumented("get", "/api/deals", response);
    expect(listDeals).toHaveBeenCalledWith({ stage: "proposal" });
  });

  it("answers an unknown stage with 400", async () => {
    const response = await dealsRoute.GET(call("GET", "/api/deals?stage=closing"));
    expect(response.status).toBe(400);
    await expectDocumented("get", "/api/deals", response);
    expect(listDeals).not.toHaveBeenCalled();
  });

  it("opens a deal at the lead stage by default", async () => {
    vi.mocked(createDeal).mockResolvedValue(deal);
    const response = await dealsRoute.POST(
      call("POST", "/api/deals", JSON.stringify({ companyId: COMPANY_ID, title: "Fleet rollout", value: 48000 })),
    );
    expect(response.status).toBe(201);
    await expectDocumented("post", "/api/deals", response);
    expect(createDeal).toHaveBeenCalledWith({ companyId: COMPANY_ID, title: "Fleet rollout", value: 48000, stage: "lead" });
  });

  it.each([["a negative value", { value: -1 }], ["a fractional value", { value: 1.5 }], ["an unknown stage", { stage: "closing" }]])(
    "rejects %s",
    async (_label, override) => {
      const body = { companyId: COMPANY_ID, title: "Fleet rollout", value: 100, ...override };
      const response = await dealsRoute.POST(call("POST", "/api/deals", JSON.stringify(body)));
      expect(response.status).toBe(400);
      await expectDocumented("post", "/api/deals", response);
      expect(createDeal).not.toHaveBeenCalled();
    },
  );

  it("moves a deal to another stage", async () => {
    vi.mocked(updateDeal).mockResolvedValue({ ...deal, stage: "won" });
    const response = await dealRoute.PATCH(call("PATCH", `/api/deals/${DEAL_ID}`, JSON.stringify({ stage: "won" })), params(DEAL_ID));
    expect(response.status).toBe(200);
    await expectDocumented("patch", "/api/deals/{id}", response);
    expect(updateDeal).toHaveBeenCalledWith(DEAL_ID, { stage: "won" });
  });

  it("answers an unknown deal with 404", async () => {
    vi.mocked(updateDeal).mockRejectedValue(new NotFound("No deal with id x."));
    const response = await dealRoute.PATCH(call("PATCH", `/api/deals/${DEAL_ID}`, JSON.stringify({ value: 1 })), params(DEAL_ID));
    expect(response.status).toBe(404);
    await expectDocumented("patch", "/api/deals/{id}", response);
  });
});

describe("activities", () => {
  it("logs a call with the API consumer as the author", async () => {
    vi.mocked(createActivity).mockResolvedValue({
      id: "1e2d3c4b-5a69-4788-9a0b-c1d2e3f4a5b6", companyId: COMPANY_ID, dealId: DEAL_ID, kind: "call",
      body: "Budget approved.", authorId: "consumer-9", authorName: "call-notes-agent", createdAt: at,
    });
    const response = await activitiesRoute.POST(
      call("POST", "/api/activities", JSON.stringify({ dealId: DEAL_ID, kind: "call", body: "Budget approved." })),
    );
    expect(response.status).toBe(201);
    await expectDocumented("post", "/api/activities", response);
    expect(createActivity).toHaveBeenCalledWith(
      { dealId: DEAL_ID, kind: "call", body: "Budget approved." },
      expect.objectContaining({ kind: "api_key", id: "consumer-9", name: "call-notes-agent" }),
    );
  });

  it("needs a company or a deal before it touches the database", async () => {
    const { createActivity: real } = await vi.importActual<typeof import("../lib/activities")>("../lib/activities");
    const caller = { kind: "api_key" as const, id: "consumer-9", name: "", keyId: "key-42", scopes: ["api"] };
    await expect(real({ kind: "note", body: "hello" }, caller)).rejects.toThrow("Send a companyId, a dealId, or both.");
  });
});
