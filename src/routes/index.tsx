import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModelStatus } from "@/components/ModelStatus";
import { DEFAULT_SCENARIO, ScenarioFields } from "@/components/ScenarioFields";
import { useModel } from "@/hooks/use-model";
import { METRICS, predictSales, type PredictionInput } from "@/lib/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Forecast — Store Sales Prediction" },
      {
        name: "description",
        content:
          "Run live store-sales predictions from a trained LightGBM model: pick a store, product family and date and get a forecast receipt instantly.",
      },
      { property: "og:title", content: "Market Forecast — Store Sales Prediction" },
      {
        property: "og:description",
        content: "Live store-sales forecasting from a trained gradient-boosting model.",
      },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const { model, loading, error } = useModel();
  const [scenario, setScenario] = useState<PredictionInput>(DEFAULT_SCENARIO);
  const [submitted, setSubmitted] = useState<PredictionInput | null>(null);

  const prediction = useMemo(() => {
    if (!model || !submitted) return null;
    return predictSales(model, submitted);
  }, [model, submitted]);

  const patch = (p: Partial<PredictionInput>) => setScenario((s) => ({ ...s, ...p }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-ink-soft">
            LIGHTGBM · {METRICS.best_iteration} TREES · {METRICS.n_train.toLocaleString("en-US")} TRAINING ROWS
          </p>
          <h1 className="text-5xl text-secondary sm:text-6xl">Ring up a forecast</h1>
        </div>
        <ModelStatus loading={loading} error={error} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="slip p-6 sm:p-8">
          <h2 className="text-2xl">Order slip</h2>
          <p className="mb-6 font-mono text-xs text-ink-soft">
            Fill in the conditions, then ring it up. Set transactions to 0 to simulate a closed store.
          </p>
          <ScenarioFields value={scenario} onChange={patch} />
          <button
            type="button"
            className="sticker-btn mt-7 w-full hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!model}
            onClick={() => setSubmitted({ ...scenario })}
          >
            {model ? "RING IT UP" : "LOADING MODEL…"}
          </button>
          {error && <p className="mt-3 font-mono text-xs text-destructive">{error}</p>}
        </section>

        <section>
          <Receipt input={submitted} prediction={prediction} />
        </section>
      </div>
    </div>
  );
}

function Receipt({ input, prediction }: { input: PredictionInput | null; prediction: number | null }) {
  if (!input || prediction === null) {
    return (
      <div className="slip p-6 text-center font-mono text-xs text-ink-soft">
        No receipt yet — ring up a forecast to print one.
      </div>
    );
  }

  const closed = input.transactions === 0;
  const rows: Array<[string, string]> = [
    ["STORE", `#${input.store_nbr} · ${input.city}`],
    ["TYPE / CLUSTER", `${input.store_type} / ${input.cluster}`],
    ["FAMILY", input.family],
    ["DATE", input.date],
    ["ON PROMOTION", String(input.onpromotion)],
    ["TRANSACTIONS", String(input.transactions)],
    ["OIL (WTI)", `$${input.dcoilwtico.toFixed(2)}`],
    ["HOLIDAY", input.is_holiday ? `${input.holiday_type} (${input.locale})` : "no"],
  ];

  return (
    <div className="slip px-6 py-7 font-mono">
      <p className="text-center text-2xl font-display tracking-widest">MARKET FORECAST</p>
      <p className="mt-1 text-center text-[11px] text-ink-soft">PREDICTED UNIT SALES · NOT A BILL</p>
      <div className="my-4 border-t border-dashed border-ink/40" />
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="my-4 border-t border-dashed border-ink/40" />
      <div className="flex items-end justify-between">
        <span className="font-display text-2xl">TOTAL</span>
        <span className="font-display text-4xl text-primary">{prediction.toFixed(2)}</span>
      </div>
      <p className="mt-1 text-right text-[11px] text-ink-soft">units forecast for this day</p>
      {closed && (
        <p className="mt-3 border-[1.5px] border-destructive px-2 py-1 text-center text-[11px] text-destructive">
          STORE FLAGGED CLOSED (0 TRANSACTIONS)
        </p>
      )}
      <div className="mt-5 flex h-10 items-end gap-[2px] overflow-hidden">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="bg-ink"
            style={{ width: `${1 + ((i * 7) % 3)}px`, height: `${60 + ((i * 37) % 40)}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] tracking-[0.25em] text-ink-soft">
        MAE ±{METRICS.mae_sales.toFixed(0)} UNITS
      </p>
    </div>
  );
}
