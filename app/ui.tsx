import type { DealStage } from "@/lib/deals";

// Small pieces every page shares. Colors come from the tokens in globals.css.

/** Deal values are whole units of this currency. Change it here to show another one. */
export const CURRENCY = "USD";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });

export function formatMoney(value: number): string {
  return money.format(value);
}

export function DateTime({ value }: { value: Date }) {
  return (
    <time dateTime={value.toISOString()}>
      {value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
    </time>
  );
}

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STAGE_STYLES: Record<DealStage, string> = {
  lead: "bg-surface text-muted",
  qualified: "bg-warning-soft text-warning",
  proposal: "bg-warning-soft text-warning",
  won: "bg-success-soft text-success",
  lost: "bg-danger-soft text-danger",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

export const primaryButton =
  "cursor-pointer rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover";
export const secondaryButton =
  "cursor-pointer rounded-sm border bg-panel px-4 py-2 text-sm font-medium hover:bg-surface";
export const dangerButton =
  "cursor-pointer rounded-sm px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft";
/** The summary line of a <details> that opens a form. */
export const disclosure = "cursor-pointer select-none text-sm font-medium text-accent hover:text-accent-hover";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted">{children}</div>;
}
