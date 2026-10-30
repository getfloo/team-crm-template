"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createActivity, deleteActivity, parseActivityInput } from "@/lib/activities";
import { createCompany, deleteCompany, parseCompanyInput, updateCompany } from "@/lib/companies";
import { createContact, deleteContact, parseContactInput, parseContactUpdate, updateContact } from "@/lib/contacts";
import { canDelete } from "@/lib/crm";
import { createDeal, deleteDeal, parseDealInput, parseDealUpdate, updateDeal } from "@/lib/deals";
import { getIdentity } from "@/lib/identity";

// Form actions for signed-in people. Any member can create and edit; every delete
// re-checks the role here, because a hidden button is not a permission check.
// Ids bound with .bind() come from the client, so they are validated in lib/.

async function requireAdmin(): Promise<void> {
  if (!canDelete(await getIdentity())) {
    throw new Error("Only admins can delete.");
  }
}

function refresh(): void {
  revalidatePath("/", "layout");
}

// Number("") is 0 and Number("x") is NaN; the schema rejects NaN, and the form marks value required.
function dealFields(form: FormData) {
  return { ...Object.fromEntries(form), value: Number(form.get("value")), ownerEmail: form.get("ownerEmail") || null };
}

export async function addCompany(form: FormData): Promise<void> {
  await getIdentity();
  const company = await createCompany(parseCompanyInput(Object.fromEntries(form)));
  refresh();
  redirect(`/companies/${company.id}`);
}

export async function editCompany(id: string, form: FormData): Promise<void> {
  await getIdentity();
  await updateCompany(id, parseCompanyInput(Object.fromEntries(form)));
  refresh();
}

export async function removeCompany(id: string): Promise<void> {
  await requireAdmin();
  await deleteCompany(id);
  refresh();
  redirect("/companies");
}

export async function addContact(companyId: string, form: FormData): Promise<void> {
  await getIdentity();
  await createContact(parseContactInput({ ...Object.fromEntries(form), companyId }));
  refresh();
}

export async function editContact(id: string, form: FormData): Promise<void> {
  await getIdentity();
  await updateContact(id, parseContactUpdate(Object.fromEntries(form)));
  refresh();
}

export async function removeContact(id: string): Promise<void> {
  await requireAdmin();
  await deleteContact(id);
  refresh();
}

export async function addDeal(companyId: string, form: FormData): Promise<void> {
  await getIdentity();
  await createDeal(parseDealInput({ ...dealFields(form), companyId }));
  refresh();
}

export async function editDeal(id: string, form: FormData): Promise<void> {
  await getIdentity();
  await updateDeal(id, parseDealUpdate(dealFields(form)));
  refresh();
}

export async function removeDeal(id: string): Promise<void> {
  await requireAdmin();
  await deleteDeal(id);
  refresh();
}

export async function logActivity(companyId: string, form: FormData): Promise<void> {
  const author = await getIdentity();
  const input = parseActivityInput({
    companyId,
    dealId: form.get("dealId") || undefined,
    kind: form.get("kind"),
    body: form.get("body"),
  });
  await createActivity(input, author);
  refresh();
}

export async function removeActivity(id: string): Promise<void> {
  await requireAdmin();
  await deleteActivity(id);
  refresh();
}
