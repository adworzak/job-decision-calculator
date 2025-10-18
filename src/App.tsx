import React, { useState, useMemo, useRef, useEffect } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

function incomeTaxAU_2024_25(taxable: number): number {
  if (taxable <= 18200) return 0;
  if (taxable <= 45000) return (taxable - 18200) * 0.16;
  if (taxable <= 135000) return 4288 + (taxable - 45000) * 0.30;
  if (taxable <= 190000) return 31288 + (taxable - 135000) * 0.37;
  return 51638 + (taxable - 190000) * 0.45;
}

function netIncome(income: number) {
  const tax = incomeTaxAU_2024_25(income);
  const medicare = income * 0.02; // 2% Medicare levy
  const totalTax = tax + medicare;
  return income - totalTax;
}

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function JobDecisionLossCalculator() {
  const [offeredJob, setOfferedJob] = useState<string>("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState<string>("");

  const parse = (v: string) => {
    const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : 0;
  };

  const offered = parse(offeredJob);
  const expenses = parse(monthlyExpenses);
  const opening = parse(openingBalance);

  const offeredNetMonthly = netIncome(offered) / 12;

  const data = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const month = i + 1;
      const cumulativeLoss = offeredNetMonthly * month; // bars: forgone income only
      const remainingBalance = opening - expenses * month; // line: savings runway
      const depleted = remainingBalance <= 0;
      return { month, cumulativeLoss, remainingBalance, depleted };
    });
  }, [offeredNetMonthly, opening, expenses]);

  const runOutMonth = useMemo(() => {
    const idx = data.findIndex((d) => d.remainingBalance <= 0);
    return idx === -1 ? null : data[idx].month;
  }, [data]);

  const getLoss = (months: number) => offeredNetMonthly * months; // KPIs exclude expenses

  const chartSectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (runOutMonth && chartSectionRef.current) {
      chartSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [runOutMonth]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">Job Decision: Waiting vs Accepting</h1>
          <p className="text-sm text-gray-600 mt-1">
            Bars show the <strong>cumulative after‑tax income you forgo</strong> by not accepting the offer. The line shows your <strong>opening balance after monthly expenses</strong>.
            Uses 2024–25 Australian resident tax rates (Stage 3) with Medicare levy (2%).
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-medium mb-4">Inputs</h2>

            <label className="block text-sm mb-2">Offered role salary (AUD)</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 80,000"
              value={offeredJob}
              onChange={(e) => setOfferedJob(e.target.value)}
            />

            <label className="block text-sm mt-4 mb-2">Monthly expenses (AUD)</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 3,000"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(e.target.value)}
            />

            <label className="block text-sm mt-4 mb-2">Opening bank balance (AUD)</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 20,000"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />

            <p className="text-xs text-gray-500 mt-3">
              Inputs are <strong>before tax</strong> (excluding super). Expenses are your monthly outgoings while unemployed.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-3">
            <h2 className="text-lg font-medium mb-2">Key Figures (forgone income only)</h2>
            {[3, 6, 9, 12, 18].map((m) => (
              <KPI key={m} label={`${m}‑month cumulative loss`} value={fmt(getLoss(m))} />
            ))}

            {runOutMonth && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 px-3 py-1 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                Savings run out in <strong className="ml-1">month {runOutMonth}</strong>
              </div>
            )}
          </div>
        </section>

        <section ref={chartSectionRef} className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-4">Cumulative Loss vs Savings Runway</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmt(v), name === "cumulativeLoss" ? "Forgone income" : name === "remainingBalance" ? "Remaining balance" : name]}
                  labelFormatter={(m) => `Month ${m}`}
                />
                <Bar dataKey="cumulativeLoss" radius={[8, 8, 0, 0]} name="Forgone income">
                  {data.map((d, idx) => (
                    <Cell key={`cell-${idx}`} fill={d.remainingBalance <= 0 ? "#ef4444" : "#3b82f6"} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="remainingBalance" stroke="#10b981" strokeWidth={2} dot={false} name="Remaining balance" />
                {runOutMonth && (
                  <ReferenceLine x={runOutMonth} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Run‑out: M${runOutMonth}`, position: "insideTopRight", fill: "#ef4444" }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Vertical dashed marker shows the first month your savings are depleted; bars appear red from that month onward.
          </div>
        </section>

        <details className="bg-white rounded-2xl shadow p-6 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium">Assumptions & notes</summary>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>2024–25 Australian resident tax rates (Stage 3) used with 2% Medicare levy.</li>
            <li>Bars show forgone after‑tax income from the offered role only (no expenses).</li>
            <li>Line shows opening savings balance less monthly expenses; no interest/earnings modeled.</li>
            <li>No offsets, deductions, HELP/HECS, or MLS considered.</li>
            <li>Indicative tool only; not tax advice.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}
