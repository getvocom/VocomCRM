'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { formatCompact } from '@/lib/format';
import { addOpportunity, setQuestionDone, updateOpportunity } from '@/app/actions';
import {
  dealEconomics,
  dealTitle,
  formatDay,
  formatPercent,
  formatUsd,
  hasCost,
  hasQuote,
  isOpen,
  stageOf,
  todayIso
} from '@/lib/opportunities';
import {
  DEAL_PRIORITIES,
  DEAL_STAGES,
  DEAL_TRACKS,
  DEAL_TYPES,
  OPEN_STAGES,
  OWNER_COMMISSION_RATE,
  WAITING_QUOTE_STATUSES,
  type Account,
  type Deal,
  type DealStage,
  type Rep
} from '@/lib/types';
import { DealDrawer } from './deal-drawer';

type Tab = 'overview' | 'opps' | 'pipeline' | 'quotes' | 'questions' | 'actions' | 'table';

const NO_ACCOUNT = '__none__';

function ownerName(deal: Deal, accounts: Map<string, Account>, reps: Map<string, Rep>): string {
  const rep = deal.assigned_rep_id ?? (deal.account_id ? accounts.get(deal.account_id)?.assigned_rep_id : null);
  return (rep && reps.get(rep)?.name) || '';
}

function StageSelect({ deal }: { deal: Deal }) {
  const [pending, start] = useTransition();
  const stage = stageOf(deal);
  return (
    <select
      className={`stage st-${stage}`}
      value={stage}
      disabled={pending}
      aria-label="Stage"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => start(() => updateOpportunity(deal.id, { stage: e.target.value as DealStage }))}
    >
      {DEAL_STAGES.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  );
}

function Money({ n, dash = 'n/a' }: { n: number | null; dash?: string }) {
  return <span className={`money ${n ? '' : 'na'}`}>{n ? formatUsd(n) : dash}</span>;
}

