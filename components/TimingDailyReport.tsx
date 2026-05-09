'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ClipboardList } from 'lucide-react';

type Props = {
  date: string;
  setDate: (value: string) => void;
};

type DailyReport = {
  date: string;
  entries: number;
  parties: number;
  totals: {
    challanWeight: number;
    wb: number;
    excess: number;
    short: number;
    acceptableQuantity: number;
    fine: number;
    softBanji: number;
    coarse: number;
  };
  leafCountAverages: {
    fine: number;
    softBanji: number;
    coarse: number;
  };
  avgRatePerKg: number;
  latestArrival: string;
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-100';

function formatNumber(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pieGradient(rows: { value: number; pieColor: string }[]) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (!total) {
    return 'conic-gradient(#e2e8f0 0deg 360deg)';
  }

  let start = 0;

  return `conic-gradient(${rows
    .map((row) => {
      const degrees = (row.value / total) * 360;
      const end = start + degrees;
      const slice = `${row.pieColor} ${start}deg ${end}deg`;
      start = end;
      return slice;
    })
    .join(', ')})`;
}

export default function TimingDailyReport({
  date,
  setDate,
}: Props) {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [chart, setChart] = useState<'weight' | 'leaf'>('weight');
  const [message, setMessage] = useState('');

  const fetchReport = useCallback(async () => {
    const response = await fetch(
      `/api/timing-reports/daily-report?date=${date}`
    );

    if (!response.ok) {
      throw new Error('Unable to load daily report');
    }

    return (await response.json()) as DailyReport;
  }, [date]);

  useEffect(() => {
    let active = true;

    void Promise.resolve()
      .then(fetchReport)
      .then((nextReport) => {
        if (active) {
          setReport(nextReport);
          setMessage('');
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load daily report'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [fetchReport]);

  const weightBars = [
    {
      label: 'Challan Weight',
      value: report?.totals.challanWeight || 0,
      color: 'bg-green-800',
      pieColor: '#166534',
    },
    {
      label: 'WB Kg',
      value: report?.totals.wb || 0,
      color: 'bg-teal-700',
      pieColor: '#0f766e',
    },
    {
      label: 'Excess',
      value: report?.totals.excess || 0,
      color: 'bg-amber-600',
      pieColor: '#d97706',
    },
    {
      label: 'Short',
      value: report?.totals.short || 0,
      color: 'bg-red-600',
      pieColor: '#dc2626',
    },
    {
      label: 'Acceptable Quantity',
      value: report?.totals.acceptableQuantity || 0,
      color: 'bg-emerald-600',
      pieColor: '#059669',
    },
  ];

  const leafBars = [
    {
      label: 'Fine Avg %',
      value: report?.leafCountAverages.fine || 0,
      color: 'bg-green-800',
      pieColor: '#166534',
    },
    {
      label: 'Soft Banji Avg %',
      value: report?.leafCountAverages.softBanji || 0,
      color: 'bg-sky-700',
      pieColor: '#0369a1',
    },
    {
      label: 'Coarse Avg %',
      value: report?.leafCountAverages.coarse || 0,
      color: 'bg-amber-700',
      pieColor: '#b45309',
    },
  ];

  const chartRows = chart === 'weight' ? weightBars : leafBars;
  const maxValue = Math.max(...chartRows.map((row) => row.value), 1);
  const totalChartValue = chartRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="space-y-5 text-slate-950">
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
              <CalendarDays size={16} />
              Report Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-center gap-3 rounded-lg bg-green-100 px-4 py-3 text-sm font-bold text-green-950">
            <ClipboardList size={18} />
            Daily Timing Report
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm font-bold text-red-700">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Entries" value={String(report?.entries || 0)} />
          <Summary label="Parties" value={String(report?.parties || 0)} />
          <Summary
            label="Challan Weight"
            value={`${formatNumber(report?.totals.challanWeight || 0)} kg`}
          />
          <Summary
            label="WB Kg"
            value={`${formatNumber(report?.totals.wb || 0)} kg`}
          />
          <Summary
            label="Excess"
            value={`${formatNumber(report?.totals.excess || 0)} kg`}
          />
          <Summary
            label="Short"
            value={`${formatNumber(report?.totals.short || 0)} kg`}
          />
          <Summary
            label="Acceptable Quantity"
            value={`${formatNumber(report?.totals.acceptableQuantity || 0)} kg`}
          />
          <Summary
            label="Latest Arrival"
            value={report?.latestArrival || '-'}
          />
          <Summary
            label="Avg Rate / Kg"
            value={`₹ ${formatNumber(report?.avgRatePerKg || 0)}`}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Summary
            label="Fine Avg %"
            value={formatNumber(report?.leafCountAverages.fine || 0)}
          />
          <Summary
            label="Soft Banji Avg %"
            value={formatNumber(report?.leafCountAverages.softBanji || 0)}
          />
          <Summary
            label="Coarse Avg %"
            value={formatNumber(report?.leafCountAverages.coarse || 0)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-green-950">
              Report Chart
            </h2>
            <p className="text-sm font-semibold text-slate-700">
              Visual comparison for the selected day.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setChart('weight')}
              className={`rounded-md px-4 py-2 text-sm font-bold ${
                chart === 'weight'
                  ? 'bg-green-900 text-white'
                  : 'text-slate-800 hover:bg-white'
              }`}
            >
              Weight
            </button>
            <button
              type="button"
              onClick={() => setChart('leaf')}
              className={`rounded-md px-4 py-2 text-sm font-bold ${
                chart === 'leaf'
                  ? 'bg-green-900 text-white'
                  : 'text-slate-800 hover:bg-white'
              }`}
            >
              Leaf Count
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
          <div className="flex items-center justify-center">
            <div
              className="relative h-56 w-56 rounded-full border border-slate-300 shadow-inner"
              style={{
                background: pieGradient(chartRows),
              }}
              aria-label={`${chart} pie chart`}
            >
              <div className="absolute inset-12 flex flex-col items-center justify-center rounded-full border border-slate-200 bg-white text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Total
                </span>
                <span className="text-xl font-bold text-green-950">
                  {formatNumber(totalChartValue)}
                </span>
                <span className="text-xs font-bold text-slate-600">
                  {chart === 'weight' ? 'kg' : '%'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {chartRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: row.pieColor }}
                    />
                    {row.label}
                  </span>
                  <span className="text-sm font-bold text-green-950">
                    {formatNumber(row.value)}
                    {chart === 'weight' ? ' kg' : '%'}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{
                      width: `${Math.max(4, (row.value / maxValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-green-950">
        {value}
      </div>
    </div>
  );
}
