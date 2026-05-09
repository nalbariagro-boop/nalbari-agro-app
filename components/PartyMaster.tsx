'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Party } from '@/types';

type Props = {
  parties: Party[];
  onAdd: (party: Party) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

const blankParty: Party = {
  name: '',
  phone: '',
  area: '',
  bank: '',
  accountNumber: '',
  notes: '',
};

export default function PartyMaster({
  parties,
  onAdd,
  onRefresh,
}: Props) {
  const [form, setForm] = useState<Party>(blankParty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const inputClass =
    'border border-slate-300 rounded-xl px-4 py-3 text-slate-950 font-semibold bg-white placeholder:text-slate-500';

  const resetForm = () => {
    setEditingId(null);
    setForm(blankParty);
    setMessage('');
  };

  const save = async () => {
    setMessage('');

    if (!form.name.trim()) {
      setMessage('Party name is required');
      return;
    }

    if (!editingId) {
      await onAdd(form);
      resetForm();
      return;
    }

    const response = await fetch(`/api/parties/${editingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data?.error || 'Unable to update party');
      return;
    }

    resetForm();
    setMessage('Party updated');
    await onRefresh();
  };

  const update = (
    field: keyof Party,
    value: string
  ) => {
    setForm((p) => ({
      ...p,
      [field]: value,
    }));
  };

  const startEdit = (party: Party) => {
    if (!party.id) {
      return;
    }

    setEditingId(party.id);
    setForm({
      ...blankParty,
      ...party,
    });
    setMessage(`Editing ${party.name}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 p-6 space-y-5 text-slate-950 shadow-sm">
      <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
        <input
          placeholder="Party Name"
          value={form.name}
          onChange={(e) =>
            update('name', e.target.value)
          }
          className={inputClass}
        />

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) =>
            update('phone', e.target.value)
          }
          className={inputClass}
        />

        <input
          placeholder="Village / Area"
          value={form.area}
          onChange={(e) =>
            update('area', e.target.value)
          }
          className={inputClass}
        />

        <input
          placeholder="Bank"
          value={form.bank}
          onChange={(e) =>
            update('bank', e.target.value)
          }
          className={inputClass}
        />

        <input
          placeholder="Account Number"
          value={form.accountNumber}
          onChange={(e) =>
            update('accountNumber', e.target.value)
          }
          className={inputClass}
        />

        <button
          onClick={save}
          className="bg-green-900 text-white rounded-xl px-5 py-3 font-semibold hover:bg-green-800"
        >
          {editingId ? 'Update Party' : 'Save Party'}
        </button>
      </div>

      <textarea
        placeholder="Notes"
        value={form.notes}
        onChange={(e) =>
          update('notes', e.target.value)
        }
        className={`w-full ${inputClass}`}
      />

      {editingId && (
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          <X size={18} />
          Cancel Edit
        </button>
      )}

      {message && (
        <p className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800">
          {message}
        </p>
      )}

      <div className="overflow-auto">
        <table className="w-full text-slate-950">
          <thead className="bg-green-50 text-green-900">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Area</th>
              <th className="p-3 text-left">Bank</th>
              <th className="p-3 text-left">Account No.</th>
              <th className="p-3 text-left">Notes</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {parties.map((p, i) => (
              <tr key={p.id || i} className="border-t border-slate-200">
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3">{p.phone}</td>
                <td className="p-3">{p.area}</td>
                <td className="p-3">{p.bank}</td>
                <td className="p-3">{p.accountNumber}</td>
                <td className="p-3">{p.notes}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
                      aria-label={`Edit ${p.name}`}
                      title="Edit party"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
