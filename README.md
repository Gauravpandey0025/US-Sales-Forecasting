# Market Forecast — Store Sales Prediction

A web app that runs a trained LightGBM store-sales model directly in the browser.
Two pages:

- `/` — fill in a scenario (store, product family, date, promotions, oil price,
  holiday) and get a predicted unit-sales "receipt".
- `/dashboard` — 30-day forecast, promotion sensitivity, weekday pattern,
  product-family ranking and model quality metrics.

## Run it in VS Code

You need [Node.js](https://nodejs.org) 20 or newer (comes with npm).

```sh
# 1. open the project folder in VS Code
# 2. open a terminal (Ctrl + `) and run:
npm install
npm run dev
```

Then open http://localhost:8080 in your browser.

Other commands:

```sh
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # lint the code
```

Recommended VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense.

## How the prediction works

The trained LightGBM model was exported to a compact binary file at
`public/sales_model.bin` (about 4 MB, 1602 trees, 79 features). The browser
downloads it once, then `src/lib/model.ts` walks every tree in plain TypeScript
and applies `expm1` to the summed output, because the model was trained on
`log1p(sales)`. No server, no Python, no API calls — everything runs locally.

## Project layout

```
public/sales_model.bin      exported model weights
src/lib/model.ts            model parser, feature builder, prediction
src/lib/feature-names.ts    the 79 feature names, in model order
src/lib/metrics.json        training metrics (MAE, RMSE, row counts)
src/hooks/use-model.ts      loads the model on the client
src/components/             scenario form + model status badge
src/routes/index.tsx        prediction page
src/routes/dashboard.tsx    dashboard page
src/styles.css              theme tokens and receipt styling
```

## Built with

- TanStack Start (React 19 + Vite)
- TypeScript
- Tailwind CSS v4
- Recharts
