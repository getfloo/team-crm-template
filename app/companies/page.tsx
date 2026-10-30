import Link from "next/link";
import { searchCompanies } from "@/lib/companies";
import { getIdentity } from "@/lib/identity";
import { addCompany } from "../actions";
import { EmptyState, formatMoney, primaryButton, secondaryButton } from "../ui";

export const dynamic = "force-dynamic";

export default async function Companies({ searchParams }: PageProps<"/companies">) {
  await getIdentity();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  const companies = await searchCompanies(q);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-1 text-muted">Every account your team works, with its contacts and open deals.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Company list">
          <form role="search" className="mb-4 flex gap-2">
            <label htmlFor="q" className="sr-only">Search companies</label>
            <input id="q" name="q" type="search" defaultValue={q} maxLength={200}
              placeholder="Search by company, domain, or contact" className="min-w-0 flex-1" />
            <button type="submit" className={secondaryButton}>Search</button>
          </form>

          {companies.length === 0 ? (
            <EmptyState>
              {q ? <>No companies match “{q}”. <Link href="/companies" className="text-accent">Clear the search</Link>.</>
                : <>No companies yet. Add your first one to start tracking contacts and deals.</>}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Company</th><th>Domain</th><th>Contacts</th><th>Open deals</th><th className="text-right">Open value</th></tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="font-medium">
                        <Link href={`/companies/${company.id}`} className="hover:text-accent">{company.name}</Link>
                      </td>
                      <td className="text-muted">{company.domain}</td>
                      <td>{company.contactCount}</td>
                      <td>{company.openDealCount}</td>
                      <td className="text-right">{formatMoney(company.openDealValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="add-company" className="h-fit rounded-md border bg-panel p-5">
          <h2 id="add-company" className="mb-4 font-semibold">Add a company</h2>
          <form action={addCompany} className="space-y-3">
            <label className="block text-sm font-medium">
              Name
              <input name="name" required maxLength={200} placeholder="Northwind Logistics" className="mt-1 block w-full font-normal" />
            </label>
            <label className="block text-sm font-medium">
              Domain <span className="font-normal text-muted">(optional)</span>
              <input name="domain" maxLength={200} placeholder="northwind.example" className="mt-1 block w-full font-normal" />
            </label>
            <button type="submit" className={primaryButton}>Add company</button>
          </form>
        </section>
      </div>
    </>
  );
}
