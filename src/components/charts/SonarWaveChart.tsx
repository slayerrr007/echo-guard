import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Sliders, 
  Maximize2, 
  Volume2, 
  Waves, 
  BarChart3, 
  Radio, 
  Check, 
  ShieldAlert, 
  Info 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SonarWaveChartProps {
  features: number[];
  onFeaturesChange?: (updatedFeatures: number[]) => void;
  predictedLabel?: 'ROCK' | 'MINE' | null;
  confidence?: number | null;
  className?: string;
  readOnly?: boolean;
}

// Preset acoustic spectral profiles
const PRESET_SIGNATURES: {
  id: string;
  name: string;
  type: 'MINE' | 'ROCK' | 'AMBIGUOUS' | 'SYNTHETIC';
  description: string;
  features: number[];
}[] = [
  {
    id: 'mine_cylindrical',
    name: 'Cylindrical Mine',
    type: 'MINE',
    description: 'Prominent mid-frequency metallic resonance peak between F12 and F22 with rapid ultrasonic decay.',
    features: [
      0.0286, 0.0453, 0.0277, 0.0174, 0.0384, 0.0990, 0.1201, 0.1833, 0.2105, 0.3039,
      0.2988, 0.4250, 0.6343, 0.8198, 1.0000, 0.9988, 0.9508, 0.9025, 0.7234, 0.5122,
      0.2074, 0.3985, 0.5890, 0.2872, 0.2043, 0.5782, 0.5389, 0.3750, 0.3411, 0.5067,
      0.5580, 0.4778, 0.3299, 0.2198, 0.1407, 0.2856, 0.3807, 0.4158, 0.4054, 0.3296,
      0.2707, 0.2650, 0.0723, 0.1238, 0.1192, 0.1089, 0.0623, 0.0494, 0.0264, 0.0081,
      0.0104, 0.0045, 0.0014, 0.0038, 0.0013, 0.0089, 0.0057, 0.0027, 0.0051, 0.0062
    ]
  },
  {
    id: 'rock_granite',
    name: 'Basalt Seafloor Rock',
    type: 'ROCK',
    description: 'Diffused broadband reverberation with irregular jagged peaks across wide frequency spectrum.',
    features: [
      0.0200, 0.0371, 0.0428, 0.0207, 0.0954, 0.0986, 0.1539, 0.1601, 0.3109, 0.2111,
      0.1609, 0.1582, 0.2238, 0.0645, 0.0660, 0.2273, 0.3100, 0.2999, 0.5078, 0.4797,
      0.5783, 0.5071, 0.4328, 0.5550, 0.6711, 0.6415, 0.7104, 0.8080, 0.6791, 0.3857,
      0.1307, 0.2604, 0.5121, 0.7547, 0.8537, 0.8507, 0.6692, 0.6097, 0.4943, 0.2744,
      0.0510, 0.2834, 0.2825, 0.4256, 0.2641, 0.1386, 0.1051, 0.1343, 0.0383, 0.0324,
      0.0232, 0.0027, 0.0065, 0.0159, 0.0072, 0.0167, 0.0180, 0.0084, 0.0090, 0.0032
    ]
  },
  {
    id: 'borderline_ambiguous',
    name: 'Ambiguous Acoustic Return',
    type: 'AMBIGUOUS',
    description: 'Equivocal signature straddling the 50% decision boundary between metallic and mineral echoes.',
    features: [
      0.0130, 0.0120, 0.0180, 0.0360, 0.0770, 0.0850, 0.0590, 0.0640, 0.1100, 0.1090,
      0.1120, 0.1280, 0.0790, 0.1180, 0.1780, 0.1850, 0.1410, 0.1270, 0.2620, 0.3340,
      0.3980, 0.3940, 0.4770, 0.6580, 0.6910, 0.6960, 0.7490, 0.7960, 0.7350, 0.6130,
      0.4480, 0.3340, 0.3540, 0.2440, 0.3300, 0.3660, 0.3150, 0.2830, 0.3010, 0.2720,
      0.2060, 0.1450, 0.1380, 0.1340, 0.1070, 0.0680, 0.0700, 0.0640, 0.0360, 0.0100,
      0.0090, 0.0078, 0.0174, 0.0121, 0.0036, 0.0078, 0.0174, 0.0121, 0.0036, 0.0062
    ]
  },
  {
    id: 'chirp_sweep',
    name: 'Broadband Acoustic Chirp',
    type: 'SYNTHETIC',
    description: 'Synthetic wide-frequency sonar ping with gradual high-frequency dispersion.',
    features: Array.from({ length: 60 }, (_, i) => {
      const t = i / 59;
      return Math.sin(t * Math.PI) * 0.75 + Math.sin(t * Math.PI * 4) * 0.18 + 0.05;
    }).map(v => Math.max(0, Math.min(1, Number(v.toFixed(4)))))
  }
];

