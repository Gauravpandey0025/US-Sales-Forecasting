import { CITIES, FAMILIES, HOLIDAY_TYPES, LOCALES, STORE_TYPES, type PredictionInput } from "@/lib/model";

type Props = {
  value: PredictionInput;
  onChange: (patch: Partial<PredictionInput>) => void;
  showDate?: boolean;
  singleColumn?: boolean;
};

export function ScenarioFields({ value, onChange, showDate = true, singleColumn = false }: Props) {
  return (
    <div className={singleColumn ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
      {showDate && (
        <div>
          <label className="field-label" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            className="field-input"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="family">Product family</label>
        <select
          id="family"
          className="field-input"
          value={value.family}
          onChange={(e) => onChange({ family: e.target.value })}
        >
          {FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="store">Store number (1–54)</label>
        <input
          id="store"
          type="number"
          min={1}
          max={54}
          className="field-input"
          value={value.store_nbr}
          onChange={(e) => onChange({ store_nbr: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="cluster">Cluster (1–17)</label>
        <input
          id="cluster"
          type="number"
          min={1}
          max={17}
          className="field-input"
          value={value.cluster}
          onChange={(e) => onChange({ cluster: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="city">City</label>
        <select
          id="city"
          className="field-input"
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="store_type">Store type</label>
        <select
          id="store_type"
          className="field-input"
          value={value.store_type}
          onChange={(e) => onChange({ store_type: e.target.value })}
        >
          {STORE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="onpromotion">Items on promotion</label>
        <input
          id="onpromotion"
          type="number"
          min={0}
          max={678}
          className="field-input"
          value={value.onpromotion}
          onChange={(e) => onChange({ onpromotion: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="transactions">Store transactions (0 = closed)</label>
        <input
          id="transactions"
          type="number"
          min={0}
          max={8359}
          className="field-input"
          value={value.transactions}
          onChange={(e) => onChange({ transactions: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="oil">Oil price (WTI, USD)</label>
        <input
          id="oil"
          type="number"
          step="0.01"
          min={26}
          max={110}
          className="field-input"
          value={value.dcoilwtico}
          onChange={(e) => onChange({ dcoilwtico: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="holiday_type">Holiday type</label>
        <select
          id="holiday_type"
          className="field-input"
          value={value.holiday_type}
          onChange={(e) => onChange({ holiday_type: e.target.value })}
        >
          {HOLIDAY_TYPES.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="locale">Holiday locale</label>
        <select
          id="locale"
          className="field-input"
          value={value.locale}
          onChange={(e) => onChange({ locale: e.target.value })}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <label
        className={`flex items-center gap-2 font-mono text-xs tracking-widest text-ink-soft ${singleColumn ? "" : "sm:col-span-2"}`}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-[oklch(0.6_0.2_27)]"
          checked={value.is_holiday}
          onChange={(e) => onChange({ is_holiday: e.target.checked })}
        />
        THIS DAY IS A HOLIDAY
      </label>
    </div>
  );
}

export const DEFAULT_SCENARIO: PredictionInput = {
  date: "2016-08-15",
  store_nbr: 44,
  cluster: 5,
  city: "Quito",
  store_type: "A",
  family: "GROCERY I",
  onpromotion: 12,
  transactions: 2100,
  dcoilwtico: 46.8,
  is_holiday: false,
  holiday_type: "None",
  locale: "None",
};
