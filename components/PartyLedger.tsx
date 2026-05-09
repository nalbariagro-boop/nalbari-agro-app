'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CreditCard, Plus, X } from 'lucide-react';
import { LedgerEntry, Party } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Props = {
  ledger: LedgerEntry[];
  parties: Party[];
  onAddPayment: (
    partyId: number | undefined,
    party: string,
    amount: number,
    type: 'Cash' | 'Bank' | 'UPI' | 'Cheque',
    reference?: string
  ) => void;
};

export default function PartyLedger({
  ledger,
  parties,
  onAddPayment,
}: Props) {
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] =
    useState<'Cash' | 'Bank' | 'UPI' | 'Cheque'>('Cash');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');

  const selectedParty = parties.find(
    (party) => party.id === Number(selectedPartyId)
  );

  const filtered = useMemo(() => {
    return ledger
      .filter((entry) =>
        selectedParty
          ? entry.partyId === selectedParty.id || entry.party === selectedParty.name
          : true
      )
      .filter((entry) => (fromDate ? entry.txn_date >= fromDate : true))
      .filter((entry) => (toDate ? entry.txn_date <= toDate : true))
      .sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  }, [ledger, selectedParty, fromDate, toDate]);

  const rows = filtered.reduce<
    (LedgerEntry & { balance: number })[]
  >((acc, entry) => {
    const previous = acc[acc.length - 1]?.balance || 0;
    const balance = previous + (+entry.debit || 0) - (+entry.credit || 0);

    return [...acc, { ...entry, balance }];
  }, []);

  const totals = rows.reduce(
    (acc, row) => ({
      purchase: acc.purchase + (+row.debit || 0),
      paid: acc.paid + (+row.credit || 0),
    }),
    { purchase: 0, paid: 0 }
  );

  const outstanding = totals.purchase - totals.paid;
  const inputClass =
    'border border-slate-300 bg-white rounded-xl px-4 py-3 text-slate-950 font-semibold placeholder:text-slate-500';
  const actionButtonClass =
    'bg-white border border-slate-300 text-slate-900 px-5 py-3 rounded-xl font-semibold hover:bg-slate-50';

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!selectedParty) {
      setMessage('Select party first');
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a valid payment amount');
      return;
    }

    onAddPayment(
      selectedParty.id,
      selectedParty.name,
      amount,
      paymentMode,
      reference
    );
    setPaymentAmount('');
    setReference('');
    setPaymentOpen(false);
    setMessage('Payment marked as paid');
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Ledger - ${selectedParty?.name || 'All Parties'}`, 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Party', 'Description', 'Type', 'Debit', 'Credit', 'Balance']],
      body: rows.map((row) => [
        row.txn_date,
        row.party,
        row.description,
        row.txn_type,
        row.debit,
        row.credit,
        row.balance,
      ]),
    });

    doc.save('ledger.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, 'ledger.xlsx');
  };

  return (
    <div className="space-y-5 text-slate-950">
      <div className="bg-white rounded-2xl border border-slate-300 p-4 flex gap-3 flex-wrap items-center shadow-sm">
        <select
          value={selectedPartyId}
          onChange={(event) => setSelectedPartyId(event.target.value)}
          className={`${inputClass} min-w-[240px]`}
        >
          <option value="">All Parties</option>
          {parties.map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className={inputClass}
        />

        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className={inputClass}
        />

        <button
          onClick={() => setPaymentOpen((open) => !open)}
          className="inline-flex items-center gap-2 bg-green-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-800"
        >
          {paymentOpen ? <X size={18} /> : <Plus size={18} />}
          Add Payment
        </button>

        <button onClick={exportPdf} className={actionButtonClass}>
          PDF
        </button>

        <button onClick={exportExcel} className={actionButtonClass}>
          Excel
        </button>
      </div>

      {paymentOpen && (
        <form
          onSubmit={submitPayment}
          className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-green-950">
            <CreditCard size={18} />
            Mark Payment Paid
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={selectedParty?.name || ''}
              readOnly
              placeholder="Select party above"
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              placeholder="Amount paid"
              className={inputClass}
            />
            <select
              value={paymentMode}
              onChange={(event) =>
                setPaymentMode(event.target.value as 'Cash' | 'Bank' | 'UPI' | 'Cheque')
              }
              className={inputClass}
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Reference / note"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-green-900 px-5 py-3 font-semibold text-white hover:bg-green-800"
          >
            Mark Paid
          </button>
        </form>
      )}

      {message && (
        <p className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
          {message}
        </p>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <Card title="Total Leaf Dues" value={`₹ ${totals.purchase.toFixed(2)}`} />
        <Card title="Total Paid" value={`₹ ${totals.paid.toFixed(2)}`} />
        <Card title="Outstanding" value={`₹ ${outstanding.toFixed(2)}`} />
        <Card
          title="Avg Rate / Kg"
          value={`₹ ${
            rows.reduce((sum, row) => sum + (+row.debit || 0), 0) && rows.length
              ? (totals.purchase / Math.max(1, rows.filter((row) => row.debit).length)).toFixed(2)
              : '0.00'
          }`}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-300 overflow-auto shadow-sm">
        <table className="w-full min-w-[900px] text-slate-950">
          <thead className="bg-green-50 text-green-900">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Party</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th className="p-3 text-right">Balance</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id || index}-${row.description}`} className="border-t border-slate-200">
                <td className="p-3">{row.txn_date}</td>
                <td className="p-3 font-semibold">{row.party}</td>
                <td className="p-3">{row.description}</td>
                <td className="p-3">{row.txn_type}</td>
                <td className="p-3 text-right">{Number(row.debit).toFixed(2)}</td>
                <td className="p-3 text-right">{Number(row.credit).toFixed(2)}</td>
                <td className="p-3 text-right font-semibold">{row.balance.toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="p-6 text-center font-semibold text-slate-700">
                  No ledger entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm">
      <p className="text-slate-700 text-sm font-semibold">
        {title}
      </p>
      <p className="text-2xl font-bold text-green-900 mt-2">
        {value}
      </p>
    </div>
  );
}
