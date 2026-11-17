'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  deleteOpportunity,
  logOpportunityActivity,
  updateOpportunity,
  type OpportunityFields
} from '@/app/actions';
import {
  dealEconomics,
  dealTitle,
  economics,
  formatPercent,
  formatUsdExact,
  newId,
  stageOf,
  formatDay
} from '@/lib/opportunities';
import {
  DEAL_PRIORITIES,
  DEAL_STAGES,
  DEAL_TRACKS,
  DEAL_TYPES,
  QUOTE_STATUSES,
  type Account,
  type Deal,
  type DealContactRef,
  type DealQuestion,
  type KeyValue,
  type QuoteStatus,
  type Rep,
  type VendorQuote
} from '@/lib/types';

// Right-hand detail drawer for one opportunity. Text fields keep a local draft and save on
// blur; list sections (vendor quotes, questions, specs, contacts) send the whole updated
// array on every change. Every save goes through updateOpportunity, which also keeps the
// derived pipeline status and the activity log in step.
export function DealDrawer({
  deal,
  accounts,
  reps,
  onClose
}: {
  deal: Deal;
  accounts: Account[];
  reps: Rep[];
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const save = (fields: OpportunityFields) => startTransition(() => updateOpportunity(deal.id, fields));

  const [title, setTitle] = useState(dealTitle(deal));
  const [customer, setCustomer] = useState(deal.customer_name);
  const [nextAction, setNextAction] = useState(deal.next_action ?? '');
  const [quoted, setQuoted] = useState(deal.value ? String(deal.value) : '');
  const [cost, setCost] = useState(deal.cost ? String(deal.cost) : '');
  const [quoteBasis, setQuoteBasis] = useState(deal.quote_basis ?? '');
  const [costBasis, setCostBasis] = useState(deal.cost_basis ?? '');
  const [summary, setSummary] = useState(deal.summary ?? '');
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>(deal.vendor_quotes);
  const [questions, setQuestions] = useState<DealQuestion[]>(deal.questions);
  const [specs, setSpecs] = useState<KeyValue[]>(deal.specs);
  const [contacts, setContacts] = useState<DealContactRef[]>(deal.deal_contacts);
  const [newQuestion, setNewQuestion] = useState('');
  const [logText, setLogText] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const econ = economics(Number(quoted) || 0, Number(cost) || null) ?? dealEconomics(deal);
  const account = accounts.find((a) => a.id === deal.account_id);
  const owner = reps.find((r) => r.id === (deal.assigned_rep_id ?? account?.assigned_rep_id))?.name;

  const commitVendorQuotes = (next: VendorQuote[]) => {
    setVendorQuotes(next);
    save({ vendor_quotes: next });
  };
  const commitQuestions = (next: DealQuestion[]) => {
    setQuestions(next);
    save({ questions: next });
  };
  const commitSpecs = (next: KeyValue[]) => {
    setSpecs(next);
    save({ specs: next });
  };
  const commitContacts = (next: DealContactRef[]) => {
    setContacts(next);
    save({ deal_contacts: next });
  };

  return (
    <div className="opp-overlay" onClick={onClose}>
      <aside className="opp-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Opportunity details">
        <button type="button" className="closebtn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="eyebrow">
          {[deal.deal_type, deal.track, `Updated ${formatDay(deal.updated_at)}`].filter(Boolean).join(' · ')}
        </div>
        <input
          aria-label="Opportunity name"
          style={{ fontSize: 20, fontWeight: 600 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== dealTitle(deal) && save({ title: title.trim() })}
        />
        <input
          aria-label="Customer"
          placeholder="Customer or counterparty"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          onBlur={() => customer.trim() && customer !== deal.customer_name && save({ customer_name: customer.trim() })}
        />

        <label className="f">
          Account
          <select
            value={deal.account_id ?? ''}
            onChange={(e) => save({ account_id: e.target.value || null })}
          >
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row4">
          <label className="f">
            Stage
            <select value={stageOf(deal)} onChange={(e) => save({ stage: e.target.value as Deal['stage'] & string })}>
              {DEAL_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="f">
            Priority
            <select
              value={deal.priority ?? ''}
              onChange={(e) => save({ priority: (e.target.value || null) as Deal['priority'] })}
            >
              <option value="">—</option>
              {DEAL_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="f">
            Type
            <select
              value={deal.deal_type ?? ''}
              onChange={(e) => save({ deal_type: (e.target.value || null) as Deal['deal_type'] })}
            >
              <option value="">—</option>
              {DEAL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="f">
            Track
            <select
              value={deal.track ?? ''}
              onChange={(e) => save({ track: (e.target.value || null) as Deal['track'] })}
            >
              <option value="">—</option>
              {DEAL_TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="f">
          Owner {owner ? `(${owner})` : ''}
          <select
            value={deal.assigned_rep_id ?? ''}
            onChange={(e) => save({ assigned_rep_id: e.target.value || null })}
          >
            <option value="">{account?.assigned_rep_id ? 'Account owner' : 'Unassigned'}</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="sec">
          <h3>Next action</h3>
          <div className="row2" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <input
              aria-label="Next action"
              placeholder="What happens next"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              onBlur={() => nextAction !== (deal.next_action ?? '') && save({ next_action: nextAction.trim() || null })}
            />
            <input
              type="date"
              aria-label="Next action date"
              defaultValue={deal.next_action_date ?? ''}
              onChange={(e) => save({ next_action_date: e.target.value || null })}
            />
          </div>
        </div>

        <div className="sec">
          <h3>Quote, cost and profit</h3>
          <div className="row2">
            <label className="f">
              Quoted to customer (USD)
              <input
                inputMode="decimal"
                placeholder="e.g. 2,800,000"
                value={quoted}
                onChange={(e) => setQuoted(e.target.value)}
                onBlur={() => (Number(quoted) || 0) !== deal.value && save({ value: Number(quoted) || 0 })}
              />
            </label>
            <label className="f">
              Quote basis
              <input
                placeholder="Which quote, quantity, terms"
                value={quoteBasis}
                onChange={(e) => setQuoteBasis(e.target.value)}
                onBlur={() => quoteBasis !== (deal.quote_basis ?? '') && save({ quote_basis: quoteBasis.trim() || null })}
              />
            </label>
            <label className="f">
              Our cost (USD)
              <input
                inputMode="decimal"
                placeholder="What Vocom pays"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                onBlur={() => (Number(cost) || null) !== deal.cost && save({ cost: Number(cost) || null })}
              />
            </label>
            <label className="f">
              Cost basis
              <input
                placeholder="Vendor price, freight, tariff, terms"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                onBlur={() => costBasis !== (deal.cost_basis ?? '') && save({ cost_basis: costBasis.trim() || null })}
              />
            </label>
          </div>
          <div className="econ">
            <div>
              <span>Profit</span>
              <b className={econ && econ.profit < 0 ? 'neg' : ''}>{econ ? formatUsdExact(econ.profit) : 'n/a'}</b>
            </div>
            <div>
              <span>Margin</span>
              <b>{econ ? formatPercent(econ.margin) : 'n/a'}</b>
            </div>
            <div>
              <span>Markup on cost</span>
              <b>{econ ? formatPercent(econ.markup) : 'n/a'}</b>
            </div>
            <div>
              <span>Owner commission (15%)</span>
              <b>{econ ? formatUsdExact(econ.commission) : 'n/a'}</b>
            </div>
          </div>
        </div>

        <label className="f">
          Summary
          <textarea
            placeholder="Where this deal stands"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => summary !== (deal.summary ?? '') && save({ summary: summary.trim() || null })}
          />
        </label>

        <div className="sec">
          <h3>
            Files <span>{deal.files.length}</span>
          </h3>
          {deal.files.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No files recorded. File upload is not part of this version.
            </p>
          ) : (
            deal.files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="logrow" style={{ gridTemplateColumns: '1fr auto auto' }}>
                <span>{f.name}</span>
                <span className="muted">{f.kind}</span>
                <span className="muted">{f.size}</span>
              </div>
            ))
          )}
        </div>

        <div className="sec">
          <h3>
            Vendor quotes{' '}
            <span>
              {vendorQuotes.filter((v) => v.status === 'Received' || v.status === 'Revised').length} of{' '}
              {vendorQuotes.length} in
            </span>
          </h3>
          {vendorQuotes.map((v, i) => (
            <div className="vq" key={i}>
              <div className="pair" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
                <input
                  aria-label="Vendor"
                  defaultValue={v.vendor}
                  onBlur={(e) =>
                    e.target.value !== v.vendor &&
                    commitVendorQuotes(vendorQuotes.map((x, j) => (j === i ? { ...x, vendor: e.target.value } : x)))
                  }
                />
                <select
                  aria-label="Quote status"
                  value={v.status}
                  onChange={(e) =>
                    commitVendorQuotes(
                      vendorQuotes.map((x, j) => (j === i ? { ...x, status: e.target.value as QuoteStatus } : x))
                    )
                  }
                >
                  {QUOTE_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="x"
                  aria-label="Remove vendor quote"
                  onClick={() => commitVendorQuotes(vendorQuotes.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
              <div className="row2">
                <input
                  aria-label="Quote or price"
                  placeholder="Quote or price"
                  defaultValue={v.quote}
                  onBlur={(e) =>
                    e.target.value !== v.quote &&
                    commitVendorQuotes(vendorQuotes.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)))
                  }
                />
                <input
                  aria-label="Vendor quote notes"
                  placeholder="Notes"
                  defaultValue={v.notes}
                  onBlur={(e) =>
                    e.target.value !== v.notes &&
                    commitVendorQuotes(vendorQuotes.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))
                  }
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="add"
            onClick={() => commitVendorQuotes([...vendorQuotes, { vendor: 'New vendor', status: 'Not requested', quote: '', notes: '' }])}
          >
            Add vendor
          </button>
        </div>

        <div className="sec">
          <h3>
            Open questions <span>{questions.filter((q) => !q.done).length} open</span>
          </h3>
          {questions.map((q, i) => (
            <div className="qrow" key={q.id}>
              <input
                type="checkbox"
                aria-label="Answered"
                checked={q.done}
                onChange={(e) => commitQuestions(questions.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
              />
              <input
                aria-label="Question"
                defaultValue={q.q}
                onBlur={(e) =>
                  e.target.value !== q.q && commitQuestions(questions.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))
                }
              />
              <input
                aria-label="Owner"
                placeholder="Owner"
                defaultValue={q.owner}
                onBlur={(e) =>
                  e.target.value !== q.owner &&
                  commitQuestions(questions.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))
                }
              />
              <button
                type="button"
                className="x"
                aria-label="Remove question"
                onClick={() => commitQuestions(questions.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <input
            aria-label="Add a question"
            placeholder="Add a question, press Enter"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newQuestion.trim()) {
                commitQuestions([...questions, { id: newId(), q: newQuestion.trim(), owner: '', done: false }]);
                setNewQuestion('');
              }
            }}
          />
        </div>

        <PairSection
          title="Specs"
          addLabel="Add spec"
          rows={specs.map((s) => [s.k, s.v])}
          onChange={(rows) => commitSpecs(rows.map(([k, v]) => ({ k, v })))}
        />
        <PairSection
          title="Contacts"
          addLabel="Add contact"
          rows={contacts.map((c) => [c.name, c.role])}
          onChange={(rows) => commitContacts(rows.map(([name, role]) => ({ name, role })))}
        />

        <div className="sec">
          <h3>Activity</h3>
          <input
            aria-label="Log an update"
            placeholder="Log an update, press Enter"
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && logText.trim()) {
                const t = logText;
                setLogText('');
                startTransition(() => logOpportunityActivity(deal.id, t));
              }
            }}
          />
          {deal.activity.map((a, i) => (
            <div className="logrow" key={i}>
              <time>{formatDay(a.d)}</time>
              <span>{a.t}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="delete"
          onClick={() => {
            if (window.confirm(`Delete "${dealTitle(deal)}"? This cannot be undone.`)) {
              startTransition(async () => {
                await deleteOpportunity(deal.id);
                onClose();
              });
            }
          }}
        >
          Delete opportunity
        </button>
      </aside>
    </div>
  );
}

function PairSection({
  title,
  addLabel,
  rows,
  onChange
}: {
  title: string;
  addLabel: string;
  rows: [string, string][];
  onChange: (rows: [string, string][]) => void;
}) {
  return (
    <div className="sec">
      <h3>{title}</h3>
      {rows.map(([a, b], i) => (
        <div className="pair" key={i}>
          <input
            aria-label={`${title} label`}
            defaultValue={a}
            onBlur={(e) => e.target.value !== a && onChange(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))}
          />
          <input
            aria-label={`${title} value`}
            defaultValue={b}
            onBlur={(e) => e.target.value !== b && onChange(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))}
          />
          <button type="button" className="x" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...rows, ['', '']])}>
        {addLabel}
      </button>
    </div>
  );
}