// Frequency Sub-Bands definitions for naval sonar
const SUB_BANDS = [
  { name: 'Low Freq (Penetration)', start: 1, end: 15, color: '#06b6d4' },
  { name: 'Mid Band (Resonance)', start: 16, end: 35, color: '#10b981' },
  { name: 'High Band (Scattering)', start: 36, end: 50, color: '#38bdf8' },
  { name: 'Ultra-High (Dissipation)', start: 51, end: 60, color: '#a855f7' }
];

export function SonarWaveChart({
  features,
  onFeaturesChange,
  predictedLabel,
  confidence,
  className,
  readOnly = false
}: SonarWaveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Display and interactive settings
  const [viewMode, setViewMode] = useState<'wave' | 'bars' | 'dual'>('dual');
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [isSculptMode, setIsSculptMode] = useState<boolean>(false);
  const [brushWidth, setBrushWidth] = useState<number>(3); // Number of neighbor bins affected
  const [hoveredBin, setHoveredBin] = useState<{
    index: number;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Animated sweep phase & smooth interpolation target values
  const sweepPhaseRef = useRef<number>(0);
  const currentFeaturesRef = useRef<number[]>([...features]);
  const isDraggingRef = useRef<boolean>(false);

  // Sync ref with incoming features prop smoothly
  useEffect(() => {
    if (features && features.length === 60) {
      // If sculpt mode is active and user is dragging, don't override ref immediately
      if (!isDraggingRef.current) {
        currentFeaturesRef.current = [...features];
      }
    }
  }, [features]);

  // Acoustic metrics computed over the 60 frequency channels
  const metrics = useMemo(() => {
    if (!features || features.length === 0) {
      return { peakVal: 0, peakBin: 1, centroid: 1, rms: 0, dynamicRangeDb: 0 };
    }
    let max = -Infinity;
    let maxIdx = 0;
    let weightedSum = 0;
    let sum = 0;
    let sumSquares = 0;

    features.forEach((val, idx) => {
      const v = Math.max(0, val);
      if (v > max) {
        max = v;
        maxIdx = idx;
      }
      weightedSum += (idx + 1) * v;
      sum += v;
      sumSquares += v * v;
    });

    const centroid = sum > 0 ? weightedSum / sum : 30;
    const rms = Math.sqrt(sumSquares / features.length);
    const minNonZero = Math.min(...features.filter(v => v > 0.0001)) || 0.001;
    const dynamicRangeDb = max > 0 ? 20 * Math.log10(max / minNonZero) : 0;

    return {
      peakVal: max,
      peakBin: maxIdx + 1,
      centroid: Number(centroid.toFixed(1)),
      rms: Number(rms.toFixed(3)),
      dynamicRangeDb: Number(Math.min(60, Math.max(0, dynamicRangeDb)).toFixed(1))
    };
  }, [features]);

  // Main Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      // Update sweep pulse if animated
      if (isAnimating) {
        sweepPhaseRef.current = (sweepPhaseRef.current + dt * 0.45) % 1;
      }

      // Smoothly interpolate current display values towards actual features
      const target = features;
      const current = currentFeaturesRef.current;
      const lerpSpeed = 12 * dt;
      let hasDifference = false;

      for (let i = 0; i < 60; i++) {
        const diff = (target[i] || 0) - (current[i] || 0);
        if (Math.abs(diff) > 0.0005) {
          current[i] += diff * Math.min(1, lerpSpeed);
          hasDifference = true;
        } else {
          current[i] = target[i] || 0;
        }
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      // Ensure canvas internal pixel buffer matches display DPR
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear with dark hydrophone radar slate background
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, width, height);

      // Define drawing area with inner padding
      const padLeft = 44;
      const padRight = 20;
      const padTop = 26;
      const padBottom = 34;
      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;

      if (chartW <= 10 || chartH <= 10) {
        ctx.restore();
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Draw Tactical Sonar Grid (dB & Amplitude lines)
      ctx.lineWidth = 1;
      const yGridLines = [
        { amp: 1.0, label: '1.0 (0 dB)' },
        { amp: 0.75, label: '0.75 (-2.5 dB)' },
        { amp: 0.50, label: '0.50 (-6.0 dB)' },
        { amp: 0.25, label: '0.25 (-12 dB)' },
        { amp: 0.0, label: '0.0 (-∞ dB)' }
      ];

      yGridLines.forEach((line) => {
        const y = padTop + chartH * (1 - line.amp);
        ctx.strokeStyle = line.amp === 0.0 ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.06)';
        ctx.setLineDash(line.amp === 0.0 || line.amp === 1.0 ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = line.amp === 0.0 ? 'rgba(74, 222, 128, 0.7)' : 'rgba(148, 163, 184, 0.5)';
        ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.label, padLeft - 6, y);
      });

      // 2. Frequency Sub-Band Background zones and labels
      const getXForBin = (binIdx: number) => {
        return padLeft + (binIdx / 59) * chartW;
      };

      SUB_BANDS.forEach((band, bIdx) => {
        const x1 = getXForBin(band.start - 1);
        const x2 = getXForBin(band.end - 1);
        const bandW = x2 - x1;

        // Subtle background tint for odd bands
        if (bIdx % 2 === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
          ctx.fillRect(x1, padTop, bandW, chartH);
        }

        // Band boundary line
        if (bIdx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath();
          ctx.moveTo(x1, padTop);
          ctx.lineTo(x1, padTop + chartH);
          ctx.stroke();
        }

        // Sub-band label at bottom
        ctx.fillStyle = band.color;
        ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`B${bIdx + 1}: F${band.start}–F${band.end}`, x1 + bandW / 2, padTop + chartH + 18);
      });

      // Horizontal axis channel labels (every 10 bins)
      [0, 9, 19, 29, 39, 49, 59].forEach((bIdx) => {
        const x = getXForBin(bIdx);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(x, padTop + chartH);
        ctx.lineTo(x, padTop + chartH + 4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`F${bIdx + 1}`, x, padTop + chartH + 5);
      });

      // 3. Coordinate calculation for all 60 bins
      const points: { x: number; y: number; val: number }[] = [];
      for (let i = 0; i < 60; i++) {
        const val = Math.max(0, Math.min(1, current[i] || 0));
        const x = getXForBin(i);
        const y = padTop + chartH * (1 - val);
        points.push({ x, y, val });
      }

      // 4. Render Spectral Bars (if in 'bars' or 'dual' mode)
      if (viewMode === 'bars' || viewMode === 'dual') {
        const barWidth = Math.max(2, (chartW / 60) * 0.55);

        points.forEach((pt, idx) => {
          const barH = padTop + chartH - pt.y;
          const isHovered = hoveredBin?.index === idx;
          const isPeak = idx === metrics.peakBin - 1 && pt.val > 0.1;

          // Gradient for bar
          const barGrad = ctx.createLinearGradient(0, pt.y, 0, padTop + chartH);
          if (predictedLabel === 'MINE') {
            barGrad.addColorStop(0, isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)');
            barGrad.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
          } else if (predictedLabel === 'ROCK') {
            barGrad.addColorStop(0, isHovered ? '#34d399' : 'rgba(52, 211, 153, 0.7)');
            barGrad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
          } else {
            barGrad.addColorStop(0, isHovered ? '#22d3ee' : 'rgba(34, 211, 238, 0.6)');
            barGrad.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
          }

          ctx.fillStyle = barGrad;
          ctx.fillRect(pt.x - barWidth / 2, pt.y, barWidth, barH);

          // Bar cap glow
          if (viewMode === 'bars') {
            ctx.fillStyle = isPeak ? '#fbbf24' : isHovered ? '#ffffff' : '#4ade80';
            ctx.fillRect(pt.x - barWidth / 2, pt.y - 1, barWidth, 2);
          }
        });
      }

      // 5. Render Spline Dynamic Wave Curve (if in 'wave' or 'dual' mode)
      if (viewMode === 'wave' || viewMode === 'dual') {
        // Spline path using Catmull-Rom or cubic Bezier
        const buildWavePath = () => {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);

          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            // Catmull-Rom to cubic Bezier conversion
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          }
        };

        // Fill area under spline wave with glowing acoustic gradient
        buildWavePath();
        ctx.lineTo(points[points.length - 1].x, padTop + chartH);
        ctx.lineTo(points[0].x, padTop + chartH);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
        if (predictedLabel === 'MINE') {
          areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          areaGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.15)');
          areaGrad.addColorStop(1, 'rgba(2, 132, 199, 0.01)');
        } else if (predictedLabel === 'ROCK') {
          areaGrad.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
          areaGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
          areaGrad.addColorStop(1, 'rgba(5, 150, 105, 0.01)');
        } else {
          areaGrad.addColorStop(0, 'rgba(34, 211, 238, 0.30)');
          areaGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
          areaGrad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
        }
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Stroke glowing wave line
        ctx.shadowColor = predictedLabel === 'MINE' 
          ? 'rgba(56, 189, 248, 0.7)' 
          : predictedLabel === 'ROCK' 
            ? 'rgba(52, 211, 153, 0.7)' 
            : 'rgba(34, 211, 238, 0.6)';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;

        buildWavePath();
        const strokeGrad = ctx.createLinearGradient(padLeft, 0, padLeft + chartW, 0);
        strokeGrad.addColorStop(0, '#06b6d4');
        strokeGrad.addColorStop(0.35, '#10b981');
        strokeGrad.addColorStop(0.7, '#38bdf8');
        strokeGrad.addColorStop(1, '#a855f7');
        ctx.strokeStyle = strokeGrad;
        ctx.stroke();

        ctx.shadowBlur = 0; // reset shadow
      }

      // 6. Draw Animated Sonar Sweep Pulse Line & Acoustic Ripple
      if (isAnimating) {
        const sweepX = padLeft + sweepPhaseRef.current * chartW;

        // Sweep vertical pulse bar
        const sweepGrad = ctx.createLinearGradient(sweepX - 20, 0, sweepX + 4, 0);
        sweepGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        sweepGrad.addColorStop(0.8, 'rgba(34, 211, 238, 0.08)');
        sweepGrad.addColorStop(1, 'rgba(74, 222, 128, 0.45)');

        ctx.fillStyle = sweepGrad;
        ctx.fillRect(sweepX - 20, padTop, 20, chartH);

        // Leading laser edge
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sweepX, padTop);
        ctx.lineTo(sweepX, padTop + chartH);
        ctx.stroke();

        // Glowing pulse head indicator at the bottom
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(sweepX, padTop + chartH, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Spectral Centroid Vertical Marker Line
      const centroidX = getXForBin(metrics.centroid - 1);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centroidX, padTop);
      ctx.lineTo(centroidX, padTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Centroid label
      ctx.fillStyle = '#fbbf24';
      ctx.font = '8px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Centroid: F${metrics.centroid}`, centroidX, padTop - 8);

      // 8. Dominant Peak Marker
      const peakIdx = metrics.peakBin - 1;
      if (peakIdx >= 0 && peakIdx < points.length && points[peakIdx].val > 0.05) {
        const peakPt = points[peakIdx];
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(peakPt.x, peakPt.y, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(peakPt.x, peakPt.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Peak F${metrics.peakBin} (${metrics.peakVal.toFixed(3)})`, peakPt.x, Math.max(padTop - 6, peakPt.y - 10));
      }

      // 9. Interactive Hover & Crosshair Reticle
      if (hoveredBin && hoveredBin.index >= 0 && hoveredBin.index < points.length) {
        const hoverPt = points[hoveredBin.index];

        // Vertical crosshair line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoverPt.x, padTop);
        ctx.lineTo(hoverPt.x, padTop + chartH);
        ctx.stroke();

        // Horizontal crosshair line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(padLeft, hoverPt.y);
        ctx.lineTo(padLeft + chartW, hoverPt.y);
        ctx.stroke();

        // Concentric target dot
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(hoverPt.x, hoverPt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hoverPt.x, hoverPt.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [features, viewMode, isAnimating, hoveredBin, predictedLabel, metrics]);

  // Coordinate mapping helper for mouse/touch events
  const getBinAndValueFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const padLeft = 44;
    const padRight = 20;
    const padTop = 26;
    const padBottom = 34;
    const chartW = rect.width - padLeft - padRight;
    const chartH = rect.height - padTop - padBottom;

    if (chartW <= 0 || chartH <= 0) return null;

    // Calculate clamped bin index (0 to 59)
    const normX = Math.max(0, Math.min(1, (x - padLeft) / chartW));
    const binIdx = Math.round(normX * 59);

    // Calculate clamped amplitude value (0.0 to 1.0)
    const normY = 1 - Math.max(0, Math.min(1, (y - padTop) / chartH));
    const amplitude = Number(normY.toFixed(4));

    return { binIdx, amplitude, x, y };
  }, []);

  // Handle direct canvas sculpting / dragging
  const applyBrushToFeatures = useCallback((centerIdx: number, targetAmp: number) => {
    if (readOnly || !onFeaturesChange) return;

    const next = [...features];
    const radius = Math.max(1, brushWidth);

    for (let i = 0; i < 60; i++) {
      const dist = Math.abs(i - centerIdx);
      if (dist <= radius) {
        // Gaussian falloff brush
        const weight = Math.exp(-(dist * dist) / (2 * (radius * 0.75) * (radius * 0.75)));
        const original = next[i];
        const sculpted = original + (targetAmp - original) * weight;
        next[i] = Number(Math.max(0, Math.min(1, sculpted)).toFixed(4));
      }
    }

    onFeaturesChange(next);
  }, [features, brushWidth, onFeaturesChange, readOnly]);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = getBinAndValueFromEvent(e);
    if (!pos) return;

    isDraggingRef.current = true;
    if (isSculptMode) {
      applyBrushToFeatures(pos.binIdx, pos.amplitude);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getBinAndValueFromEvent(e);
    if (!pos) {
      setHoveredBin(null);
      return;
    }

    setHoveredBin({
      index: pos.binIdx,
      value: features[pos.binIdx] || 0,
      x: pos.x,
      y: pos.y
    });

    if (isDraggingRef.current && isSculptMode && !readOnly) {
      applyBrushToFeatures(pos.binIdx, pos.amplitude);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
    setHoveredBin(null);
  };

  // Preset signature selection
  const handleSelectPreset = (presetFeatures: number[]) => {
    if (onFeaturesChange) {
      onFeaturesChange([...presetFeatures]);
    }
  };

  // Find sub-band for hovered bin
  const hoveredSubBand = useMemo(() => {
    if (!hoveredBin) return null;
    const binNum = hoveredBin.index + 1;
    return SUB_BANDS.find(b => binNum >= b.start && binNum <= b.end) || SUB_BANDS[0];
  }, [hoveredBin]);

  return (
    <div className={cn(
      'bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 space-y-4 relative overflow-hidden transition-all',
      predictedLabel === 'MINE' && 'border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]',
      predictedLabel === 'ROCK' && 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]',
      className
    )}>
      {/* Top Header: Title, Real-Time Acoustic Metrics, Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Waves size={16} className="text-cyan-400" />
              Dynamic 60-Bin Sonar Acoustic Waveform
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>60 Acoustic Frequency Channels (F1–F60)</span>
            <span aria-hidden="true">·</span>
            <span>Hydrophone Sonar Profile</span>
            {predictedLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className={cn(
                  'font-mono font-semibold',
                  predictedLabel === 'MINE' ? 'text-cyan-400' : 'text-emerald-400'
                )}>
                  Target: {predictedLabel} {confidence ? `(${(confidence * 100).toFixed(1)}%)` : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* View Mode & Animation Controls */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {/* Dual / Wave / Bars View Selector */}
          <button
            type="button"
            onClick={() => setViewMode('dual')}
            title="Dual Overlay (Wave + Bins)"
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
              viewMode === 'dual' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            )}
          >
            <Activity size={13} />
            <span className="hidden md:inline">Dual</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('wave')}
            title="Spline Waveform Curve"
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
              viewMode === 'wave' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            )}
          >
            <Waves size={13} />
            <span className="hidden md:inline">Wave</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            title="Discrete Channel Bins"
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
              viewMode === 'bars' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            )}
          >
            <BarChart3 size={13} />
            <span className="hidden md:inline">Bins</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Sonar Pulse Sweep Animation Toggle */}
          <button
            type="button"
            onClick={() => setIsAnimating(!isAnimating)}
            title={isAnimating ? 'Pause Sonar Sweep' : 'Start Sonar Sweep'}
            className={cn(
              'p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              isAnimating ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {isAnimating ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Interactive Sculpt Mode Toggle */}
          {!readOnly && onFeaturesChange && (
            <button
              type="button"
              onClick={() => setIsSculptMode(!isSculptMode)}
              title={isSculptMode ? 'Exit Wave Sculpt Mode' : 'Click/Drag Canvas to Sculpt Wave'}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
                isSculptMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">{isSculptMode ? 'Sculpting On' : 'Sculpt Wave'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Spectral Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/40 p-2.5 rounded-xl border border-white/5 text-xs font-mono">
        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] rounded-lg">
          <span className="text-slate-500 text-[11px]">Peak Harmonic</span>
          <span className="text-amber-400 font-bold">
            F{metrics.peakBin} <span className="text-slate-400 text-[10px]">({metrics.peakVal.toFixed(3)})</span>
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] rounded-lg">
          <span className="text-slate-500 text-[11px]">Spectral Centroid</span>
          <span className="text-cyan-300 font-bold">Bin {metrics.centroid}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] rounded-lg">
          <span className="text-slate-500 text-[11px]">RMS Energy</span>
          <span className="text-emerald-400 font-bold">{metrics.rms}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] rounded-lg">
          <span className="text-slate-500 text-[11px]">Dynamic Range</span>
          <span className="text-slate-300 font-bold">{metrics.dynamicRangeDb} dB</span>
        </div>
      </div>

      {/* Main Waveform Canvas Container */}
      <div 
        ref={containerRef}
        className={cn(
          'relative w-full h-64 sm:h-72 bg-[#050b14] rounded-xl border border-white/10 overflow-hidden select-none',
          isSculptMode && 'cursor-crosshair ring-1 ring-amber-500/30'
        )}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          className="w-full h-full block"
        />

        {/* Floating Laser Tooltip on Bin Hover */}
        {hoveredBin && hoveredSubBand && (
          <div 
            className="absolute pointer-events-none z-20 bg-slate-900/95 border border-cyan-500/40 shadow-xl rounded-xl p-2.5 text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md"
            style={{
              left: `${Math.max(70, Math.min(hoveredBin.x, (containerRef.current?.clientWidth || 300) - 70))}px`,
              top: `${Math.max(40, hoveredBin.y - 12)}px`
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1.5">
              <span className="font-bold text-cyan-300 text-sm">Channel F{hoveredBin.index + 1}</span>
              <span 
                className="text-[10px] font-sans px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${hoveredSubBand.color}20`, color: hoveredSubBand.color }}
              >
                {hoveredSubBand.name.split(' ')[0]}
              </span>
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between gap-4 text-slate-400">
                <span>Normalized Amp:</span>
                <span className="text-white font-bold">{hoveredBin.value.toFixed(4)}</span>
              </div>
              <div className="flex justify-between gap-4 text-slate-400">
                <span>Decibel Level:</span>
                <span className="text-slate-300">
                  {hoveredBin.value > 0.0001 ? `${(20 * Math.log10(hoveredBin.value)).toFixed(1)} dB` : '-∞ dB'}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-slate-400">
                <span>Sub-Band Span:</span>
                <span className="text-slate-400">F{hoveredSubBand.start} – F{hoveredSubBand.end}</span>
              </div>
            </div>
            {isSculptMode && (
              <div className="mt-1.5 pt-1 border-t border-white/10 text-[10px] text-amber-300 flex items-center gap-1 font-sans">
                <Sliders size={11} />
                <span>Drag to sculpt amplitude</span>
              </div>
            )}
          </div>
        )}

        {/* Sculpt Mode Brush Indicator Overlay */}
        {isSculptMode && (
          <div className="absolute top-2 right-2 bg-amber-950/80 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-lg text-xs flex items-center gap-2 backdrop-blur-md">
            <Sliders size={13} />
            <span>Brush Width:</span>
            <div className="flex items-center gap-1">
              {[1, 3, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setBrushWidth(w)}
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors',
                    brushWidth === w ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preset Acoustic Profiles & Quick Action Buttons */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={14} className="text-cyan-400" />
            Load Representative Sonar Frequency Profiles
          </span>
          {onFeaturesChange && (
            <button
              type="button"
              onClick={() => onFeaturesChange(new Array(60).fill(0))}
              className="text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Zero All Bins
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_SIGNATURES.map((preset) => {
            const isMatch = features && features.length === 60 && 
              features.every((v, i) => Math.abs(v - preset.features[i]) < 0.001);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.features)}
                className={cn(
                  'text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1 group',
                  isMatch 
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn(
                    'text-xs font-bold transition-colors',
                    isMatch ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'
                  )}>
                    {preset.name}
                  </span>
                  {isMatch && <Check size={14} className="text-cyan-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className={cn(
                    preset.type === 'MINE' && 'text-cyan-400/90',
                    preset.type === 'ROCK' && 'text-emerald-400/90',
                    preset.type === 'AMBIGUOUS' && 'text-amber-400/90',
                    preset.type === 'SYNTHETIC' && 'text-purple-400/90'
                  )}>
                    Type: {preset.type}
                  </span>
                  <span>60 Bins</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
