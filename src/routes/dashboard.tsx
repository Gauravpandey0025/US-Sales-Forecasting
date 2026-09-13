import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModelStatus } from "@/components/ModelStatus";
import { DEFAULT_SCENARIO, ScenarioFields } from "@/components/ScenarioFields";
import { useModel } from "@/hooks/use-model";
import { FAMILIES, METRICS, predictSales, type PredictionInput } from "@/lib/model";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Forecast Dashboard — Market Forecast" },
      {
        name: "description",
        content:
          "Explore model-driven sales forecasts: 30-day outlook, product-family ranking, promotion sensitivity and weekday demand patterns.",
      },
      { property: "og:title", content: "Forecast Dashboard — Market Forecast" },
      {
        property: "og:description",
        content: "30-day outlook, family ranking, promotion sensitivity and weekday demand patterns.",
      },
    ],
  }),
  component: DashboardPage,
});

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(iso: string, days: number) {
  const [y = 2016, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function DashboardPage() {
  const { model, loading, error } = useModel();
  const [scenario, setScenario] = useState<PredictionInput>(DEFAULT_SCENARIO);
  const patch = (p: Partial<PredictionInput>) => setScenario((s) => ({ ...s, ...p }));

  const data = useMemo(() => {
    if (!model) return null;
    const p = (input: PredictionInput) => predictSales(model, input);

    const forecast = Array.from({ length: 30 }, (_, i) => {
      const date = addDays(scenario.date, i);
      return { date: date.slice(5), sales: Number(p({ ...scenario, date }).toFixed(2)) };
    });

    const families = FAMILIES.map((family) => ({
      family,
      sales: Number(p({ ...scenario, family }).toFixed(2)),
    })).sort((a, b) => b.sales - a.sales);

    const promo = [0, 5, 10, 20, 40, 60, 100, 150, 250, 400].map((onpromotion) => ({
      onpromotion,
      sales: Number(p({ ...scenario, onpromotion }).toFixed(2)),
    }));

    const weekday = DAY_NAMES.map((name, idx) => {
      // average four occurrences of each weekday across the next 28 days
      let total = 0;
      let n = 0;
      for (let i = 0; i < 28; i++) {
        const date = addDays(scenario.date, i);
        const [y = 2016, m = 1, d = 1] = date.split("-").map(Number);
        const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
        if (dow === idx) {
          total += p({ ...scenario, date });
          n += 1;
        }
      }
      return { day: name, sales: Number((n ? total / n : 0).toFixed(2)) };
    });

    const base = p(scenario);
    const closed = p({ ...scenario, transactions: 0 });
    const holiday = p({ ...scenario, is_holiday: true, holiday_type: "Holiday", locale: "National" });
    const monthTotal = forecast.reduce((s, r) => s + r.sales, 0);

    return { forecast, families, promo, weekday, base, closed, holiday, monthTotal };
  }, [model, scenario]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-ink-soft">SCENARIO ANALYTICS</p>
          <h1 className="text-5xl text-secondary sm:text-6xl">Forecast dashboard</h1>
        </div>
        <ModelStatus loading={loading} error={error} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:items-start">
        <section className="slip p-6">
          <h2 className="text-2xl">Scenario</h2>
          <p className="mb-5 font-mono text-xs text-ink-soft">Every chart recomputes from the model live.</p>
          <div className="[&>div]:grid-cols-1">
            <ScenarioFields value={scenario} onChange={patch} singleColumn />
          </div>
        </section>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Predicted today" value={data ? data.base.toFixed(1) : "—"} unit="units" />
            <Stat label="Next 30 days" value={data ? Math.round(data.monthTotal).toLocaleString("en-US") : "—"} unit="units" />
            <Stat
              label="If closed"
              value={data ? data.closed.toFixed(1) : "—"}
              unit="units"
            />
            <Stat
              label="National holiday"
              value={data ? data.holiday.toFixed(1) : "—"}
              unit="units"
            />
          </div>

          <Panel title="30-day forecast" caption="Same scenario rolled forward day by day">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data?.forecast ?? []} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--kraft)" />
                <XAxis dataKey="date" tick={chartTick} interval={3} />
                <YAxis tick={chartTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="sales" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Promotion sensitivity" caption="Predicted sales as promoted items increase">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={data?.promo ?? []} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--kraft)" />
                  <XAxis dataKey="onpromotion" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="sales" stroke="var(--chart-2)" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Weekday pattern" caption="Average predicted sales per weekday, next 4 weeks">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data?.weekday ?? []} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--kraft)" />
                  <XAxis dataKey="day" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sales" fill="var(--chart-3)" stroke="var(--ink)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel title="Product families ranked" caption="Same store and day, every family compared">
            <ResponsiveContainer width="100%" height={620}>
              <BarChart
                data={data?.families ?? []}
                layout="vertical"
                margin={{ left: 110, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--kraft)" />
                <XAxis type="number" tick={chartTick} />
                <YAxis type="category" dataKey="family" tick={chartTick} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sales" stroke="var(--ink)">
                  {(data?.families ?? []).map((row) => (
                    <Cell
                      key={row.family}
                      fill={row.family === scenario.family ? "var(--chart-2)" : "var(--chart-1)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Model quality" caption="Held-out test set metrics">
            <div className="grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-3">
              <Metric label="MAE (log scale)" value={METRICS.mae_log.toFixed(3)} />
              <Metric label="MAE (units)" value={METRICS.mae_sales.toFixed(1)} />
              <Metric label="RMSE (units)" value={METRICS.rmse_sales.toFixed(1)} />
              <Metric label="Boosting rounds" value={String(METRICS.best_iteration)} />
              <Metric label="Train rows" value={METRICS.n_train.toLocaleString("en-US")} />
              <Metric label="Test rows" value={METRICS.n_test.toLocaleString("en-US")} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const chartTick = { fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--ink-soft)" };
const tooltipStyle = {
  background: "var(--paper)",
  border: "1.5px solid var(--ink)",
  borderRadius: 2,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

function Panel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="slip p-5 sm:p-6">
      <h2 className="text-2xl">{title}</h2>
      <p className="mb-4 font-mono text-[11px] text-ink-soft">{caption}</p>
      {children}
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="slip p-4">
      <p className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">{label}</p>
      <p className="mt-1 font-display text-4xl text-primary">{value}</p>
      <p className="font-mono text-[10px] text-ink-soft">{unit}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-kraft pl-3">
      <p className="text-[10px] tracking-[0.15em] text-ink-soft uppercase">{label}</p>
      <p className="text-lg">{value}</p>
    </div>
  );
}
