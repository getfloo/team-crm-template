import Link from "next/link";
import { notFound } from "next/navigation";
import { ACTIVITY_KINDS, DEAL_STAGES } from "@/db/schema";
import { type TeamMember, listTeam, syncUser } from "@/db/users";
import { MAX_ACTIVITY_LENGTH } from "@/lib/activities";
import { getCompany } from "@/lib/companies";
import type { Contact } from "@/lib/contacts";
import { NotFound, canDelete } from "@/lib/crm";
import type { Deal } from "@/lib/deals";
import { getIdentity } from "@/lib/identity";
import {
  addContact, addDeal, editCompany, editContact, editDeal, logActivity,
  removeActivity, removeCompany, removeContact, removeDeal,
} from "../../actions";
import {
  CURRENCY, DateTime, EmptyState, STAGE_LABELS, StageBadge, dangerButton, disclosure, formatMoney, primaryButton,
} from "../../ui";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<(typeof ACTIVITY_KINDS)[number], string> = { note: "Note", call: "Call", email: "Email" };

async function loadCompany(id: string) {
  try {
    return await getCompany(id);
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
}

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const user = await getIdentity();
  // The layout syncs users concurrently with this page; sync here too so a first-time
  // visitor is in the owner list that defaults to them.
  await syncUser(user);
  const [company, team] = await Promise.all([loadCompany((await params).id), listTeam()]);
  const isAdmin = canDelete(user);
  const dealTitles = new Map(company.deals.map((deal) => [deal.id, deal.title]));

  return (
    <>
      <header className="mb-8">
        <Link href="/companies" className="text-sm text-muted hover:text-ink">← Companies</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight wrap-anywhere">{company.name}</h1>
        {company.domain && (
          <a href={`https://${company.domain}`} className="mt-1 inline-block text-sm text-accent hover:text-accent-hover"
            target="_blank" rel="noreferrer">{company.domain}</a>
        )}
        <details className="mt-3">
          <summary className={disclosure}>Edit company</summary>
          <div className="mt-3 max-w-md space-y-3 rounded-md border bg-panel p-4">
            <form action={editCompany.bind(null, company.id)} className="space-y-3">
              <TextField label="Name" name="name" defaultValue={company.name} required />
              <TextField label="Domain" name="domain" defaultValue={company.domain} />
              <button type="submit" className={primaryButton}>Save</button>
            </form>
            {isAdmin && (
              <form action={removeCompany.bind(null, company.id)} className="border-t pt-3">
                <button type="submit" className={dangerButton}>Delete company</button>
                <p className="mt-1 text-xs text-muted">Also deletes its contacts, deals and activity.</p>
              </form>
            )}
          </div>
        </details>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-10">
          <section aria-labelledby="deals-heading">
            <h2 id="deals-heading" className="mb-3 text-lg font-semibold">
              Deals <span className="font-normal text-muted">({company.deals.length})</span>
            </h2>
            {company.deals.length === 0 && <EmptyState>No deals with {company.name} yet.</EmptyState>}
            <ul className="space-y-3">
              {company.deals.map((deal) => (
                <li key={deal.id} id={`deal-${deal.id}`}
                  className="scroll-mt-6 rounded-md border bg-panel p-4 target:border-accent target:ring-2 target:ring-ring">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium wrap-anywhere">{deal.title}</p>
                    <StageBadge stage={deal.stage} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    <span className="text-ink tabular-nums">{formatMoney(deal.value)}</span>
                    {" · "}{deal.ownerName || deal.ownerEmail || "Unassigned"}
                  </p>
                  <details className="mt-2">
                    <summary className={disclosure}>Edit deal</summary>
                    <form action={editDeal.bind(null, deal.id)} className="mt-3 space-y-3">
                      <DealFields deal={deal} team={team} ownerEmail={deal.ownerEmail} />
                      <button type="submit" className={primaryButton}>Save</button>
                    </form>
                    {isAdmin && (
                      <form action={removeDeal.bind(null, deal.id)} className="mt-3 border-t pt-3">
                        <button type="submit" className={dangerButton}>Delete deal</button>
                      </form>
                    )}
                  </details>
                </li>
              ))}
            </ul>
            <details className="mt-4">
              <summary className={disclosure}>Open a deal</summary>
              <form action={addDeal.bind(null, company.id)} className="mt-3 space-y-3 rounded-md border bg-panel p-4">
                <DealFields team={team} ownerEmail={user.email} />
                <button type="submit" className={primaryButton}>Open deal</button>
              </form>
            </details>
          </section>

          <section aria-labelledby="contacts-heading">
            <h2 id="contacts-heading" className="mb-3 text-lg font-semibold">
              Contacts <span className="font-normal text-muted">({company.contacts.length})</span>
            </h2>
            {company.contacts.length === 0 && <EmptyState>No contacts at {company.name} yet.</EmptyState>}
            <ul className="divide-y rounded-md border bg-panel empty:hidden">
              {company.contacts.map((contact) => (
                <li key={contact.id} className="p-4">
                  <p className="font-medium">{contact.name}
                    {contact.title && <span className="font-normal text-muted"> · {contact.title}</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm">
                    {contact.email && <a href={`mailto:${contact.email}`} className="text-accent wrap-anywhere">{contact.email}</a>}
                    {contact.phone && <a href={`tel:${contact.phone}`} className="text-muted">{contact.phone}</a>}
                  </p>
                  <details className="mt-2">
                    <summary className={disclosure}>Edit contact</summary>
                    <form action={editContact.bind(null, contact.id)} className="mt-3 space-y-3">
                      <ContactFields contact={contact} />
                      <button type="submit" className={primaryButton}>Save</button>
                    </form>
                    {isAdmin && (
                      <form action={removeContact.bind(null, contact.id)} className="mt-3 border-t pt-3">
                        <button type="submit" className={dangerButton}>Delete contact</button>
                      </form>
                    )}
                  </details>
                </li>
              ))}
            </ul>
            <details className="mt-4">
              <summary className={disclosure}>Add a contact</summary>
              <form action={addContact.bind(null, company.id)} className="mt-3 space-y-3 rounded-md border bg-panel p-4">
                <ContactFields />
                <button type="submit" className={primaryButton}>Add contact</button>
              </form>
            </details>
          </section>
        </div>

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-3 text-lg font-semibold">Activity</h2>
          <form action={logActivity.bind(null, company.id)} className="mb-6 space-y-3 rounded-md border bg-panel p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Type
                <select name="kind" className="mt-1 block w-full font-normal">
                  {ACTIVITY_KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                About
                <select name="dealId" className="mt-1 block w-full font-normal">
                  <option value="">The company</option>
                  {company.deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              What happened
              <textarea name="body" required maxLength={MAX_ACTIVITY_LENGTH} rows={3}
                placeholder="Called Dana: budget approved, wants a proposal by Friday."
                className="mt-1 block w-full resize-y font-normal" />
            </label>
            <button type="submit" className={primaryButton}>Log activity</button>
          </form>

          {company.activities.length === 0 ? (
            <EmptyState>No activity yet. Log a call, email or note above.</EmptyState>
          ) : (
            <ol className="space-y-3">
              {company.activities.map((activity) => (
                <li key={activity.id} className="rounded-md border bg-panel p-4">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="rounded-sm bg-surface px-2 py-0.5 text-xs font-medium">{KIND_LABELS[activity.kind]}</span>
                    <span className="font-medium">{activity.authorName}</span>
                    {activity.dealId && dealTitles.has(activity.dealId) && (
                      <span className="text-muted">on {dealTitles.get(activity.dealId)}</span>
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap wrap-anywhere leading-relaxed">{activity.body}</p>
                  <p className="mt-2 flex items-center justify-between text-xs text-muted">
                    <DateTime value={activity.createdAt} />
                    {isAdmin && (
                      <form action={removeActivity.bind(null, activity.id)}>
                        <button type="submit" className="cursor-pointer hover:text-danger">Delete</button>
                      </form>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function TextField({ label, name, defaultValue, required, type = "text", placeholder, maxLength = 200 }: {
  label: string; name: string; defaultValue?: string | null; required?: boolean; type?: string; placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} maxLength={maxLength}
        placeholder={placeholder} className="mt-1 block w-full font-normal" />
    </label>
  );
}

function ContactFields({ contact }: { contact?: Contact }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Name" name="name" defaultValue={contact?.name} required placeholder="Dana Whitfield" />
      <TextField label="Title" name="title" defaultValue={contact?.title} placeholder="Head of Operations" />
      <TextField label="Email" name="email" type="email" defaultValue={contact?.email} placeholder="dana@northwind.example" maxLength={320} />
      <TextField label="Phone" name="phone" type="tel" defaultValue={contact?.phone} placeholder="+1 555 0100" maxLength={50} />
    </div>
  );
}

/** Title, value, stage and owner, for both opening and editing a deal. A new deal is owned by whoever opens it. */
function DealFields({ deal, team, ownerEmail }: { deal?: Deal; team: TeamMember[]; ownerEmail: string | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField label="Title" name="title" defaultValue={deal?.title} required placeholder="Annual plan, 40 seats" />
      </div>
      <label className="block text-sm font-medium">
        Value ({CURRENCY})
        <input name="value" type="number" required min={0} max={2_000_000_000} step={1}
          defaultValue={deal?.value} placeholder="24000" className="mt-1 block w-full font-normal" />
      </label>
      <label className="block text-sm font-medium">
        Stage
        <select name="stage" defaultValue={deal?.stage ?? "lead"} className="mt-1 block w-full font-normal">
          {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Owner
        <select name="ownerEmail" defaultValue={ownerEmail ?? ""} className="mt-1 block w-full font-normal">
          <option value="">Unassigned</option>
          {team.map((member) => (
            <option key={member.id} value={member.email}>{member.name || member.email}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
