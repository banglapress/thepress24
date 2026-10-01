import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBnLong, monthLabel, recentMonths, todayStamp } from "@/lib/press/dates";
import { getMyReport } from "@/lib/press/server";
import type { RoleId } from "@/lib/press/types";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function slicesFor(
  role: RoleId | null,
  report: Awaited<ReturnType<typeof getMyReport>>,
) {
  const rows: { key: string; label: string; value: number }[] = [
    { key: "topics", label: "বিষয়", value: report.topics },
    { key: "scripts", label: "স্ক্রিপ্ট", value: report.scripts },
    { key: "edits", label: "এডিট", value: report.edits },
  ];
  if (role === "producer" || report.shoots > 0) {
    rows.push({ key: "shoots", label: "শুট", value: report.shoots });
  }
  if (role === "presenter" || report.presents > 0) {
    rows.push({ key: "presents", label: "প্রেজেন্ট", value: report.presents });
  }
  if (role === "script_editor" || report.scriptReviews > 0) {
    rows.push({ key: "scriptReviews", label: "স্ক্রিপ্ট রিভিউ", value: report.scriptReviews });
  }
  if (role === "planning_editor" || report.cutReviews > 0) {
    rows.push({ key: "cutReviews", label: "ভিডিও রিভিউ", value: report.cutReviews });
  }
  if (role === "social" || report.uploads > 0) {
    rows.push({ key: "uploads", label: "আপলোড", value: report.uploads });
  }
  rows.push({ key: "published", label: "প্রকাশিত", value: report.publishedFromWork });
  return rows;
}

export function MonthlyReport({
  role,
  showDate = true,
}: {
  role: RoleId | null;
  showDate?: boolean;
}) {
  const today = todayStamp();
  const months = recentMonths(6);
  const [picked, setPicked] = useState({ year: today.year, month: today.month });
  const query = useQuery({
    queryKey: ["my-report", picked.year, picked.month],
    queryFn: () => getMyReport({ data: picked }),
  });
  const report = query.data;
  const items = report ? slicesFor(role, report) : [];
  const chartData = items.filter((item) => item.value > 0);

  return (
    <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      {showDate ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">আজকের তারিখ</p>
            <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              {formatBnLong()}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {monthLabel(picked.year, picked.month)} — আপনার কাজ
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-serif text-lg font-semibold">মাসিক রিপোর্ট</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {monthLabel(picked.year, picked.month)} — আপনার কাজ
          </p>
        </div>
      )}
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {months.map((m) => {
          const active = m.year === picked.year && m.month === picked.month;
          return (
            <button
              key={`${m.year}-${m.month}`}
              type="button"
              onClick={() => setPicked({ year: m.year, month: m.month })}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {query.isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      ) : query.isError ? (
        <p className="mt-4 text-sm text-destructive">রিপোর্ট আসেনি।</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px] lg:items-center">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <div key={item.key} className="rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="h-52">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl bg-muted/60 text-center text-sm text-muted-foreground">
                এই মাসে এখনো কাজ নেই
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
