import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Activity, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  getWebGLCapabilities,
  createStudioRenderer,
  applyStudioEnvironmentAndLighting,
  createContactShadowPlane,
  scheduleAfterDraw,
  disposeThreeScene,
} from './webglUtils';

export interface SignalFeature3DProps {
  /** Array of 60 real numerical sonar frequency features in [0, 1] */
  features: number[];
  /** Optional selected bin index (0..59) */
  selectedBinIndex?: number | null;
  /** Callback when a user clicks one of the 60 3D frequency pillars */
  onSelectBin?: (binIndex: number) => void;
  /** Source label for transparency (e.g. "Live Prediction Input" or "UCI Dataset Sample #12") */
  sourceLabel?: string;
  /** Optional class label if known ("Rock" | "Mine" | "ROCK" | "MINE") */
  classLabel?: string | null;
  className?: string;
  heightClass?: string;
}

type SpatialLayoutMode = 'ring' | 'ridge';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

/**
 * 3D Signal Feature Visualization (Data-Driven)
 * - Renders the 60 real numerical sonar frequency features (F1..F60) using a 60-instance THREE.InstancedMesh
 * - Connects the 60 real feature crests with a 3D CatmullRomCurve3 TubeGeometry envelope
 * - Displays a 3D Mean Energy reference plane/ring computed from the actual 60 values
 * - Supports raycasting hover & click to inspect and focus individual frequency bins
 */
