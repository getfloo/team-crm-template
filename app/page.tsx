import Link from "next/link";
import { DEAL_STAGES } from "@/db/schema";
import { OPEN_STAGES, listDeals } from "@/lib/deals";
import { getIdentity } from "@/lib/identity";
import { EmptyState, STAGE_LABELS, formatMoney, primaryButton } from "./ui";

export const dynamic = "force-dynamic";

export default async function Pipeline() {
  await getIdentity();
  const deals = await listDeals();
  const total = (stages: readonly string[]) =>
    deals.filter((deal) => stages.includes(deal.stage)).reduce((sum, deal) => sum + deal.value, 0);

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-muted">
            {formatMoney(total(OPEN_STAGES))} open across {deals.filter((deal) => OPEN_STAGES.includes(deal.stage)).length} deals
            {" · "}{formatMoney(total(["won"]))} won
          </p>
        </div>
        <Link href="/companies" className={primaryButton}>Open a deal</Link>
      </header>

      {deals.length === 0 ? (
        <EmptyState>
          <p className="font-medium text-ink">No deals yet.</p>
          <p className="mt-1">Deals belong to a company. Add a company, then open a deal from its page.</p>
          <Link href="/companies" className={`${primaryButton} mt-4 inline-block`}>Add a company</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {DEAL_STAGES.map((stage) => {
            const inStage = deals.filter((deal) => deal.stage === stage);
            return (
              <section key={stage} aria-labelledby={`stage-${stage}`} className="rounded-md bg-surface p-3">
                <h2 id={`stage-${stage}`} className="mb-3 flex items-baseline justify-between px-1 text-sm font-semibold">
                  {STAGE_LABELS[stage]} <span className="font-normal text-muted">{inStage.length}</span>
                </h2>
                <ul className="space-y-2">
                  {inStage.map((deal) => (
                    <li key={deal.id}>
                      <Link href={`/companies/${deal.companyId}#deal-${deal.id}`}
                        className="block rounded-md border bg-panel p-3 hover:border-accent">
                        <p className="font-medium wrap-anywhere">{deal.title}</p>
                        <p className="mt-0.5 text-sm text-muted wrap-anywhere">{deal.companyName}</p>
                        <p className="mt-2 flex flex-wrap justify-between gap-x-2 text-sm">
                          <span className="tabular-nums">{formatMoney(deal.value)}</span>
                          <span className="text-muted">{deal.ownerName || deal.ownerEmail || "Unassigned"}</span>
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
                {inStage.length === 0 && <p className="px-1 py-2 text-sm text-muted">No deals</p>}
                {inStage.length > 0 && (
                  <p className="mt-3 px-1 text-xs text-muted tabular-nums">{formatMoney(total([stage]))}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
