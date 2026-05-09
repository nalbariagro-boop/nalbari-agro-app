'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import TimingReport from '@/components/TimingReport';
import TimingDailyReport from '@/components/TimingDailyReport';
import PartyMaster from '@/components/PartyMaster';
import PartyLedger from '@/components/PartyLedger';
import Login from '@/components/Login';
import UserAdmin from '@/components/UserAdmin';
import { AppUser, LedgerEntry, Party, TimingRow, UserRole } from '@/types';

function makeBlank(id: number): TimingRow {
  return {
    id,
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
}

type TimingReportRecord = {
  party?: string;
  partyId?: number;
  lorry?: string;
  challan?: string;
  challanWeight?: string | number;
  challan_weight?: string | number;
  wb?: string | number;
  excess?: string | number;
  short?: string | number;
  accept_qty?: string | number;
  accept?: string | number;
  rate?: string | number;
  fine?: string | number;
  softBanji?: string | number;
  soft_banji?: string | number;
  coarse?: string | number;
  remarks?: string;
  arrival?: string;
};

type TabKey = 'dashboard' | 'timing' | 'report' | 'ledger' | 'party' | 'users';

const roleTabs: Record<UserRole, TabKey[]> = {
  admin: ['dashboard', 'timing', 'report', 'ledger', 'party', 'users'],
  staff: ['timing', 'report', 'party'],
};

function toInputValue(value: string | number | undefined) {
  return value === undefined || value === null ? '' : String(value);
}

export default function Page() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = localStorage.getItem('nalbari-user');

      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored) as AppUser;

        if (
          parsed.username &&
          parsed.email &&
          parsed.role &&
          roleTabs[parsed.role]
        ) {
          setUser(parsed);
          setTab(roleTabs[parsed.role][0]);
        }
      } catch {
        localStorage.removeItem('nalbari-user');
      }
    });
  }, []);

  const [rows, setRows] = useState<TimingRow[]>([
    makeBlank(1),
  ]);

  const [parties, setParties] = useState<Party[]>(
    []
  );

  const [ledger, setLedger] = useState<
    LedgerEntry[]
  >([]);

  const availableTabs = useMemo(
    () => (user ? roleTabs[user.role] : []),
    [user]
  );

  const activeTab = availableTabs.includes(tab)
    ? tab
    : availableTabs[0] || 'dashboard';

  const loadAll = useCallback(async (isActive: () => boolean = () => true) => {
    if (!user) {
      return;
    }

    const [timingResponse, partiesResponse, ledgerResponse] =
      await Promise.all([
        fetch(`/api/timing-reports?date=${date}`),
        fetch('/api/parties'),
        fetch('/api/ledger'),
      ]);

    if (
      !timingResponse.ok ||
      !partiesResponse.ok ||
      !ledgerResponse.ok
    ) {
      if (isActive()) {
        alert('Unable to load data');
      }
      return;
    }

    const timing =
      (await timingResponse.json()) as TimingReportRecord[];

    if (!isActive()) {
      return;
    }

    if (timing?.length) {
      setRows(
        timing.map((r, i: number) => ({
          id: i + 1,
          partyId: r.partyId,
          party: r.party || '',
          lorry: r.lorry || '',
          challan: r.challan || '',
          challanWeight: toInputValue(r.challanWeight ?? r.challan_weight),
          wb: toInputValue(r.wb),
          excess: toInputValue(r.excess),
          short: toInputValue(r.short),
          accept: toInputValue(r.accept ?? r.accept_qty),
          rate: toInputValue(r.rate),
          fine: toInputValue(r.fine),
          softBanji: toInputValue(r.softBanji ?? r.soft_banji),
          coarse: toInputValue(r.coarse),
          remarks: r.remarks || '',
          arrival: r.arrival || '',
        }))
      );
    } else {
      setRows([makeBlank(1)]);
    }

    const p = await partiesResponse.json();

    setParties(p || []);

    const l = await ledgerResponse.json();

    setLedger(l || []);
  }, [date, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void Promise.resolve().then(() => loadAll(() => active));

    return () => {
      active = false;
    };
  }, [loadAll, user]);

  const login = (nextUser: AppUser) => {
    localStorage.setItem('nalbari-user', JSON.stringify(nextUser));
    setUser(nextUser);
    setTab(roleTabs[nextUser.role][0]);
  };

  const logout = () => {
    localStorage.removeItem('nalbari-user');
    void fetch('/api/logout', {
      method: 'POST',
    });
    setUser(null);
    setTab('dashboard');
  };

  const addParty = async (party: Party) => {
    const response = await fetch('/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(party),
    });

    if (!response.ok) {
      alert('Unable to save party');
      return;
    }

    loadAll();
  };

  const refreshParties = async () => {
    await loadAll();
  };

  const addPayment = async (
    partyId: number | undefined,
    party: string,
    amount: number,
    type: 'Cash' | 'Bank' | 'UPI' | 'Cheque',
    reference?: string
  ) => {
    const response = await fetch('/api/ledger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        partyId,
        party,
        amount,
        type,
        reference,
      }),
    });

    if (!response.ok) {
      alert('Unable to save payment');
      return;
    }

    loadAll();
  };

  const totals = useMemo(() => {
    const totalLeaf = rows.reduce(
      (a, b) => a + (+b.accept || 0),
      0
    );

    const totalPayable = rows.reduce(
      (a, b) => a + (+b.accept || 0),
      0
    );

    let outstanding = 0;

    ledger.forEach((l) => {
      outstanding +=
        (+l.debit || 0) - (+l.credit || 0);
    });

    return {
      totalLeaf,
      totalPayable,
      outstanding,
    };
  }, [rows, ledger]);

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[98vw] mx-auto space-y-6">
        <Header user={user} onLogout={logout} />

        <div className="flex gap-3 flex-wrap">
          {availableTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 rounded-2xl font-semibold transition ${
                activeTab === t
                  ? 'bg-green-900 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard
            totalLeaf={totals.totalLeaf}
            totalPayable={totals.totalPayable}
            outstanding={totals.outstanding}
            totalParties={parties.length}
          />
        )}

        {activeTab === 'timing' && (
          <TimingReport
            date={date}
            setDate={setDate}
            rows={rows}
            setRows={setRows}
            parties={parties}
            onSave={loadAll}
          />
        )}

        {activeTab === 'report' && (
          <TimingDailyReport
            date={date}
            setDate={setDate}
          />
        )}

        {activeTab === 'ledger' && (
          <PartyLedger
            ledger={ledger}
            parties={parties}
            onAddPayment={addPayment}
          />
        )}

        {activeTab === 'party' && (
          <PartyMaster
            parties={parties}
            onAdd={addParty}
            onRefresh={refreshParties}
          />
        )}

        {activeTab === 'users' && (
          <UserAdmin />
        )}
      </div>
    </div>
  );
}