export function SignalFeature3D({
  features,
  selectedBinIndex = null,
  onSelectBin,
  sourceLabel = '60-Bin Sonar Frequency Vector',
  classLabel = null,
  className = '',
  heightClass = 'h-[380px] sm:h-[420px]',
}: SignalFeature3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<SpatialLayoutMode>('ring');
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const normalizedFeatures = useMemo(() => {
    const arr = new Array(60).fill(0);
    for (let i = 0; i < 60; i++) {
      const val = Number(features?.[i] ?? 0);
      arr[i] = Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0;
    }
    return arr;
  }, [features]);

  const stats = useMemo(() => {
    let sum = 0;
    let maxVal = -1;
    let maxIdx = 0;
    for (let i = 0; i < 60; i++) {
      const v = normalizedFeatures[i];
      sum += v;
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }
    return {
      mean: sum / 60,
      maxVal: Math.max(0, maxVal),
      maxIdx,
    };
  }, [normalizedFeatures]);

  const featuresRef = useRef<number[]>(normalizedFeatures);
  featuresRef.current = normalizedFeatures;

  const selectedBinRef = useRef<number | null>(selectedBinIndex);
  selectedBinRef.current = selectedBinIndex;

  const hoveredBinRef = useRef<number | null>(hoveredBin);
  hoveredBinRef.current = hoveredBin;

  const layoutModeRef = useRef<SpatialLayoutMode>(layoutMode);
  layoutModeRef.current = layoutMode;

  const onSelectBinRef = useRef(onSelectBin);
  onSelectBinRef.current = onSelectBin;

  const resetCamTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const caps = getWebGLCapabilities();
    if (!caps.supported) {
      setWebglAvailable(false);
      return;
    }

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 260);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createStudioRenderer(width, height, caps.isSoftwareGl);
    } catch {
      setWebglAvailable(false);
      return;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const { envTexture } = applyStudioEnvironmentAndLighting(
      renderer,
      scene,
      caps.isSoftwareGl
    );

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 5.8, 8.6);
    camera.lookAt(0, 1.1, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !caps.isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 4.0;
    controls.maxDistance = 16.0;
    controls.target.set(0, 1.0, 0);

    const { mesh: shadowPlane, texture: shadowTex } = createContactShadowPlane(
      5.5,
      '#000000',
      '#10b981'
    );
    scene.add(shadowPlane);

    // Base reference platform
    const platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const gridHelper = new THREE.GridHelper(9.6, 24, 0x10b981, 0x064e3b);
    gridHelper.position.y = 0.015;
    platformGroup.add(gridHelper);

    // Composite central acoustic reference core (3-part THREE.Group)
    const centerCoreGroup = new THREE.Group();
    scene.add(centerCoreGroup);

    const coreBaseGeo = new THREE.CylinderGeometry(0.65, 0.8, 0.16, 24);
    coreBaseGeo.translate(0, 0.08, 0);
    const coreBaseMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.45,
      metalness: 0.82,
    });
    centerCoreGroup.add(new THREE.Mesh(coreBaseGeo, coreBaseMat));

    const coreRingGeo = new THREE.TorusGeometry(0.52, 0.04, 16, 40);
    coreRingGeo.rotateX(Math.PI / 2);
    const coreRingMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.18,
      metalness: 0.92,
    });
    const coreRingMesh = new THREE.Mesh(coreRingGeo, coreRingMat);
    coreRingMesh.position.y = 0.18;
    centerCoreGroup.add(coreRingMesh);

    const coreCrystalGeo = new THREE.OctahedronGeometry(0.24, 0);
    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.35,
      clearcoat: 1.0,
    });
    const coreCrystalMesh = new THREE.Mesh(coreCrystalGeo, coreCrystalMat);
    coreCrystalMesh.position.y = 0.48;
    centerCoreGroup.add(coreCrystalMesh);

    // -------------------------------------------------------------------------
    // 60-Bin Instanced Frequency Pillars (unit height = 1, bottom-pivoted at y=0)
    // -------------------------------------------------------------------------
    const binCount = 60;
    const pillarGeo = new THREE.CylinderGeometry(0.085, 0.105, 1.0, 12);
    pillarGeo.translate(0, 0.5, 0); // Pivot at bottom-center (y = 0)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.72,
    });

    const pillarInstanced = new THREE.InstancedMesh(pillarGeo, pillarMat, binCount);
    pillarInstanced.castShadow = !caps.isSoftwareGl;
    pillarInstanced.receiveShadow = !caps.isSoftwareGl;
    pillarInstanced.frustumCulled = false;
    scene.add(pillarInstanced);

    // Mean Energy Reference Ring (for Ring mode)
    const meanRingGeo = new THREE.TorusGeometry(3.2, 0.025, 12, 64);
    meanRingGeo.rotateX(Math.PI / 2);
    const meanRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.65,
    });
    const meanRingMesh = new THREE.Mesh(meanRingGeo, meanRingMat);
    scene.add(meanRingMesh);

    // Continuous 3D Envelope Line connecting the tops of all 60 pillars
    const crestPositions = new Float32Array(binCount * 3);
    const crestGeo = new THREE.BufferGeometry();
    crestGeo.setAttribute('position', new THREE.BufferAttribute(crestPositions, 3));
    const crestMat = new THREE.LineBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.85,
    });
    const crestLine = new THREE.Line(crestGeo, crestMat);
    scene.add(crestLine);

    // Current smoothed heights for silky-smooth damping when features change
    const currentHeights = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) {
      currentHeights[i] = Math.max(0.08, featuresRef.current[i] * 3.2);
    }

    // -------------------------------------------------------------------------
    // Raycasting for Hover & Click Inspection on the 60 Instanced Pillars
    // -------------------------------------------------------------------------
    let lastRaycastTime = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastTime < 32) return; // Throttle to ~30Hz
      lastRaycastTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObject(pillarInstanced, false);
      if (hits.length > 0 && typeof hits[0].instanceId === 'number') {
        const idx = hits[0].instanceId;
        if (hoveredBinRef.current !== idx) {
          setHoveredBin(idx);
        }
      } else if (hoveredBinRef.current !== null) {
        setHoveredBin(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObject(pillarInstanced, false);
      if (hits.length > 0 && typeof hits[0].instanceId === 'number') {
        onSelectBinRef.current?.(hits[0].instanceId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const handleResize = () => {
      if (!container) return;
      const newW = Math.max(container.clientWidth, 260);
      const newH = Math.max(container.clientHeight, 240);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------------------
    // Animation Loop
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let frameId = 0;
    let timerId = 0;
    let unmounted = false;

    const tick = () => {
      if (unmounted) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const damp = 1 - Math.exp(-8 * dt);

      if (resetCamTriggerRef.current) {
        camera.position.lerp(new THREE.Vector3(0, 5.8, 8.6), damp);
        controls.target.lerp(new THREE.Vector3(0, 1.0, 0), damp);
        if (camera.position.distanceToSquared(new THREE.Vector3(0, 5.8, 8.6)) < 0.01) {
          resetCamTriggerRef.current = false;
        }
      }

      const vals = featuresRef.current;
      const mode = layoutModeRef.current;
      const selIdx = selectedBinRef.current;
      const hovIdx = hoveredBinRef.current;

      let sum = 0;
      const posAttr = crestGeo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < binCount; i++) {
        const rawVal = vals[i] ?? 0;
        sum += rawVal;
        const targetH = Math.max(0.08, rawVal * 3.2);
        currentHeights[i] = THREE.MathUtils.lerp(currentHeights[i], targetH, damp);

        let x = 0;
        let z = 0;
        let rotY = 0;

        if (mode === 'ring') {
          const angle = (i / binCount) * Math.PI * 2 - Math.PI / 2;
          const radius = 3.2;
          x = Math.cos(angle) * radius;
          z = Math.sin(angle) * radius;
          rotY = -angle;
        } else {
          // 3D Linear Spectral Ridge with subtle acoustic wave curvature
          x = ((i / (binCount - 1)) - 0.5) * 8.2;
          z = Math.sin((i / binCount) * Math.PI * 2) * 0.85;
          rotY = 0;
        }

        const isHighlighted = i === selIdx || i === hovIdx;
        const widthScale = isHighlighted ? 1.45 : 1.0;

        _dummy.position.set(x, 0.02, z);
        _dummy.rotation.set(0, rotY, 0);
        _dummy.scale.set(widthScale, currentHeights[i], widthScale);
        _dummy.updateMatrix();
        pillarInstanced.setMatrixAt(i, _dummy.matrix);

        // Color mapping based on real feature amplitude + highlight state
        if (i === selIdx) {
          _color.setHex(0xfbbf24); // Amber highlight for selected bin
        } else if (i === hovIdx) {
          _color.setHex(0xffffff); // Crisp white highlight on hover
        } else if (rawVal >= 0.75) {
          _color.setHex(0x22d3ee); // High amplitude cyan
        } else if (rawVal >= 0.4) {
          _color.setHex(0x34d399); // Mid amplitude emerald
        } else {
          _color.setHex(0x10b981); // Base neon green
        }
        pillarInstanced.setColorAt(i, _color);

        posAttr.setXYZ(i, x, 0.04 + currentHeights[i], z);
      }

      pillarInstanced.instanceMatrix.needsUpdate = true;
      if (pillarInstanced.instanceColor) pillarInstanced.instanceColor.needsUpdate = true;
      posAttr.needsUpdate = true;

      const meanVal = sum / binCount;
      const meanHeight = Math.max(0.08, meanVal * 3.2);
      meanRingMesh.visible = mode === 'ring';
      meanRingMesh.position.y = 0.02 + meanHeight;

      centerCoreGroup.visible = mode === 'ring';
      coreCrystalMesh.rotation.y = elapsed * 0.7;

      controls.update();
      renderer.render(scene, camera);

      if (caps.isSoftwareGl) {
        scheduleAfterDraw(renderer, tick, (id) => {
          timerId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      disposeThreeScene(scene, renderer, [envTexture, shadowTex]);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const inspectedBinIndex = hoveredBin ?? selectedBinIndex;
  const inspectedValue =
    inspectedBinIndex !== null && inspectedBinIndex >= 0 && inspectedBinIndex < 60
      ? normalizedFeatures[inspectedBinIndex]
      : null;

  if (!webglAvailable || contextLost) {
    return (
      <div
        className={`relative rounded-3xl border border-green-500/25 bg-[#020806] p-6 flex flex-col justify-between ${heightClass} ${className}`}
        role="region"
        aria-label="60-Bin Signal Feature Fallback Visualization"
      >
        <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
          <span>2D Signal Feature Spectrum Fallback (60 Real Sonar Bins)</span>
          <span>Mean Energy: {stats.mean.toFixed(4)}</span>
        </div>
        <div className="flex items-end gap-0.5 h-44 w-full pt-4">
          {normalizedFeatures.map((val, idx) => (
            <div
              key={idx}
              onClick={() => onSelectBin?.(idx)}
              style={{ height: `${Math.max(6, val * 100)}%` }}
              className="flex-1 bg-emerald-400/80 hover:bg-cyan-300 transition-colors rounded-t cursor-pointer"
              title={`F${idx + 1}: ${val.toFixed(4)}`}
            />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 font-mono text-center">
          Source: {sourceLabel} · Peak Bin: F{stats.maxIdx + 1} ({stats.maxVal.toFixed(4)})
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl border border-green-500/25 bg-[#020806] overflow-hidden select-none ${heightClass} ${className}`}
      role="region"
      aria-label="Interactive 3D 60-Bin Sonar Feature Visualization"
    >
      {/* Dedicated WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Overlay (Solid Surface, Data-Driven Telemetry) */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-start justify-between gap-2 pointer-events-none z-10">
        <div className="bg-[#030d09]/92 border border-emerald-500/30 rounded-2xl px-3.5 py-2 space-y-1 max-w-md">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
            <Activity size={14} className="text-emerald-400 shrink-0" />
            <span>3D Signal Feature Visualization (60 Bins)</span>
            {classLabel && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-300">{classLabel}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Source: <span className="text-slate-200 font-mono">{sourceLabel}</span>. Click any 3D pillar to inspect or focus its frequency bin.
          </p>
        </div>

        <div className="bg-[#030d09]/92 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 space-y-0.5 tabular-nums">
          <div>
            Mean Energy: <span className="text-cyan-300 font-bold">{stats.mean.toFixed(4)}</span>
            <span className="text-slate-500"> · </span>
            Peak: <span className="text-emerald-400 font-bold">F{stats.maxIdx + 1} ({stats.maxVal.toFixed(4)})</span>
          </div>
          <div>
            {inspectedBinIndex !== null && inspectedValue !== null ? (
              <span>
                Inspected Bin:{' '}
                <strong className="text-amber-300">
                  F{inspectedBinIndex + 1} = {inspectedValue.toFixed(4)}
                </strong>
              </span>
            ) : (
              <span className="text-slate-400">Hover or click a 3D bar to inspect F1–F60</span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
        <button
          type="button"
          onClick={() => setDockCollapsed((p) => !p)}
          className="px-3 py-1 rounded-t-xl bg-[#04120c] border border-b-0 border-emerald-500/30 text-[11px] font-mono text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          {dockCollapsed ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{dockCollapsed ? 'Show 3D Spectrum Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="bg-[#04120c]/95 border border-emerald-500/35 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-center gap-2 shadow-2xl">
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setLayoutMode('ring')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  layoutMode === 'ring'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                360° Ring Array
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('ridge')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  layoutMode === 'ridge'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Linear Ridge
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                resetCamTriggerRef.current = true;
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <RotateCcw size={12} />
              <span>Reset Camera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
