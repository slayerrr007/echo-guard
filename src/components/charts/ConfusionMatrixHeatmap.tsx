import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Info, Sparkles, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';

export interface ConfusionMatrixData {
  tn: number; // True Rock (Actual R, Predicted R)
  fp: number; // False Mine (Actual R, Predicted M)
  fn: number; // False Rock (Actual M, Predicted R)
  tp: number; // True Mine (Actual M, Predicted M)
}

interface ConfusionMatrixHeatmapProps {
  matrix: ConfusionMatrixData;
  modelName: string;
  className?: string;
}

export function ConfusionMatrixHeatmap({ matrix, modelName, className = '' }: ConfusionMatrixHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayMode, setDisplayMode] = useState<'counts' | 'percentages'>('counts');
  const [hoveredCell, setHoveredCell] = useState<{
    actual: string;
    predicted: string;
    value: number;
    pctOfTotal: number;
    pctOfActual: number;
    type: string;
    description: string;
  } | null>(null);

  const total = useMemo(() => {
    return matrix.tn + matrix.fp + matrix.fn + matrix.tp || 1;
  }, [matrix]);

  // Derived classification stats
  const accuracy = ((matrix.tp + matrix.tn) / total) * 100;
  const precision = matrix.tp + matrix.fp > 0 ? (matrix.tp / (matrix.tp + matrix.fp)) * 100 : 0;
  const recall = matrix.tp + matrix.fn > 0 ? (matrix.tp / (matrix.tp + matrix.fn)) * 100 : 0;
  const specificity = matrix.tn + matrix.fp > 0 ? (matrix.tn / (matrix.tn + matrix.fp)) * 100 : 0;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Dimensions
    const width = 380;
    const height = 340;
    const margin = { top: 60, right: 30, bottom: 40, left: 90 };
    const gridWidth = width - margin.left - margin.right;
    const gridHeight = height - margin.top - margin.bottom;

    const cellSize = Math.min(gridWidth / 2, gridHeight / 2);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Definitions for gradient glow
    const defs = svg.append('defs');

    // Diagonal correct cell gradient (Emerald)
    const emeraldGrad = defs.append('linearGradient')
      .attr('id', 'emeraldGlow')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    emeraldGrad.append('stop').attr('offset', '0%').attr('stop-color', '#064e3b').attr('stop-opacity', 0.85);
    emeraldGrad.append('stop').attr('offset', '100%').attr('stop-color', '#047857').attr('stop-opacity', 0.95);

    // Off-diagonal error cell gradient (Rose/Amber)
    const roseGrad = defs.append('linearGradient')
      .attr('id', 'roseGlow')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    roseGrad.append('stop').attr('offset', '0%').attr('stop-color', '#4c0519').attr('stop-opacity', 0.75);
    roseGrad.append('stop').attr('offset', '100%').attr('stop-color', '#881337').attr('stop-opacity', 0.85);

    // Matrix cell data
    const cells = [
      {
        row: 0,
        col: 0,
        actual: 'ROCK (R)',
        predicted: 'ROCK (R)',
        val: matrix.tn,
        isDiagonal: true,
        type: 'True Negative (TN)',
        description: 'Seafloor rock correctly classified as Rock.',
        actualTotal: matrix.tn + matrix.fp,
      },
      {
        row: 0,
        col: 1,
        actual: 'ROCK (R)',
        predicted: 'MINE (M)',
        val: matrix.fp,
        isDiagonal: false,
        type: 'False Positive (FP)',
        description: 'Seafloor rock falsely classified as Mine (False Alarm).',
        actualTotal: matrix.tn + matrix.fp,
      },
      {
        row: 1,
        col: 0,
        actual: 'MINE (M)',
        predicted: 'ROCK (R)',
        val: matrix.fn,
        isDiagonal: false,
        type: 'False Negative (FN)',
        description: 'Naval mine missed! Falsely classified as Rock (Hazard).',
        actualTotal: matrix.fn + matrix.tp,
      },
      {
        row: 1,
        col: 1,
        actual: 'MINE (M)',
        predicted: 'MINE (M)',
        val: matrix.tp,
        isDiagonal: true,
        type: 'True Positive (TP)',
        description: 'Naval mine successfully detected and intercepted.',
        actualTotal: matrix.fn + matrix.tp,
      },
    ];

    const maxVal = d3.max(cells, d => d.val) || 1;

    // D3 Scales
    const emeraldColorScale = d3.scaleLinear<string>()
      .domain([0, maxVal])
      .range(['rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.85)']);

    const roseColorScale = d3.scaleLinear<string>()
      .domain([0, Math.max(1, maxVal * 0.5)])
      .range(['rgba(244, 63, 94, 0.2)', 'rgba(244, 63, 94, 0.75)']);

    // Cell Groups
    const cellGroups = g.selectAll('.heatmap-cell')
      .data(cells)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr('transform', d => `translate(${d.col * (cellSize + 8)}, ${d.row * (cellSize + 8)})`)
      .style('cursor', 'pointer');

    // Rectangles
    cellGroups.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => d.isDiagonal ? emeraldColorScale(d.val) : roseColorScale(d.val))
      .attr('stroke', d => d.isDiagonal ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.35)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay((_, i) => i * 80)
      .attr('opacity', 1);

    // Hover interactions
    cellGroups
      .on('mouseenter', function (event, d) {
        d3.select(this).select('rect')
          .transition()
          .duration(150)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .attr('filter', 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.5))');

        setHoveredCell({
          actual: d.actual,
          predicted: d.predicted,
          value: d.val,
          pctOfTotal: Number(((d.val / total) * 100).toFixed(1)),
          pctOfActual: d.actualTotal > 0 ? Number(((d.val / d.actualTotal) * 100).toFixed(1)) : 0,
          type: d.type,
          description: d.description,
        });
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).select('rect')
          .transition()
          .duration(150)
          .attr('stroke', d.isDiagonal ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.35)')
          .attr('stroke-width', 1.5)
          .attr('filter', null);
      });

    // Cell Tag (TN, FP, FN, TP)
    cellGroups.append('text')
      .attr('x', 12)
      .attr('y', 22)
      .attr('fill', d => d.isDiagonal ? '#6ee7b7' : '#fda4af')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .attr('opacity', 0.8)
      .text(d => d.type.split(' ')[0] + ' ' + d.type.split(' ')[1]);

    // Cell Primary Value
    cellGroups.append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '28px')
      .attr('font-weight', '800')
      .attr('font-family', 'monospace')
      .attr('opacity', 0)
      .text(d => displayMode === 'counts' ? d.val : `${((d.val / total) * 100).toFixed(1)}%`)
      .transition()
      .duration(600)
      .delay((_, i) => i * 80 + 100)
      .attr('opacity', 1);

    // Cell Secondary Value (Percentage of class)
    cellGroups.append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.isDiagonal ? '#a7f3d0' : '#fecdd3')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('opacity', 0.8)
      .text(d => {
        const pct = d.actualTotal > 0 ? ((d.val / d.actualTotal) * 100).toFixed(1) : '0.0';
        return `${pct}% of actual`;
      });

    // Top X-Axis Labels (Predicted)
    const xLabels = ['Pred: Rock (R)', 'Pred: Mine (M)'];
    xLabels.forEach((label, i) => {
      g.append('text')
        .attr('x', i * (cellSize + 8) + cellSize / 2)
        .attr('y', -14)
        .attr('text-anchor', 'middle')
        .attr('fill', i === 0 ? '#34d399' : '#22d3ee')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('font-family', 'monospace')
        .text(label);
    });

    // Top Header: PREDICTED CLASS
    g.append('text')
      .attr('x', gridWidth / 2)
      .attr('y', -36)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '2px')
      .text('PREDICTED CLASS');

    // Left Y-Axis Labels (Actual)
    const yLabels = ['Act: Rock (R)', 'Act: Mine (M)'];
    yLabels.forEach((label, i) => {
      g.append('text')
        .attr('x', -14)
        .attr('y', i * (cellSize + 8) + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', i === 0 ? '#34d399' : '#22d3ee')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('font-family', 'monospace')
        .text(label);
    });

    // Left Header: ACTUAL CLASS (Rotated)
    g.append('text')
      .attr('transform', `translate(-64, ${gridHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '2px')
      .text('ACTUAL CLASS');

  }, [matrix, displayMode, total]);

  return (
    <div className={`space-y-4 ${className}`} ref={containerRef}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              D3.js Confusion Matrix Heatmap
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Evaluation on test partition for <strong className="text-emerald-400">{modelName}</strong> ({total} sonar samples).
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex rounded-xl p-0.5 bg-black/60 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setDisplayMode('counts')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              displayMode === 'counts'
                ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sample Counts
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('percentages')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              displayMode === 'percentages'
                ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Total %
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-center">
        {/* Heatmap SVG Canvas */}
        <div className="lg:col-span-7 flex justify-center items-center p-3 bg-black/40 rounded-2xl border border-white/5">
          <svg ref={svgRef} className="w-full max-w-[380px] h-auto overflow-visible select-none" />
        </div>

        {/* Interactive Cell Inspector & Metrics Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hovered Cell Details Card */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5 min-h-[140px] flex flex-col justify-center">
            {hoveredCell ? (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    {hoveredCell.type.startsWith('True') ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <AlertOctagon size={14} className="text-rose-400" />
                    )}
                    {hoveredCell.type}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                    {hoveredCell.value} signals
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {hoveredCell.description}
                </p>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Share of Total: <strong className="text-white">{hoveredCell.pctOfTotal}%</strong></span>
                  <span>Class Recall: <strong className="text-white">{hoveredCell.pctOfActual}%</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-slate-400 space-y-1">
                <Info size={18} className="mx-auto text-cyan-400 opacity-80" />
                <p className="text-xs font-medium text-slate-300">Hover over any matrix quadrant</p>
                <p className="text-[11px] text-slate-500">
                  Inspect True Negatives, False Alarms, Missed Mines, and Interceptions.
                </p>
              </div>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Accuracy</span>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {accuracy.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">Overall correct</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Precision</span>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {precision.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">Mine purity</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Mine Recall</span>
              <div className="text-base font-bold text-yellow-400 font-mono">
                {recall.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">Detection rate</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Rock Specificity</span>
              <div className="text-base font-bold text-purple-400 font-mono">
                {specificity.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">True rock filter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 border-t border-white/5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-400/50" />
            Diagonal: Correct Predictions (TN + TP)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/80 border border-rose-400/50" />
            Off-Diagonal: Classification Errors (FP + FN)
          </span>
        </div>
        <span className="text-slate-500">
          Positive Class: Mine (M) &bull; Negative Class: Rock (R)
        </span>
      </div>
    </div>
  );
}
