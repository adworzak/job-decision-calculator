import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// Australian resident tax rates for 2024–25 (Stage 3) including Medicare levy at 2%
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
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return isFinite(n) ? n : 0;
  };

  const offered = parse(offeredJob);
  const expenses = parse(monthlyExpenses);
  const opening = parse(openingBalance);
  const offeredNetMonthly = netIncome(offered) / 12;

  // Cumulative loss by month if you choose NOT to take offered role, accounting for monthly expenses
  const data = Array.from({ length: 18 }, (_, i) => {
    const month = i + 1;
    const cumulativeLoss = offeredNetMonthly * month + expenses * month;
    return { month, cumulativeLoss };
  });

  const getLoss = (months: number) => offeredNetMonthly * months + expenses * months;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">Job Decision: Waiting vs Accepting</h1>
          <p className="text-sm text-gray-600 mt-1">
            Estimate how much <strong>after-tax income</strong> and <strong>savings</strong> you would forgo by not accepting a lower-paying job while waiting.
            Uses 2024–25 Australian resident tax rates (Stage 3) and includes Medicare levy (2%).
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
              Inputs are <strong>before tax</strong> (excluding super). Monthly expenses are your regular outgoings while unemployed.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-3">
            <h2 className="text-lg font-medium mb-2">Key Figures</h2>
            <KPI label="3-month total loss" value={fmt(getLoss(3))} />
            <KPI label="6-month total loss" value={fmt(getLoss(6))} />
            <KPI label="9-month total loss" value={fmt(getLoss(9))} />
            <KPI label="12-month total loss" value={fmt(getLoss(12))} />
            <KPI label="18-month total loss" value={fmt(getLoss(18))} />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-4">Cumulative Financial Impact (by month)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(m) => `Month ${m}`} />
                <ReferenceLine y={opening} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Opening Balance ${fmt(opening)}`, position: "insideTopRight", fill: "#ef4444" }} />
                <Bar dataKey="cumulativeLoss" radius={[8, 8, 0, 0]}>
                  {data.map((d, idx) => (
                    <Cell key={`cell-${idx}`} fill={d.cumulativeLoss > opening ? "#ef4444" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-gray-500 mt-3">Bars turn red once cumulative loss exceeds your opening balance (savings depleted).</div>
        </section>

        <details className="bg-white rounded-2xl shadow p-6 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium">Assumptions & notes</summary>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>2024–25 Australian resident tax rates (Stage 3) used with 2% Medicare levy.</li>
            <li>No offsets, deductions, HELP/HECS, or MLS considered.</li>
            <li>Inputs represent annual taxable income before tax and excluding superannuation.</li>
            <li>Monthly expenses model personal spending while unemployed.</li>
            <li>Opening bank balance shown as a horizontal threshold line on the chart.</li>
            <li>Bars change colour after cumulative loss exceeds opening balance.</li>
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
