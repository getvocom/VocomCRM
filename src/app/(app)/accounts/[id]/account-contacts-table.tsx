'use client';

import { useTransition } from 'react';
import { addAccountContact, deleteAccountContact, updateAccountContact } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import type { AccountContact } from '@/lib/types';

function Cell({
  value,
  onChange,
  width = 'w-full'
}: {
  value: string | null;
  onChange: (value: string) => Promise<void>;
  width?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="text"
      defaultValue={value ?? ''}
      disabled={isPending}
      onBlur={(e) => {
        if (e.target.value !== (value ?? '')) startTransition(() => onChange(e.target.value));
      }}
      className={`${width} cell-input`}
    />
  );
}

export function AccountContactsTable({ accountId, contacts }: { accountId: string; contacts: AccountContact[] }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Job Title</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>
                <Cell value={contact.name} onChange={(name) => updateAccountContact(contact.id, accountId, { name })} />
              </td>
              <td>
                <Cell
                  value={contact.job_title}
                  onChange={(job_title) => updateAccountContact(contact.id, accountId, { job_title })}
                />
              </td>
              <td>
                <Cell value={contact.email} onChange={(email) => updateAccountContact(contact.id, accountId, { email })} />
              </td>
              <td>
                <Cell value={contact.phone} onChange={(phone) => updateAccountContact(contact.id, accountId, { phone })} />
              </td>
              <td>
                <Cell value={contact.notes} onChange={(notes) => updateAccountContact(contact.id, accountId, { notes })} />
              </td>
              <td>
                <DeleteButton
                  onDelete={() => deleteAccountContact(contact.id, accountId)}
                  confirmMessage={`Delete ${contact.name || 'this contact'}? This can't be undone.`}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} className="px-4 py-3">
              <form
                action={(formData) => addAccountContact(accountId, formData)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="name"
                  placeholder="Name"
                  required
                  className="w-32 field h-8"
                />
                <input
                  name="job_title"
                  placeholder="Job title"
                  className="w-36 field h-8"
                />
                <input
                  name="email"
                  placeholder="Email"
                  className="w-44 field h-8"
                />
                <input
                  name="phone"
                  placeholder="Phone"
                  className="w-32 field h-8"
                />
                <input
                  name="notes"
                  placeholder="Notes"
                  className="w-40 field h-8"
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  Add
                </button>
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