export function OpportunitiesWorkspace({
  deals,
  accounts,
  reps,
  tableView
}: {
  deals: Deal[];
  accounts: Account[];
  reps: Rep[];
  tableView: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('opps');
  const [typeFilter, setTypeFilter] = useState('All');
  const [trackFilter, setTrackFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('any');
  const [ownerFilter, setOwnerFilter] = useState('any');
  const [priorityFilter, setPriorityFilter] = useState('any');
  const [accountFilter, setAccountFilter] = useState('any');
  const [quotedFilter, setQuotedFilter] = useState('any');
  const [costFilter, setCostFilter] = useState('any');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const repMap = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps]);

  // Type, track and search narrow every view; the other filters only apply to Opportunities.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (typeFilter !== 'All' && d.deal_type !== typeFilter) return false;
      if (trackFilter !== 'All' && d.track !== trackFilter) return false;
      if (!q) return true;
      const acct = d.account_id ? accountMap.get(d.account_id)?.name : '';
      return [dealTitle(d), d.customer_name, d.company, d.summary, d.next_action, acct]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    });
  }, [deals, typeFilter, trackFilter, search, accountMap]);

  const filtered = useMemo(
    () =>
      scoped.filter((d) => {
        if (stageFilter !== 'any' && stageOf(d) !== stageFilter) return false;
        if (priorityFilter !== 'any' && d.priority !== priorityFilter) return false;
        if (accountFilter !== 'any' && (d.account_id ?? NO_ACCOUNT) !== accountFilter) return false;
        if (ownerFilter !== 'any' && ownerName(d, accountMap, repMap) !== ownerFilter) return false;
        if (quotedFilter === 'priced' && !hasQuote(d)) return false;
        if (quotedFilter === 'unpriced' && hasQuote(d)) return false;
        if (costFilter === 'set' && !hasCost(d)) return false;
        if (costFilter === 'missing' && hasCost(d)) return false;
        return true;
      }),
    [scoped, stageFilter, priorityFilter, accountFilter, ownerFilter, quotedFilter, costFilter, accountMap, repMap]
  );

  // Fixed when the workspace mounts so the "due in 7 days" figures stay stable while editing.
  const [{ today, inWeek }] = useState(() => ({
    today: todayIso(),
    inWeek: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  }));
  const open = scoped.filter(isOpen);
  const openValue = open.reduce((s, d) => s + d.value, 0);
  const unpriced = open.filter((d) => !hasQuote(d)).length;
  const waitingQuotes = scoped.flatMap((d) =>
    isOpen(d) ? d.vendor_quotes.filter((v) => WAITING_QUOTE_STATUSES.includes(v.status)).map((v) => ({ d, v })) : []
  );
  const openQuestions = scoped.reduce((s, d) => s + d.questions.filter((q) => !q.done).length, 0);
  const dueSoon = scoped.filter((d) => isOpen(d) && d.next_action && d.next_action_date && d.next_action_date <= inWeek);

  const openDeal = openId ? deals.find((d) => d.id === openId) ?? null : null;

  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'opps', label: 'Opportunities', n: scoped.length },
    { id: 'pipeline', label: 'Pipeline', n: open.length },
    { id: 'quotes', label: 'Vendor quotes', n: waitingQuotes.length },
    { id: 'questions', label: 'Open questions', n: openQuestions },
    { id: 'actions', label: 'Next actions', n: dueSoon.length },
    { id: 'table', label: 'Table' }
  ];

  const ownersList = Array.from(new Set(deals.map((d) => ownerName(d, accountMap, repMap)).filter(Boolean))).sort();

  return (
    <div className="opp">
      <div className="top">
        <div>
          <h1>Deals</h1>
          <p className="sub">
            {deals.length} opportunities across {new Set(deals.map((d) => d.account_id).filter(Boolean)).size} accounts. Today is{' '}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="tools">
          <div className="seg" role="group" aria-label="Type">
            {['All', ...DEAL_TYPES].map((t) => (
              <button key={t} type="button" aria-pressed={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {t === 'All' ? 'All types' : t}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Track">
            {['All', ...DEAL_TRACKS].map((t) => (
              <button key={t} type="button" aria-pressed={trackFilter === t} onClick={() => setTrackFilter(t)}>
                {t}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            placeholder="Search opportunities, accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn primary" onClick={() => setShowNew((v) => !v)}>
            New opportunity
          </button>
        </div>
      </div>

      {showNew && <NewOpportunity accounts={accounts} reps={reps} onDone={(id) => { setShowNew(false); if (id) setOpenId(id); }} />}

      <div className="kpis">
        <button type="button" className="kpi" aria-current={tab === 'opps'} onClick={() => { setTab('opps'); setStageFilter('any'); }}>
          <b>{open.length}</b>
          <span>Open opportunities</span>
        </button>
        <button type="button" className="kpi" onClick={() => setTab('overview')}>
          <b>{formatCompact(openValue)}</b>
          <span>Open pipeline value</span>
          {unpriced > 0 && <small>{unpriced} not yet priced</small>}
        </button>
        <button type="button" className="kpi" aria-current={tab === 'quotes'} onClick={() => setTab('quotes')}>
          <b>{waitingQuotes.length}</b>
          <span>Vendor quotes waiting</span>
        </button>
        <button type="button" className="kpi" aria-current={tab === 'questions'} onClick={() => setTab('questions')}>
          <b>{openQuestions}</b>
          <span>Open questions</span>
        </button>
        <button type="button" className="kpi" aria-current={tab === 'actions'} onClick={() => setTab('actions')}>
          <b>{dueSoon.length}</b>
          <span>Actions due in 7 days</span>
        </button>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.n !== undefined && <span className="n">{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Overview deals={scoped} accountMap={accountMap} repMap={repMap} onOpen={setOpenId} today={today} />
      )}

      {tab === 'opps' && (
        <>
          <div className="filters">
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Stage filter">
              <option value="any">Stage: any</option>
              {DEAL_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} aria-label="Owner filter">
              <option value="any">Owner: any</option>
              {ownersList.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Priority filter">
              <option value="any">Priority: any</option>
              {DEAL_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} aria-label="Account filter">
              <option value="any">Account: any</option>
              <option value={NO_ACCOUNT}>No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select value={quotedFilter} onChange={(e) => setQuotedFilter(e.target.value)} aria-label="Quoted filter">
              <option value="any">Quoted price: any</option>
              <option value="priced">Priced</option>
              <option value="unpriced">Not priced</option>
            </select>
            <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} aria-label="Cost filter">
              <option value="any">Cost: any</option>
              <option value="set">Cost set</option>
              <option value="missing">Cost missing</option>
            </select>
            <span className="count">{filtered.length} shown</span>
          </div>
          <OpportunityTable deals={filtered} accountMap={accountMap} repMap={repMap} onOpen={setOpenId} />
        </>
      )}

      {tab === 'pipeline' && <PipelineBoard deals={scoped} accountMap={accountMap} onOpen={setOpenId} />}
      {tab === 'quotes' && <VendorQuotesView deals={scoped} onOpen={setOpenId} />}
      {tab === 'questions' && <QuestionsView deals={scoped} onOpen={setOpenId} />}
      {tab === 'actions' && <ActionsView deals={scoped} today={today} onOpen={setOpenId} />}
      {tab === 'table' && <div style={{ background: '#fff', borderRadius: 10, padding: 12 }}>{tableView}</div>}

      {openDeal && <DealDrawer key={openDeal.id} deal={openDeal} accounts={accounts} reps={reps} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function NewOpportunity({
  accounts,
  reps,
  onDone
}: {
  accounts: Account[];
  reps: Rep[];
  onDone: (id: string | null) => void;
}) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [stage, setStage] = useState<DealStage>('Lead');
  const [type, setType] = useState('Fiber');
  const [track, setTrack] = useState('Fiber');
  const [owner, setOwner] = useState('');
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        start(async () => {
          const id = await addOpportunity({
            title,
            account_id: accountId || null,
            stage,
            deal_type: type as never,
            track: track as never,
            priority: 'Med',
            assigned_rep_id: owner || null
          });
          onDone(id);
        });
      }}
    >
      <h3>New opportunity</h3>
      <div className="filters">
        <input
          className="search"
          style={{ width: 320 }}
          placeholder="Opportunity name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Opportunity name"
        />
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
          <option value="">No account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value as DealStage)} aria-label="Stage">
          {DEAL_STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          {DEAL_TYPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={track} onChange={(e) => setTrack(e.target.value)} aria-label="Track">
          {DEAL_TRACKS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
          <option value="">Owner: account owner</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn primary" disabled={pending || !title.trim()}>
          Create
        </button>
      </div>
    </form>
  );
}

function OpportunityTable({
  deals,
  accountMap,
  repMap,
  onOpen
}: {
  deals: Deal[];
  accountMap: Map<string, Account>;
  repMap: Map<string, Rep>;
  onOpen: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Deal[]>();
    deals.forEach((d) => {
      const key = d.account_id ?? NO_ACCOUNT;
      map.set(key, [...(map.get(key) ?? []), d]);
    });
    // Accounts with the most open value first, "No account" last.
    return Array.from(map.entries()).sort(([ka, a], [kb, b]) => {
      if (ka === NO_ACCOUNT) return 1;
      if (kb === NO_ACCOUNT) return -1;
      const va = a.filter(isOpen).reduce((s, d) => s + d.value, 0);
      const vb = b.filter(isOpen).reduce((s, d) => s + d.value, 0);
      return vb - va || (accountMap.get(ka)?.name ?? '').localeCompare(accountMap.get(kb)?.name ?? '');
    });
  }, [deals, accountMap]);

  if (deals.length === 0) return <p className="muted">No opportunities match these filters.</p>;

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Stage</th>
            <th>Type</th>
            <th className="r">Quoted</th>
            <th className="r">Cost</th>
            <th className="r">Profit</th>
            <th className="r">Margin</th>
            <th>Next action</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, rows]) => {
            const acct = key === NO_ACCOUNT ? null : accountMap.get(key);
            const openRows = rows.filter(isOpen);
            const openVal = openRows.reduce((s, d) => s + d.value, 0);
            const profit = openRows.reduce((s, d) => s + (dealEconomics(d)?.profit ?? 0), 0);
            return [
              <tr className="grp" key={`g-${key}`}>
                <td colSpan={9}>
                  {acct ? acct.name : 'No account assigned'}
                  <span className="g">
                    {[
                      acct?.assigned_rep_id ? `Owner: ${repMap.get(acct.assigned_rep_id)?.name ?? ''}` : null,
                      acct?.kind,
                      `${openRows.length} open of ${rows.length}`,
                      openVal ? `${formatUsd(openVal)} open value` : 'no value yet',
                      profit ? `${formatUsd(profit)} profit` : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </td>
              </tr>,
              ...rows.map((d) => {
                const e = dealEconomics(d);
                return (
                  <tr key={d.id}>
                    <td>
                      <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
                        {dealTitle(d)}
                      </button>
                    </td>
                    <td>
                      <StageSelect deal={d} />
                    </td>
                    <td>{d.deal_type ?? <span className="na">—</span>}</td>
                    <td className="r">
                      <Money n={d.value} />
                    </td>
                    <td className="r">
                      <Money n={d.cost} />
                    </td>
                    <td className="r">
                      <Money n={e?.profit ?? null} />
                    </td>
                    <td className="r">
                      <span className={`money ${e ? '' : 'na'}`}>{e ? formatPercent(e.margin) : 'n/a'}</span>
                    </td>
                    <td>{d.next_action ?? <span className="na">—</span>}</td>
                    <td className="muted">{formatDay(d.next_action_date)}</td>
                  </tr>
                );
              })
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineBoard({
  deals,
  accountMap,
  onOpen
}: {
  deals: Deal[];
  accountMap: Map<string, Account>;
  onOpen: (id: string) => void;
}) {
  const [over, setOver] = useState<DealStage | null>(null);
  const [, start] = useTransition();
  const move = (id: string, stage: DealStage) => {
    const deal = deals.find((d) => d.id === id);
    if (deal && stageOf(deal) !== stage) start(() => updateOpportunity(id, { stage }));
  };
  return (
    <div className="board">
      {DEAL_STAGES.map((stage) => {
        const col = deals.filter((d) => stageOf(d) === stage);
        const val = col.reduce((s, d) => s + d.value, 0);
        return (
          <div
            key={stage}
            className={`col ${over === stage ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((o) => (o === stage ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              move(e.dataTransfer.getData('text/plain'), stage);
            }}
          >
            <h4>
              <span>{stage}</span>
              <span className="money">
                {col.length}
                {val ? ` · ${formatUsd(val)}` : ''}
              </span>
            </h4>
            {col.map((d) => (
              <div
                key={d.id}
                className="card"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', d.id)}
                onClick={() => onOpen(d.id)}
              >
                <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
                  {dealTitle(d)}
                </button>
                <span className="muted">{d.account_id ? accountMap.get(d.account_id)?.name : 'No account'}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Money n={d.value} />
                  {d.priority && (
                    <span className={`chip ${d.priority === 'High' ? 'crit' : d.priority === 'Med' ? 'warn' : ''}`}>{d.priority}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function VendorQuotesView({ deals, onOpen }: { deals: Deal[]; onOpen: (id: string) => void }) {
  const [waitingOnly, setWaitingOnly] = useState(true);
  const rows = deals
    .flatMap((d) => d.vendor_quotes.map((v) => ({ d, v })))
    .filter(({ v }) => !waitingOnly || WAITING_QUOTE_STATUSES.includes(v.status));
  return (
    <>
      <div className="filters">
        <div className="seg">
          <button type="button" aria-pressed={waitingOnly} onClick={() => setWaitingOnly(true)}>
            Waiting on vendor
          </button>
          <button type="button" aria-pressed={!waitingOnly} onClick={() => setWaitingOnly(false)}>
            All vendor quotes
          </button>
        </div>
        <span className="count">{rows.length} shown</span>
      </div>
      {rows.length === 0 ? (
        <p className="muted">{waitingOnly ? 'No vendor quotes are waiting.' : 'No vendor quotes recorded.'}</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Quote</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ d, v }, i) => (
                <tr key={`${d.id}-${i}`}>
                  <td>
                    <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
                      {dealTitle(d)}
                    </button>
                  </td>
                  <td>{v.vendor}</td>
                  <td>
                    <span className={`chip ${v.status === 'Received' || v.status === 'Revised' ? 'ok' : WAITING_QUOTE_STATUSES.includes(v.status) ? 'warn' : v.status === 'Declined' ? 'crit' : ''}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>{v.quote || <span className="na">—</span>}</td>
                  <td className="muted">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function QuestionsView({ deals, onOpen }: { deals: Deal[]; onOpen: (id: string) => void }) {
  const [, start] = useTransition();
  const withQ = deals.filter((d) => d.questions.some((q) => !q.done)).sort((a, b) => dealTitle(a).localeCompare(dealTitle(b)));
  if (withQ.length === 0) return <p className="muted">No open questions.</p>;
  return (
    <div className="qgrid">
      {withQ.map((d) => (
        <section className="qcard" key={d.id}>
          <header>
            <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
              {dealTitle(d)}
            </button>
            <span className={`chip st-${stageOf(d)}`}>{stageOf(d)}</span>
          </header>
          {d.questions
            .filter((q) => !q.done)
            .map((q) => (
              <div className="q" key={q.id}>
                <input type="checkbox" aria-label="Mark answered" onChange={() => start(() => setQuestionDone(d.id, q.id, true))} />
                <span className="t">{q.q}</span>
                <span className="own">{q.owner}</span>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}

function ActionsView({ deals, today, onOpen }: { deals: Deal[]; today: string; onOpen: (id: string) => void }) {
  const rows = deals
    .filter((d) => isOpen(d) && d.next_action)
    .sort((a, b) => (a.next_action_date ?? '9999').localeCompare(b.next_action_date ?? '9999'));
  if (rows.length === 0) return <p className="muted">No next actions recorded.</p>;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Due</th>
            <th>Opportunity</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                {d.next_action_date ? (
                  <span className={`chip ${d.next_action_date < today ? 'crit' : d.next_action_date === today ? 'warn' : ''}`}>
                    {formatDay(d.next_action_date)}
                  </span>
                ) : (
                  <span className="na">no date</span>
                )}
              </td>
              <td>
                <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
                  {dealTitle(d)}
                </button>
              </td>
              <td>{d.next_action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({
  deals,
  accountMap,
  repMap,
  onOpen,
  today
}: {
  deals: Deal[];
  accountMap: Map<string, Account>;
  repMap: Map<string, Rep>;
  onOpen: (id: string) => void;
  today: string;
}) {
  const open = deals.filter(isOpen);
  const stageRows = DEAL_STAGES.map((s) => {
    const rows = deals.filter((d) => stageOf(d) === s);
    return { s, n: rows.length, v: rows.reduce((a, d) => a + d.value, 0) };
  });
  const maxStage = Math.max(1, ...stageRows.map((r) => r.v));
  const typeRows = DEAL_TYPES.map((t) => {
    const rows = open.filter((d) => d.deal_type === t);
    return { t, n: rows.length, v: rows.reduce((a, d) => a + d.value, 0) };
  }).filter((r) => r.n > 0);
  const maxType = Math.max(1, ...typeRows.map((r) => r.v));
  const largest = [...open].filter(hasQuote).sort((a, b) => b.value - a.value).slice(0, 8);

  const cleanup = [
    { label: 'Open opportunities with no value', n: open.filter((d) => !hasQuote(d)).length },
    { label: 'Open opportunities missing next action or date', n: open.filter((d) => !d.next_action || !d.next_action_date).length },
    { label: 'Open opportunities with no cost', n: open.filter((d) => !hasCost(d)).length },
    { label: 'Opportunities not linked to an account', n: deals.filter((d) => !d.account_id).length }
  ];

  const owners = new Map<string, { n: number; quoted: number; profit: number }>();
  open.forEach((d) => {
    const name = ownerName(d, accountMap, repMap) || 'No owner';
    const cur = owners.get(name) ?? { n: 0, quoted: 0, profit: 0 };
    cur.n += 1;
    cur.quoted += d.value;
    cur.profit += dealEconomics(d)?.profit ?? 0;
    owners.set(name, cur);
  });
  const ownerRows = Array.from(owners.entries()).sort((a, b) => b[1].quoted - a[1].quoted);

  return (
    <div className="dash">
      <div className="panel">
        <h3>By stage</h3>
        {stageRows.map((r) => (
          <div className="brow" key={r.s}>
            <span>{r.s}</span>
            <span className="bt">
              <span className="bf" style={{ width: `${(r.v / maxStage) * 100}%` }} />
            </span>
            <span className="bn">{r.n}</span>
            <span className={`bv money ${r.v ? '' : 'na'}`}>{r.v ? formatUsd(r.v) : 'n/a'}</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Open by type</h3>
        {typeRows.length === 0 && <p className="muted">No open opportunities have a type yet.</p>}
        {typeRows.map((r) => (
          <div className="brow" key={r.t}>
            <span>{r.t}</span>
            <span className="bt">
              <span className="bf" style={{ width: `${(r.v / maxType) * 100}%` }} />
            </span>
            <span className="bn">{r.n}</span>
            <span className={`bv money ${r.v ? '' : 'na'}`}>{r.v ? formatUsd(r.v) : 'n/a'}</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Largest open opportunities</h3>
        {largest.map((d) => (
          <div className="lrow" key={d.id}>
            <div>
              <button type="button" className="lnk" onClick={() => onOpen(d.id)}>
                {dealTitle(d)}
              </button>
              <small>{d.account_id ? accountMap.get(d.account_id)?.name : 'No account'}</small>
            </div>
            <span className={`chip st-${stageOf(d)}`}>{stageOf(d)}</span>
            <span className="money">{formatUsd(d.value)}</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Needs cleanup</h3>
        {cleanup.map((c) => (
          <div className="lrow" key={c.label}>
            <span>{c.label}</span>
            <span />
            <span className={`money ${c.n ? 'neg' : 'na'}`}>{c.n}</span>
          </div>
        ))}
      </div>
      <div className="panel wide">
        <h3>Revenue, profit and commission by owner (open opportunities)</h3>
        <div className="tablewrap" style={{ border: 0 }}>
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Owner</th>
                <th className="r">Open</th>
                <th className="r">Quoted</th>
                <th className="r">Profit</th>
                <th className="r">Commission if won ({Math.round(OWNER_COMMISSION_RATE * 100)}%)</th>
              </tr>
            </thead>
            <tbody>
              {ownerRows.map(([name, r]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="r money">{r.n}</td>
                  <td className="r">
                    <Money n={r.quoted} />
                  </td>
                  <td className="r">
                    <Money n={r.profit || null} />
                  </td>
                  <td className="r">
                    <Money n={r.profit > 0 ? r.profit * OWNER_COMMISSION_RATE : null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted" style={{ gridColumn: '1 / -1', margin: 0 }}>
        Open means {OPEN_STAGES.join(', ')}. On hold and Lost opportunities are not counted. Today is {today}.
      </p>
    </div>
  );
}
