import { OPEN_STAGES, OWNER_COMMISSION_RATE, type Deal, type DealStage } from './types';

// Opportunity maths. "Quoted" is deals.value (0 = not priced yet), "cost" is deals.cost.

export function stageOf(deal: Deal): DealStage {
  if (deal.stage) return deal.stage;
  switch (deal.status) {
    case 'Won':
      return 'Won';
    case 'Lost':
      return 'Lost';
    case 'Negotiation':
      return 'Negotiating';
    case 'Proposal':
      return 'Quoted';
    default:
      return 'Lead';
  }
}

// Opportunity name shown in the tracker: its own title, else the product text, else the customer.
export function dealTitle(deal: Deal): string {
  return deal.title?.trim() || deal.product?.trim() || deal.customer_name;
}

export function isOpen(deal: Deal): boolean {
  return OPEN_STAGES.includes(stageOf(deal));
}

export function hasQuote(deal: Deal): boolean {
  return deal.value > 0;
}

export function hasCost(deal: Deal): boolean {
  return deal.cost !== null && deal.cost > 0;
}

export interface Economics {
  profit: number;
  margin: number; // profit / quoted
  markup: number; // profit / cost
  commission: number;
}

export function economics(quoted: number, cost: number | null): Economics | null {
  if (!(quoted > 0) || cost === null || !(cost > 0)) return null;
  const profit = quoted - cost;
  return { profit, margin: profit / quoted, markup: profit / cost, commission: Math.max(0, profit) * OWNER_COMMISSION_RATE };
}

export function dealEconomics(deal: Deal): Economics | null {
  return economics(deal.value, deal.cost);
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatUsd(n: number): string {
  return usd.format(n);
}

export function formatUsdExact(n: number): string {
  return Number.isInteger(n) ? usd.format(n) : usd2.format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
