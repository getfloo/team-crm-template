import Link from "next/link";
import { DEAL_STAGES } from "@/db/schema";
import { OPEN_STAGES, listDeals } from "@/lib/deals";
import { getIdentity } from "@/lib/identity";
import { DateTime, EmptyState, StageBadge, formatMoney } from "../ui";

export const dynamic = "force-dynamic";

export default async function MyDeals() {
  const user = await getIdentity();
  const deals = (await listDeals({ ownerId: user.id }))
    // Pipeline order: lead first, lost last; within a stage, most recently updated first.
    .sort((a, b) => DEAL_STAGES.indexOf(a.stage) - DEAL_STAGES.indexOf(b.stage));
  const open = deals.filter((deal) => OPEN_STAGES.includes(deal.stage));
  const won = deals.filter((deal) => deal.stage === "won");
  const sum = (list: typeof deals) => list.reduce((total, deal) => total + deal.value, 0);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">My deals</h1>
        <p className="mt-1 text-muted">
          {open.length} open worth {formatMoney(sum(open))} · {won.length} won worth {formatMoney(sum(won))}
        </p>
      </header>

      {deals.length === 0 ? (
        <EmptyState>
          <p className="font-medium text-ink">No deals are assigned to you.</p>
          <p className="mt-1">Deals you open, or that a teammate assigns to you, show up here.</p>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr><th>Deal</th><th>Company</th><th>Stage</th><th className="text-right">Value</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="font-medium">
                    <Link href={`/companies/${deal.companyId}#deal-${deal.id}`} className="hover:text-accent">{deal.title}</Link>
                  </td>
                  <td>{deal.companyName}</td>
                  <td><StageBadge stage={deal.stage} /></td>
                  <td className="text-right">{formatMoney(deal.value)}</td>
                  <td className="whitespace-nowrap text-muted"><DateTime value={deal.updatedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
