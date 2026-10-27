# Real-Time 60-Bin Sonar Spectrum Mini-Chart Implementation Plan

## 1. Overview & Goals
Add a real-time **Recharts 60-Frequency-Bin Bar Spectrum Mini-Chart** (`SonarBarSpectrumMiniChart`) to the **Predict** workspace (`src/pages/Predict.tsx`). This component visualizes the 60 acoustic sonar frequency inputs (`F1`–`F60`, range `0.0000`–`1.0000`) as a responsive, dynamic bar spectrum that updates instantaneously as inputs are edited, randomized, or loaded from CSV, and animates with an active frequency sweep during live inference classification.

## 2. User-Confirmed Design & Feature Decisions
- **Placement & Visibility**:
  1. **Live Controls Panel (Always Visible)**: Embedded directly inside the left-column Controls card above the **Run Classification** action so operators can inspect the live 60-bin spectrum before, during, and after classification.
  2. **Upgraded Result Card Fingerprint**: Replaces the static 60-div CSS bar preview inside `#prediction-result-panel` with the interactive Recharts mini-chart locked to the classified signature state.
- **Dynamic Bar Coloring**:
  - Bars dynamically color-code based on bin amplitude (`0.0` to `1.0`) and current classification state:
    - **Pre-classification / Neutral State**: Tactical cyan-to-emerald intensity ramp (`#0891b2` low, `#06b6d4` mid, `#10b981` high, with peak bin highlighted in amber `#f59e0b`).
    - **Classified State (`MINE` vs `ROCK`)**: When a prediction result is active (or in the result panel), high-energy bins reflect the target classification palette (`#f43f5e` / `#fbbf24` for `MINE` warning vs `#10b981` / `#38bdf8` for `ROCK` safe) while preserving amplitude contrast.
- **Interactive & Visual Features**:
  1. **Interactive Monospace Tooltip**: Hovering any bar reveals a precision HUD tooltip showing the bin label (`F1`–`F60`), exact normalized energy (`0.0000`), percentage of peak energy, frequency band (`Low F1–F20`, `Mid F21–F40`, `High F41–F60`), and deviation (`Δ`) from the spectrum mean.
  2. **Mean Energy Reference Line**: A horizontal dashed `ReferenceLine` across the spectrum indicating the real-time mean amplitude ($\mu$) of all 60 bins, paired with tabular numeric readouts for **Mean ($\mu$)** and **Peak Bin (`F#`)**.
  3. **Pulse Scan Animation During Live Inference**: When `isPredicting` is active (or when the user triggers a spectrum sweep), an animated scanline sweeps across the 60 frequency bins (`F1` $\rightarrow$ `F60`), highlighting the active scan window in real time.
  4. **Click-to-Focus Input Field Navigation**: Clicking any bar in the Recharts spectrum focuses and smoothly scrolls to the corresponding numeric input field (`#sonar-bin-input-{index}`) in the 60-bin input grid and highlights the active bin in the chart.

## 3. Technical Architecture & File Changes

### A. New Component: `src/components/charts/SonarBarSpectrumMiniChart.tsx`
- Built with `ResponsiveContainer`, `BarChart`, `Bar`, `Cell`, `XAxis`, `YAxis`, `Tooltip`, and `ReferenceLine` from `recharts`.
- **Props**:
  - `inputs: number[]` — The 60 normalized frequency bin values.
  - `isPredicting?: boolean` — Triggers the real-time inference scan sweep across the 60 bars.
  - `predictionLabel?: 'ROCK' | 'MINE' | null` — Adapts bar intensity palette to the active classification state.
  - `selectedBinIndex?: number | null` — Highlights the currently focused frequency bin (`F1`–`F60`).
  - `onSelectBin?: (index: number) => void` — Callback fired when a bar is clicked to focus and scroll to the corresponding input field.
  - `compact?: boolean` — Adjusts height and header metadata density between the Controls card and the Prediction Result card.
- **Performance & Accessibility**:
  - Memoizes the 60-bin chart dataset and statistical metrics (`mean`, `max`, `peakBinIndex`) via `useMemo`.
  - Uses `font-mono tabular-nums` for all numeric readouts to prevent layout jitter during live input scrubbing.

### B. Integration in `src/pages/Predict.tsx`
- Add `focusedBinIndex` state (`number | null`) to synchronize selection between the Recharts mini-chart and the 60 numeric input fields.
- Assign deterministic IDs (`id={`sonar-bin-input-${idx}`}`) and `onFocus` / `onBlur` handlers to the 60 numeric input boxes so clicking a bar in the mini-chart focuses, selects, and scrolls to that exact input box (`F1`–`F60`), and focusing an input box highlights its corresponding bar in the mini-chart.
- Render `SonarBarSpectrumMiniChart` in the Controls card above the **Run Classification** button and inside the **Acoustic Signal Fingerprint** section of the result card.

## 4. Verification Plan
- Run `compile_applet` and `lint_applet` to confirm zero TypeScript or ESLint errors.
- Verify real-time responsiveness when clicking **Auto-fill Normal Sample**, **Simulate Ambiguous Ping**, editing individual `F1`–`F60` inputs, and running live inference.
