import { FEATURE_NAMES } from "./feature-names";
import metricsJson from "./metrics.json";

export const METRICS = metricsJson;

export const FAMILIES = [
  "AUTOMOTIVE", "BABY CARE", "BEAUTY", "BEVERAGES", "BOOKS", "BREAD/BAKERY",
  "CELEBRATION", "CLEANING", "DAIRY", "DELI", "EGGS", "FROZEN FOODS",
  "GROCERY I", "GROCERY II", "HARDWARE", "HOME AND KITCHEN I",
  "HOME AND KITCHEN II", "HOME APPLIANCES", "HOME CARE", "LADIESWEAR",
  "LAWN AND GARDEN", "LINGERIE", "LIQUOR,WINE,BEER", "MAGAZINES", "MEATS",
  "PERSONAL CARE", "PET SUPPLIES", "PLAYERS AND ELECTRONICS", "POULTRY",
  "PREPARED FOODS", "PRODUCE", "SCHOOL AND OFFICE SUPPLIES", "SEAFOOD",
] as const;

export const CITIES = [
  "Ambato", "Babahoyo", "Cayambe", "Cuenca", "Daule", "El Carmen",
  "Esmeraldas", "Guaranda", "Guayaquil", "Ibarra", "Latacunga", "Libertad",
  "Loja", "Machala", "Manta", "Playas", "Puyo", "Quevedo", "Quito",
  "Riobamba", "Salinas", "Santo Domingo",
] as const;

export const STORE_TYPES = ["A", "B", "C", "D", "E"] as const;
export const HOLIDAY_TYPES = ["None", "Additional", "Bridge", "Event", "Holiday", "Transfer", "Work Day"] as const;
export const LOCALES = ["None", "Local", "National", "Regional"] as const;

export type PredictionInput = {
  date: string;
  store_nbr: number;
  cluster: number;
  city: string;
  store_type: string;
  family: string;
  onpromotion: number;
  transactions: number;
  dcoilwtico: number;
  is_holiday: boolean;
  holiday_type: string;
  locale: string;
};

type Tree = {
  splitFeature: Int16Array;
  threshold: Float64Array;
  left: Int32Array;
  right: Int32Array;
  leaf: Float64Array;
};

type Model = { trees: Tree[]; nFeatures: number };

let modelPromise: Promise<Model> | null = null;

function parseModel(buffer: ArrayBuffer): Model {
  const view = new DataView(buffer);
  let o = 0;
  const magic = view.getUint32(o, true); o += 4;
  if (magic !== 0x4c47424d) throw new Error("Invalid model file");
  const nTrees = view.getUint32(o, true); o += 4;
  const nFeatures = view.getUint32(o, true); o += 4;
  const trees: Tree[] = [];
  for (let t = 0; t < nTrees; t++) {
    const n = view.getUint32(o, true); o += 4;
    const nLeaf = view.getUint32(o, true); o += 4;
    const splitFeature = new Int16Array(n);
    for (let i = 0; i < n; i++) { splitFeature[i] = view.getInt16(o, true); o += 2; }
    const threshold = new Float64Array(n);
    for (let i = 0; i < n; i++) { threshold[i] = view.getFloat64(o, true); o += 8; }
    const left = new Int32Array(n);
    for (let i = 0; i < n; i++) { left[i] = view.getInt32(o, true); o += 4; }
    const right = new Int32Array(n);
    for (let i = 0; i < n; i++) { right[i] = view.getInt32(o, true); o += 4; }
    const leaf = new Float64Array(nLeaf);
    for (let i = 0; i < nLeaf; i++) { leaf[i] = view.getFloat64(o, true); o += 8; }
    trees.push({ splitFeature, threshold, left, right, leaf });
  }
  return { trees, nFeatures };
}

export function loadModel(): Promise<Model> {
  if (!modelPromise) {
    modelPromise = fetch("/sales_model.bin")
      .then((r) => {
        if (!r.ok) throw new Error("Could not download the model");
        return r.arrayBuffer();
      })
      .then(parseModel)
      .catch((err) => {
        modelPromise = null;
        throw err;
      });
  }
  return modelPromise;
}

const FEATURE_INDEX = new Map(FEATURE_NAMES.map((f, i) => [f, i]));

function clean(name: string) {
  return name.replace(/,/g, "_").replace(/ /g, "_");
}

export function buildFeatureRow(input: PredictionInput): Float64Array {
  const row = new Float64Array(FEATURE_NAMES.length);
  const set = (name: string, value: number) => {
    const i = FEATURE_INDEX.get(name);
    if (i !== undefined) row[i] = value;
  };

  const parts = input.date.split("-").map(Number);
  const y = parts[0] ?? 2016;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  const jsDow = date.getUTCDay(); // 0 = Sunday
  const dow = (jsDow + 6) % 7; // Monday = 0, matching Python weekday()

  set("year", y);
  set("month", m);
  set("day", d);
  set("dayofweek", dow);
  set("is_weekend", dow >= 5 ? 1 : 0);
  set("weekofyear", isoWeek(date));

  set("store_nbr", input.store_nbr);
  set("cluster", input.cluster);
  set("onpromotion", input.onpromotion);
  set("transactions", input.transactions);
  set("dcoilwtico", input.dcoilwtico);
  set("is_holiday", input.is_holiday ? 1 : 0);
  set("store_closed", input.transactions === 0 ? 1 : 0);

  set(clean(`family_${input.family}`), 1);
  set(clean(`city_${input.city}`), 1);
  set(`type_${input.store_type}`, 1);
  set(clean(`holiday_type_${input.holiday_type}`), 1);
  set(clean(`locale_${input.locale}`), 1);

  return row;
}

function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function predictRaw(model: Model, row: Float64Array): number {
  let sum = 0;
  for (const tree of model.trees) {
    if (tree.splitFeature.length === 0) {
      sum += tree.leaf[0] ?? 0;
      continue;
    }
    let node = 0;
    for (;;) {
      const value = row[tree.splitFeature[node]!]!;
      const goLeft = value <= tree.threshold[node]!;
      const next = (goLeft ? tree.left[node] : tree.right[node])!;
      if (next < 0) {
        sum += tree.leaf[-next - 1]!;
        break;
      }
      node = next;
    }
  }
  return sum;
}

/** Predicted unit sales (the model is trained on log1p(sales)). */
export function predictSales(model: Model, input: PredictionInput): number {
  const logPred = predictRaw(model, buildFeatureRow(input));
  return Math.max(0, Math.expm1(logPred));
}
