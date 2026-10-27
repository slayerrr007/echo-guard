import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Grid,
  Crosshair,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Info,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface D3ConfusionMatrixHeatmapProps {
  confusionMatrix: number[][];
  modelName: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
}

type QuadrantKey = 'TN' | 'FP' | 'FN' | 'TP';
type NormalizationMode = 'count' | 'row_pct' | 'total_pct';
type ColorSchemeMode = 'semantic' | 'telemetry';

interface CellDatum {
  key: QuadrantKey;
  rowIdx: number; // 0 = Actual Rock, 1 = Actual Mine
  colIdx: number; // 0 = Pred Rock, 1 = Pred Mine
  actualLabel: 'Actual: Rock (R)' | 'Actual: Mine (M)';
  predictedLabel: 'Pred: Rock (R)' | 'Pred: Mine (M)';
  title: string;
  shortTitle: string;
  errorType: string;
  isCorrect: boolean;
  count: number;
  totalPct: number;
  rowPct: number;
  colPct: number;
  rateName: string;
  operationalImpact: string;
  riskLevel: 'Nominal Clearance' | 'Moderate False Alarm' | 'Critical Naval Hazard' | 'Verified Target Lock';
}

export const D3ConfusionMatrixHeatmap: React.FC<D3ConfusionMatrixHeatmapProps> = ({
  confusionMatrix,
  modelName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [normMode, setNormMode] = useState<NormalizationMode>('count');
  const [colorMode, setColorMode] = useState<ColorSchemeMode>('semantic');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('TP');
  const [hoveredQuadrant, setHoveredQuadrant] = useState<QuadrantKey | null>(null);

  // Extract TN, FP, FN, TP safely
  const tn = Number(confusionMatrix?.[0]?.[0] ?? 0);
  const fp = Number(confusionMatrix?.[0]?.[1] ?? 0);
  const fn = Number(confusionMatrix?.[1]?.[0] ?? 0);
  const tp = Number(confusionMatrix?.[1]?.[1] ?? 0);

  const totalSamples = Math.max(1, tn + fp + fn + tp);
  const actualRockTotal = Math.max(1, tn + fp);
  const actualMineTotal = Math.max(1, fn + tp);
  const predRockTotal = Math.max(1, tn + fn);
  const predMineTotal = Math.max(1, fp + tp);

  // Compute advanced statistical metrics from confusion matrix
  const derivedStats = useMemo(() => {
    const tpr = tp / actualMineTotal; // Recall / Sensitivity
    const tnr = tn / actualRockTotal; // Specificity
    const fpr = fp / actualRockTotal; // Fall-out / False Alarm Rate
    const fnr = fn / actualMineTotal; // Miss Rate
    const ppv = tp / predMineTotal; // Precision
    const npv = tn / predRockTotal; // Negative Predictive Value
    const balancedAcc = (tpr + tnr) / 2;

    const mccDenom = Math.sqrt(
      (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)
    );
    const mcc = mccDenom > 0 ? (tp * tn - fp * fn) / mccDenom : 0;

    return {
      tpr,
      tnr,
      fpr,
      fnr,
      ppv,
      npv,
      balancedAcc,
      mcc,
    };
  }, [tn, fp, fn, tp, actualMineTotal, actualRockTotal, predMineTotal, predRockTotal]);

  const cells: CellDatum[] = useMemo(
    () => [
      {
        key: 'TN',
        rowIdx: 0,
        colIdx: 0,
        actualLabel: 'Actual: Rock (R)',
        predictedLabel: 'Pred: Rock (R)',
        title: 'True Negative (TN)',
        shortTitle: 'True Rock',
        errorType: 'Correct Rejection',
        isCorrect: true,
        count: tn,
        totalPct: (tn / totalSamples) * 100,
        rowPct: (tn / actualRockTotal) * 100,
        colPct: (tn / predRockTotal) * 100,
        rateName: 'Specificity (TNR)',
        operationalImpact:
          'Natural seafloor rock formations accurately cleared without triggering unnecessary mine countermeasures.',
        riskLevel: 'Nominal Clearance',
      },
      {
        key: 'FP',
        rowIdx: 0,
        colIdx: 1,
        actualLabel: 'Actual: Rock (R)',
        predictedLabel: 'Pred: Mine (M)',
        title: 'False Positive (FP)',
        shortTitle: 'False Mine',
        errorType: 'Type I Error (False Alarm)',
        isCorrect: false,
        count: fp,
        totalPct: (fp / totalSamples) * 100,
        rowPct: (fp / actualRockTotal) * 100,
        colPct: (fp / predMineTotal) * 100,
        rateName: 'False Positive Rate (FPR)',
        operationalImpact:
          'Irregular rock acoustic scattering misclassified as a metallic mine. Causes operational delay for secondary verification ping, but zero hull damage.',
        riskLevel: 'Moderate False Alarm',
      },
      {
        key: 'FN',
        rowIdx: 1,
        colIdx: 0,
        actualLabel: 'Actual: Mine (M)',
        predictedLabel: 'Pred: Rock (R)',
        title: 'False Negative (FN)',
        shortTitle: 'False Rock',
        errorType: 'Type II Error (Missed Mine)',
        isCorrect: false,
        count: fn,
        totalPct: (fn / totalSamples) * 100,
        rowPct: (fn / actualMineTotal) * 100,
        colPct: (fn / predRockTotal) * 100,
        rateName: 'Miss Rate (FNR)',
        operationalImpact:
          'Active cylindrical naval mine misclassified as benign rock. Represents the highest-priority hazard in sonar threat detection.',
        riskLevel: 'Critical Naval Hazard',
      },
      {
        key: 'TP',
        rowIdx: 1,
        colIdx: 1,
        actualLabel: 'Actual: Mine (M)',
        predictedLabel: 'Pred: Mine (M)',
        title: 'True Positive (TP)',
        shortTitle: 'True Mine',
        errorType: 'Correct Threat Detection',
        isCorrect: true,
        count: tp,
        totalPct: (tp / totalSamples) * 100,
        rowPct: (tp / actualMineTotal) * 100,
        colPct: (tp / predMineTotal) * 100,
        rateName: 'Sensitivity / Recall (TPR)',
        operationalImpact:
          'Metallic mine signature positively locked and flagged for evasion and countermeasure deployment.',
        riskLevel: 'Verified Target Lock',
      },
    ],
    [tn, fp, fn, tp, totalSamples, actualRockTotal, actualMineTotal, predRockTotal, predMineTotal]
  );

  const activeKey = hoveredQuadrant || selectedQuadrant;
  const activeCell = cells.find((c) => c.key === activeKey) || cells[3];

  // Render D3.js Heatmap SVG
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 460;
    const height = 370;
    const margin = { top: 58, right: 34, bottom: 48, left: 112 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const xLabels: ('Pred: Rock (R)' | 'Pred: Mine (M)')[] = [
      'Pred: Rock (R)',
      'Pred: Mine (M)',
    ];
    const yLabels: ('Actual: Rock (R)' | 'Actual: Mine (M)')[] = [
      'Actual: Rock (R)',
      'Actual: Mine (M)',
    ];

    const xScale = d3
      .scaleBand<string>()
      .domain(xLabels)
      .range([0, innerWidth])
      .paddingInner(0.08)
      .paddingOuter(0.02);

    const yScale = d3
      .scaleBand<string>()
      .domain(yLabels)
      .range([0, innerHeight])
      .paddingInner(0.08)
      .paddingOuter(0.02);

    const maxMetricVal = d3.max(cells, (d) =>
      normMode === 'count' ? d.count : normMode === 'row_pct' ? d.rowPct : d.totalPct
    ) || 1;

    // D3 Color Scales
    const correctColorScale = d3
      .scaleSequential<string>()
      .domain([0, maxMetricVal])
      .interpolator(d3.interpolateRgb('#064e3b', '#10b981'));

    const errorColorScale = d3
      .scaleSequential<string>()
      .domain([0, Math.max(1, maxMetricVal * 0.7)])
      .interpolator(d3.interpolateRgb('#3b0764', '#f43f5e'));

    const telemetryColorScale = d3
      .scaleSequential<string>()
      .domain([0, maxMetricVal])
      .interpolator(d3.interpolateRgb('#0f172a', '#06b6d4'));

    const rootG = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Top Column Axis Title
    svg
      .append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.1em')
      .text('PREDICTED CLASS (MODEL OUTPUT)');

    // Left Row Axis Title
    svg
      .append('text')
      .attr(
        'transform',
        `translate(18, ${margin.top + innerHeight / 2}) rotate(-90)`
      )
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.1em')
      .text('ACTUAL GROUND TRUTH');

    // Column Header Labels
    rootG
      .selectAll('.col-label')
      .data(xLabels)
      .enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('x', (d) => (xScale(d) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.includes('Mine') ? '#fda4af' : '#6ee7b7'))
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .text((d) => d);

    // Row Header Labels
    rootG
      .selectAll('.row-label')
      .data(yLabels)
      .enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -12)
      .attr('y', (d) => (yScale(d) ?? 0) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', (d) => (d.includes('Mine') ? '#fda4af' : '#6ee7b7'))
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .text((d) => d);

    // Draw Quadrant Cells
    const cellGroups = rootG
      .selectAll('.matrix-cell')
      .data(cells)
      .enter()
      .append('g')
      .attr('class', 'matrix-cell')
      .attr(
        'transform',
        (d) =>
          `translate(${xScale(d.predictedLabel) ?? 0}, ${
            yScale(d.actualLabel) ?? 0
          })`
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredQuadrant(d.key);
      })
      .on('mouseleave', () => {
        setHoveredQuadrant(null);
      })
      .on('click', (_event, d) => {
        setSelectedQuadrant(d.key);
      });

    const getCellMetric = (d: CellDatum) =>
      normMode === 'count' ? d.count : normMode === 'row_pct' ? d.rowPct : d.totalPct;

    // Cell Background Rectangles
    cellGroups
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 14)
      .attr('ry', 14)
      .attr('fill', (d) => {
        const val = getCellMetric(d);
        if (colorMode === 'telemetry') {
          return telemetryColorScale(val);
        }
        return d.isCorrect ? correctColorScale(val) : errorColorScale(val);
      })
      .attr('fill-opacity', (d) => (d.key === activeKey ? 0.95 : 0.78))
      .attr('stroke', (d) => {
        if (d.key === activeKey) return '#ffffff';
        if (d.key === 'FN' && d.count > 0) return '#fb7185';
        return d.isCorrect ? 'rgba(52, 211, 153, 0.4)' : 'rgba(244, 63, 94, 0.35)';
      })
      .attr('stroke-width', (d) => (d.key === activeKey ? 2.5 : 1.25));

    // Quadrant Code Pill (Top-Left of Cell: TN, FP, FN, TP)
    cellGroups
      .append('text')
      .attr('x', 14)
      .attr('y', 22)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .text((d) => `${d.key} · ${d.shortTitle}`);

    // Status Indicator Icon/Badge Text (Top-Right of Cell)
    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() - 14)
      .attr('y', 22)
      .attr('text-anchor', 'end')
      .attr('fill', (d) => (d.isCorrect ? '#a7f3d0' : '#fecdd3'))
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .text((d) => (d.isCorrect ? '✓ VALID' : '⚠ ERROR'));

    // Primary Center Metric Value
    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 + 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '28px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '800')
      .text((d) => {
        if (normMode === 'count') return `${d.count}`;
        if (normMode === 'row_pct') return `${d.rowPct.toFixed(1)}%`;
        return `${d.totalPct.toFixed(1)}%`;
      });

    // Secondary Sub-Label inside Cell
    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() - 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text((d) => {
        if (normMode === 'count') {
          return `${d.rowPct.toFixed(1)}% of Actual · ${d.totalPct.toFixed(1)}% Total`;
        }
        return `n = ${d.count} samples (${d.rateName.split(' ')[0]})`;
      });

    // Bottom Summary Strip inside SVG
    svg
      .append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text(
        `Total Test Samples: N = ${totalSamples}  |  Actual Rock: ${actualRockTotal}  |  Actual Mine: ${actualMineTotal}`
      );
  }, [cells, normMode, colorMode, activeKey, totalSamples, actualRockTotal, actualMineTotal]);

  return (
    <section className="bg-black/40 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/10 hover:border-green-400/40 transition-colors space-y-6">
      {/* Section Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400">
            <Grid size={14} />
            <span>D3.js Interactive Confusion Matrix Heatmap</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Quadrant Error & Classification Density ({modelName})
          </h3>
          <p className="text-xs text-slate-400">
            Click or hover any quadrant cell (TN, FP, FN, TP) to inspect sample counts, conditional rates, and naval operational risk.
          </p>
        </div>

        {/* Interactive Mode Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Normalization Mode Selector */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'count', label: 'Sample Count (n)' },
                { id: 'row_pct', label: 'Row % (Recall/Spec)' },
                { id: 'total_pct', label: 'Total %' },
              ] as { id: NormalizationMode; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNormMode(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0',
                  normMode === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Color Palette Toggle */}
          <button
            type="button"
            onClick={() =>
              setColorMode((prev) => (prev === 'semantic' ? 'telemetry' : 'semantic'))
            }
            className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-[11px] font-mono text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Switch between Semantic (Valid vs Error) and Monochromatic Telemetry heatmap scales"
          >
            <Layers size={13} className="text-emerald-400" />
            <span>Scale: {colorMode === 'semantic' ? 'Diagnostic' : 'Spectrographic'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: D3 Heatmap Canvas + Interactive Quadrant Inspector */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: D3.js SVG Matrix Canvas */}
        <div className="lg:col-span-7 bg-slate-950/75 rounded-2xl border border-white/10 p-4 flex flex-col justify-between">
          <div className="w-full overflow-x-auto flex items-center justify-center">
            <svg
              ref={svgRef}
              className="w-full max-w-[460px] h-auto select-none"
              role="img"
              aria-label={`D3.js interactive confusion matrix heatmap for ${modelName}`}
            />
          </div>

          {/* Quick Quadrant Selector Bar */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
            {cells.map((c) => {
              const isSelected = c.key === activeKey;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedQuadrant(c.key)}
                  className={cn(
                    'px-2.5 py-2 rounded-xl border text-left font-mono transition-all cursor-pointer',
                    isSelected
                      ? c.isCorrect
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-rose-500/20 border-rose-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  )}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold">{c.key}</span>
                    <span className={c.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                      n={c.count}
                    </span>
                  </div>
                  <div className="text-[10px] truncate text-slate-300 mt-0.5">
                    {c.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Quadrant Telemetry Inspector Panel */}
        <div className="lg:col-span-5 bg-slate-950/85 rounded-2xl border border-white/10 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Active Quadrant Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  <Crosshair size={13} />
                  <span>Inspected Quadrant · {activeCell.key}</span>
                </div>
                <h4 className="text-lg font-bold text-white mt-0.5">{activeCell.title}</h4>
                <p className="text-xs font-mono text-slate-400">{activeCell.errorType}</p>
              </div>

              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border shrink-0 flex items-center gap-1',
                  activeCell.key === 'FN'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : activeCell.key === 'FP'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                )}
              >
                {activeCell.key === 'FN' ? (
                  <ShieldAlert size={12} />
                ) : activeCell.key === 'FP' ? (
                  <AlertTriangle size={12} />
                ) : (
                  <ShieldCheck size={12} />
                )}
                {activeCell.riskLevel}
              </span>
            </div>

            {/* Key Quadrant Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
              <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase text-slate-400 block">
                  Sample Count (n)
                </span>
                <span className="text-2xl font-bold text-white">
                  {activeCell.count}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {totalSamples}
                  </span>
                </span>
              </div>

              <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase text-slate-400 block">
                  {activeCell.rateName}
                </span>
                <span
                  className={cn(
                    'text-2xl font-bold',
                    activeCell.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {activeCell.rowPct.toFixed(1)}%
                </span>
              </div>

              <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase text-slate-400 block">
                  Share of Predicted Class
                </span>
                <span className="text-lg font-bold text-cyan-300">
                  {activeCell.colPct.toFixed(1)}%
                </span>
              </div>

              <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase text-slate-400 block">
                  Share of Total Test Set
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {activeCell.totalPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Operational Assessment Box */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Info size={13} className="text-cyan-400 shrink-0" />
                <span>Tactical Sonar Assessment</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeCell.operationalImpact}
              </p>
            </div>
          </div>

          {/* Global Matrix Statistical Summary Footer */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center font-mono tabular-nums text-[11px]">
            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-slate-400 block uppercase">MCC Score</span>
              <span className="text-emerald-400 font-bold">
                {derivedStats.mcc.toFixed(3)}
              </span>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-slate-400 block uppercase">Balanced Acc</span>
              <span className="text-cyan-400 font-bold">
                {(derivedStats.balancedAcc * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-slate-400 block uppercase">Miss Rate (FNR)</span>
              <span
                className={cn(
                  'font-bold',
                  derivedStats.fnr > 0.15 ? 'text-rose-400' : 'text-amber-300'
                )}
              >
                {(derivedStats.fnr * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
