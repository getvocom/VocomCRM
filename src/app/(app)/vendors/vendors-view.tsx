'use client';

import { useEffect, useState, useTransition } from 'react';
import { addVendor, deleteVendor, updateVendor } from '@/app/actions';
import { PageHeader } from '@/components/ui';
import {
  VENDOR_KINDS,
  VENDOR_RELATIONSHIPS,
  type DealContactRef,
  type Vendor,
  type VendorKind,
  type VendorRelationship
} from '@/lib/types';

export function VendorsView({ vendors, quoteCounts }: { vendors: Vendor[]; quoteCounts: Record<string, number> }) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('All');
  const [relationship, setRelationship] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();

  const q = search.trim().toLowerCase();
  const shown = vendors.filter(
    (v) =>
      (kind === 'All' || v.kind === kind) &&
      (relationship === 'All' || v.relationship === relationship) &&
      (!q || [v.name, v.products, v.location, v.notes, ...v.aliases].filter(Boolean).some((f) => f!.toLowerCase().includes(q)))
  );
  const open = vendors.find((v) => v.id === openId) ?? null;

  return (
    <div className="opp">
      <PageHeader
        group="Sales"
        title="Vendors"
        description={
          <>
            Suppliers and partners we quote from: manufacturers, trading companies, optics makers and site owners.{' '}
            {vendors.length} on file.
          </>
        }
        actions={
        <form
          className="tools"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            start(async () => {
              const id = await addVendor({ name, kind: null, relationship: 'Prospect' });
              setName('');
              if (id) setOpenId(id);
            });
          }}
        >
          <input className="search" placeholder="New vendor name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New vendor name" />
          <button type="submit" className="btn primary" disabled={pending || !name.trim()}>
            + Add vendor
          </button>
        </form>
        }
      />

      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search vendors, products, locations…"
          aria-label="Search vendors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
          <option value="All">Kind: any</option>
          {VENDOR_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)} aria-label="Relationship">
          <option value="All">Relationship: any</option>
          {VENDOR_RELATIONSHIPS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <span className="count">{shown.length} shown</span>
      </div>

      {shown.length === 0 ? (
        <p className="muted">No vendors match.</p>
      ) : (
        <div className="vgrid">
          {shown.map((v) => (
            <button type="button" key={v.id} className="vcard" onClick={() => setOpenId(v.id)}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b style={{ fontSize: 15, fontWeight: 600 }}>{v.name}</b>
                {v.relationship && (
                  <span className={`chip ${v.relationship === 'Active' ? 'ok' : v.relationship === 'Prospect' ? 'warn' : ''}`}>{v.relationship}</span>
                )}
              </span>
              <span className="muted">{[v.kind, v.location].filter(Boolean).join(' · ')}</span>
              {v.products && <p className="vprod">{v.products}</p>}
              <span className="muted">
                {quoteCounts[v.id] ? `${quoteCounts[v.id]} opportunit${quoteCounts[v.id] === 1 ? 'y' : 'ies'}` : 'No opportunities yet'}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && <VendorDrawer key={open.id} vendor={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function VendorDrawer({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [, start] = useTransition();
  const save = (fields: Parameters<typeof updateVendor>[1]) => start(() => updateVendor(vendor.id, fields));
  const [aliases, setAliases] = useState(vendor.aliases.join(', '));
  const [contacts, setContacts] = useState<DealContactRef[]>(vendor.contacts);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commitContacts = (next: DealContactRef[]) => {
    setContacts(next);
    save({ contacts: next });
  };

  return (
    <div className="opp-overlay" onClick={onClose}>
      <aside className="opp-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Vendor details">
        <button type="button" className="closebtn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="eyebrow">Vendor</div>
        <input
          aria-label="Vendor name"
          style={{ fontSize: 20, fontWeight: 600 }}
          defaultValue={vendor.name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== vendor.name && save({ name: e.target.value.trim() })}
        />
        <div className="row2">
          <label className="f">
            Kind
            <select value={vendor.kind ?? ''} onChange={(e) => save({ kind: (e.target.value || null) as VendorKind | null })}>
              <option value="">—</option>
              {VENDOR_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="f">
            Relationship
            <select
              value={vendor.relationship ?? ''}
              onChange={(e) => save({ relationship: (e.target.value || null) as VendorRelationship | null })}
            >
              <option value="">—</option>
              {VENDOR_RELATIONSHIPS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="f">
          Location
          <input defaultValue={vendor.location ?? ''} onBlur={(e) => e.target.value !== (vendor.location ?? '') && save({ location: e.target.value.trim() || null })} />
        </label>
        <label className="f">
          Products
          <textarea defaultValue={vendor.products ?? ''} onBlur={(e) => e.target.value !== (vendor.products ?? '') && save({ products: e.target.value.trim() || null })} />
        </label>
        <label className="f">
          Terms
          <textarea defaultValue={vendor.terms ?? ''} onBlur={(e) => e.target.value !== (vendor.terms ?? '') && save({ terms: e.target.value.trim() || null })} />
        </label>
        <label className="f">
          Notes
          <textarea defaultValue={vendor.notes ?? ''} onBlur={(e) => e.target.value !== (vendor.notes ?? '') && save({ notes: e.target.value.trim() || null })} />
        </label>
        <label className="f">
          Also known as (comma separated)
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            onBlur={() =>
              save({
                aliases: aliases
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
              })
            }
          />
        </label>
        <div className="sec">
          <h3>Contacts</h3>
          {contacts.map((c, i) => (
            <div className="pair" key={i}>
              <input
                aria-label="Contact name"
                defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && commitContacts(contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <input
                aria-label="Contact role"
                defaultValue={c.role}
                onBlur={(e) => e.target.value !== c.role && commitContacts(contacts.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
              />
              <button type="button" className="x" aria-label="Remove contact" onClick={() => commitContacts(contacts.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="add" onClick={() => commitContacts([...contacts, { name: '', role: '' }])}>
            Add contact
          </button>
        </div>
        <button
          type="button"
          className="delete"
          onClick={() => {
            if (window.confirm(`Delete vendor "${vendor.name}"?`)) {
              start(async () => {
                await deleteVendor(vendor.id);
                onClose();
              });
            }
          }}
        >
          Delete vendor
        </button>
      </aside>
    </div>
  );
}
