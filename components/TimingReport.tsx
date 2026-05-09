'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Party, TimingRow } from '@/types';

type Props = {
  date: string;
  setDate: (v: string) => void;
  rows: TimingRow[];
  setRows: (rows: TimingRow[]) => void;
  parties: Party[];
  onSave: () => void | Promise<void>;
};

type EntryField = {
  field: keyof TimingRow;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
};

type PaginatedEntries = {
  data: TimingRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const blankEntry: TimingRow = {
  partyId: undefined,
  party: '',
  lorry: '',
  challan: '',
  challanWeight: '',
  wb: '',
  excess: '',
  short: '',
  accept: '',
  rate: '',
  fine: '',
  softBanji: '',
  coarse: '',
  remarks: '',
  arrival: '',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-green-700 focus:ring-4 focus:ring-green-100';

const readOnlyClass =
  'w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-950 outline-none';

const detailFields: EntryField[] = [
  {
    field: 'lorry',
    label: 'Lorry No.',
    placeholder: 'AS 01 AB 1234',
  },
  {
    field: 'challanWeight',
    label: 'Challan Weight',
    placeholder: '0.00',
    type: 'number',
  },
  {
    field: 'wb',
    label: 'WB Kg',
    placeholder: '0.00',
    type: 'number',
    required: true,
  },
  {
    field: 'excess',
    label: 'Excess',
    placeholder: '0.00',
    type: 'number',
  },
  {
    field: 'short',
    label: 'Short %',
    placeholder: '0',
    type: 'number',
  },
  {
    field: 'accept',
    label: 'Acceptable Quantity',
    type: 'number',
    readOnly: true,
  },
  {
    field: 'rate',
    label: 'Rate',
    placeholder: '0.00',
    type: 'number',
  },
  {
    field: 'arrival',
    label: 'Time of arrival at factory',
    type: 'time',
  },
];

const leafFields: EntryField[] = [
  {
    field: 'fine',
    label: 'Fine',
    placeholder: '0',
    type: 'number',
  },
  {
    field: 'softBanji',
    label: 'Soft Banji',
    placeholder: '0',
    type: 'number',
  },
  {
    field: 'coarse',
    label: 'Coarse',
    placeholder: '0',
    type: 'number',
  },
];

function calculateAcceptableQuantity(wbValue: string, shortValue: string) {
  const wb = Number(wbValue || 0);
  const short = Number(shortValue || 0);

  if (!Number.isFinite(wb) || wb <= 0) {
    return '';
  }

  if (!Number.isFinite(short) || short <= 0) {
    return wb.toFixed(2);
  }

  return (wb - (wb * short) / 100).toFixed(2);
}

export default function TimingReport({
  date,
  setDate,
  rows,
  setRows,
  parties,
  onSave,
}: Props) {
  const [formOpen, setFormOpen] = useState(true);
  const [form, setForm] = useState<TimingRow>(blankEntry);
  const [entries, setEntries] = useState<TimingRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TimingRow | null>(null);
  const [partyNoticeOpen, setPartyNoticeOpen] = useState(false);
  const [message, setMessage] = useState('');

  const pageSize = 8;

  const fetchEntries = useCallback(async () => {
    const response = await fetch(
      `/api/timing-reports?date=${date}&page=${page}&pageSize=${pageSize}`
    );

    if (!response.ok) {
      throw new Error('Unable to load timing entries');
    }

    return (await response.json()) as PaginatedEntries;
  }, [date, page]);

  useEffect(() => {
    let active = true;

    void Promise.resolve()
      .then(fetchEntries)
      .then((result) => {
        if (!active) {
          return;
        }

        setEntries(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalEntries(result.pagination.total);
      })
      .catch((error) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load timing entries'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [fetchEntries]);

  const nextSerial = useMemo(
    () => totalEntries + 1,
    [totalEntries]
  );

  const update = (field: keyof TimingRow, value: string) => {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'wb' || field === 'short') {
        next.accept = calculateAcceptableQuantity(
          field === 'wb' ? value : next.wb,
          field === 'short' ? value : next.short
        );
      }

      return next;
    });
  };

  const updateParty = (partyId: string) => {
    const party = parties.find((item) => item.id === Number(partyId));

    setForm((current) => ({
      ...current,
      partyId: party?.id,
      party: party?.name || '',
    }));
  };

  const refreshEntries = async () => {
    const result = await fetchEntries();

    setEntries(result.data);
    setTotalPages(result.pagination.totalPages);
    setTotalEntries(result.pagination.total);
  };

  const startEdit = (row: TimingRow) => {
    if (!row.id) {
      return;
    }

    setEditingId(row.id);
    setForm({
      ...blankEntry,
      ...row,
      accept: calculateAcceptableQuantity(row.wb, row.short),
    });
    setFormOpen(true);
    setMessage(`Editing Sl.No. ${row.serial || row.id}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankEntry);
    setMessage('');
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!form.party.trim()) {
      setPartyNoticeOpen(true);
      setMessage('Please create/select a party first.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/timing-reports/${editingId}`
          : '/api/timing-reports',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date,
            ...form,
            accept: calculateAcceptableQuantity(form.wb, form.short),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to save timing entry');
      }

      const saved = (await response.json()) as TimingRow;

      setRows([...rows.filter((row) => row.party), saved, blankEntry]);
      setForm(blankEntry);
      setEditingId(null);
      setMessage(
        editingId ? 'Timing entry updated.' : 'Timing entry saved.'
      );
      await onSave();

      if (page !== 1 && !editingId) {
        setPage(1);
      } else {
        await refreshEntries();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save timing entry'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    if (!pendingDelete?.id) {
      return;
    }

    setDeletingId(pendingDelete.id);
    setMessage('');

    try {
      const response = await fetch(`/api/timing-reports/${pendingDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to delete timing entry');
      }

      if (editingId === pendingDelete.id) {
        cancelEdit();
      }

      setPendingDelete(null);
      setMessage('Timing entry deleted.');
      await onSave();

      if (entries.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await refreshEntries();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete timing entry'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const renderField = (field: EntryField) => (
    <label
      key={field.field}
      className="space-y-2"
    >
      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {field.label}
      </span>
      <input
        required={field.required}
        readOnly={field.readOnly}
        type={field.type || 'text'}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        step={field.type === 'number' ? '0.01' : undefined}
        value={form[field.field] || ''}
        placeholder={field.placeholder}
        onChange={(event) => update(field.field, event.target.value)}
        className={field.readOnly ? readOnlyClass : inputClass}
      />
    </label>
  );

  return (
    <div className="space-y-5 text-slate-950">
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
              <CalendarDays size={16} />
              Entry Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setPage(1);
                setDate(event.target.value);
              }}
              className={inputClass}
            />
          </label>

          <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Saved Entries
            </div>
            <div className="mt-1 text-xl font-bold text-green-950">
              {totalEntries}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700">
              {editingId ? 'Edit Timing Entry' : 'New Timing Entry'}
            </span>
            <span className="text-lg font-bold text-green-950">
              {editingId ? 'Update saved entry' : `Sl.No. ${nextSerial}`}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 font-bold text-green-950">
            <Plus size={18} />
            {formOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>

        {formOpen && (
          <form
            onSubmit={saveEntry}
            className="border-t border-slate-300 p-5"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Party Name
                </span>
                <select
                  required
                  value={form.partyId || ''}
                  onFocus={() => {
                    if (!parties.length) {
                      setPartyNoticeOpen(true);
                    }
                  }}
                  onChange={(event) => updateParty(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select party</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </label>
              {detailFields.map(renderField)}
            </div>

            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="text-sm font-bold text-green-950">
                Leaf Count %
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {leafFields.map(renderField)}
              </div>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Remarks
              </span>
              <textarea
                value={form.remarks}
                onChange={(event) => update('remarks', event.target.value)}
                placeholder="Add remarks"
                rows={3}
                className={inputClass}
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {message && (
                <p className="text-sm font-bold text-slate-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-900 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Entry'
                    : 'Save Entry'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-green-950">
            Entries for {date}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-800 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-28 text-center text-sm font-bold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-800 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[1300px] text-sm text-slate-950">
            <thead className="bg-green-100 text-green-950">
              <tr>
                <th className="p-3 text-left">Sl.No.</th>
                <th className="p-3 text-left">Party Name</th>
                <th className="p-3 text-left">Lorry No.</th>
                <th className="p-3 text-right">Challan Weight</th>
                <th className="p-3 text-right">WB Kg</th>
                <th className="p-3 text-right">Excess</th>
                <th className="p-3 text-right">Short %</th>
                <th className="p-3 text-right">Acceptable Quantity</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-left">Arrival</th>
                <th className="p-3 text-left">Entered By</th>
                <th className="p-3 text-left">Leaf Count %</th>
                <th className="p-3 text-left">Remarks</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, index) => (
                <tr
                  key={`${row.id || index}-${row.party}`}
                  className="border-t border-slate-200"
                >
                  <td className="p-3 font-bold">
                    {row.serial || (page - 1) * pageSize + index + 1}
                  </td>
                  <td className="p-3 font-semibold">{row.party}</td>
                  <td className="p-3">{row.lorry}</td>
                  <td className="p-3 text-right">{row.challanWeight}</td>
                  <td className="p-3 text-right">{row.wb}</td>
                  <td className="p-3 text-right">{row.excess}</td>
                  <td className="p-3 text-right">{row.short}</td>
                  <td className="p-3 text-right font-bold text-green-950">
                    {row.accept}
                  </td>
                  <td className="p-3 text-right">{row.rate}</td>
                  <td className="p-3">{row.arrival}</td>
                  <td className="p-3 font-semibold">
                    {row.username || (row.userId ? `User ${row.userId}` : '-')}
                  </td>
                  <td className="p-3">
                    Fine {row.fine || 0}, Soft Banji {row.softBanji || 0},
                    Coarse {row.coarse || 0}
                  </td>
                  <td className="p-3">{row.remarks}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
                        aria-label={`Edit entry ${row.serial || row.id}`}
                        title="Edit entry"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(row)}
                        disabled={deletingId === row.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
                        aria-label={`Delete entry ${row.serial || row.id}`}
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!entries.length && (
                <tr>
                  <td
                    colSpan={14}
                    className="p-6 text-center font-semibold text-slate-700"
                  >
                    No timing entries saved for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete timing entry?"
        message={`Are you sure you want to delete Sl.No. ${
          pendingDelete?.serial || pendingDelete?.id || ''
        }${pendingDelete?.party ? ` for ${pendingDelete.party}` : ''}?`}
        loading={Boolean(deletingId)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteEntry}
      />
      <ConfirmDialog
        open={partyNoticeOpen}
        title="Party required"
        message="Please make an entry in the Party tab first, then select that party while creating the timing entry."
        confirmLabel="OK"
        cancelLabel="Close"
        onCancel={() => setPartyNoticeOpen(false)}
        onConfirm={() => setPartyNoticeOpen(false)}
      />
    </div>
  );
}
