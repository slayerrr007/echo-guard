import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Compass, Eye, EyeOff, Pause, Play, RotateCcw } from 'lucide-react';
import {
  getWebGLCapabilities,
  createStudioRenderer,
  applyStudioEnvironmentAndLighting,
  createContactShadowPlane,
  createProceduralSurfaceBumpTexture,
  scheduleAfterDraw,
  disposeThreeScene,
} from './webglUtils';

export interface SonarRadar3DProps {
  className?: string;
  heightClass?: string;
  /** Optional real model accuracy or active model label for display in the non-intrusive header */
  activeModelLabel?: string;
  verifiedAccuracyText?: string;
}

type CameraPreset = 'isometric' | 'top' | 'horizon';

const _dummyObj = new THREE.Object3D();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 0.35, 0);

/**
 * Interactive 3D Sonar Radar Visualization
 * - Rotating sonar-inspired 3D concentric grid and 36 instanced perimeter range pillars
 * - Multi-part composite 6-piece central acoustic transducer array (THREE.Group)
 * - Neon-green scanning sweep cone, expanding ping wave ring, and subtle suspended acoustic particles
 * - Clearly labeled as a decorative visualization (never claims to detect mines itself)
 */
export function SonarRadar3D({
  className = '',
  heightClass = 'h-[420px] sm:h-[460px]',
  activeModelLabel = 'Random Forest / KNN / LogReg',
  verifiedAccuracyText,
}: SonarRadar3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sweepSpeed, setSweepSpeed] = useState<number>(1);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const sweepSpeedRef = useRef(sweepSpeed);
  sweepSpeedRef.current = sweepSpeed;

  const presetTriggerRef = useRef<{ preset: CameraPreset; active: boolean }>({
    preset: 'isometric',
    active: false,
  });

  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    presetTriggerRef.current = { preset, active: true };
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const caps = getWebGLCapabilities();
    if (!caps.supported) {
      setWebglAvailable(false);
      return;
    }

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 280);

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
    camera.position.set(0, 6.8, 8.8);
    camera.lookAt(0, 0.35, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !caps.isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 4.2;
    controls.maxDistance = 16;
    controls.target.set(0, 0.35, 0);

    const onControlStart = () => {
      presetTriggerRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    const metalBump = createProceduralSurfaceBumpTexture(renderer, 'metal');
    const { mesh: shadowPlane, texture: shadowTex } = createContactShadowPlane(
      5.2,
      '#000000',
      '#10b981'
    );
    scene.add(shadowPlane);

    // -------------------------------------------------------------------------
    // 1. Concentric Sonar Range Rings & Radial Bearing Grid
    // -------------------------------------------------------------------------
    const radarDeckGroup = new THREE.Group();
    scene.add(radarDeckGroup);

    const baseDiscGeo = new THREE.CircleGeometry(4.8, 64);
    baseDiscGeo.rotateX(-Math.PI / 2);
    const baseDiscMat = new THREE.MeshStandardMaterial({
      color: 0x03120c,
      roughness: 0.78,
      metalness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const baseDisc = new THREE.Mesh(baseDiscGeo, baseDiscMat);
    baseDisc.receiveShadow = !caps.isSoftwareGl;
    baseDisc.position.y = 0.0;
    radarDeckGroup.add(baseDisc);

    const ringRadii = [1.1, 2.2, 3.3, 4.4];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.022, r + 0.022, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === ringRadii.length - 1 ? 0x34d399 : 0x10b981,
        transparent: true,
        opacity: idx === ringRadii.length - 1 ? 0.55 : 0.32,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.02 + idx * 0.002;
      radarDeckGroup.add(ringMesh);
    });

    // 8 radial azimuth bearing lines
    const linePoints: number[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      linePoints.push(cos * 0.65, 0.025, sin * 0.65, cos * 4.55, 0.025, sin * 4.55);
    }
    const radialLinesGeo = new THREE.BufferGeometry();
    radialLinesGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePoints, 3)
    );
    const radialLinesMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.28,
    });
    const radialLines = new THREE.LineSegments(radialLinesGeo, radialLinesMat);
    radarDeckGroup.add(radialLines);

    // 36 Instanced Perimeter Azimuth Tick Pillars (>20 repeated elements -> InstancedMesh)
    const tickCount = 36;
    const tickGeo = new THREE.BoxGeometry(0.04, 0.14, 0.16);
    tickGeo.translate(0, 0.07, 0); // bottom-center pivot at y=0
    const tickMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.7,
    });
    const tickInstanced = new THREE.InstancedMesh(tickGeo, tickMat, tickCount);
    const tickColor = new THREE.Color();

    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const isCardinal = i % 9 === 0;
      const r = 4.58;
      _dummyObj.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
      _dummyObj.rotation.set(0, -angle + Math.PI / 2, 0);
      _dummyObj.scale.set(
        isCardinal ? 1.6 : 1.0,
        isCardinal ? 1.85 : 0.9 + (i % 3) * 0.12,
        isCardinal ? 1.4 : 1.0
      );
      _dummyObj.updateMatrix();
      tickInstanced.setMatrixAt(i, _dummyObj.matrix);

      tickColor.setHex(isCardinal ? 0x22d3ee : 0x34d399);
      tickInstanced.setColorAt(i, tickColor);
    }
    tickInstanced.instanceMatrix.needsUpdate = true;
    if (tickInstanced.instanceColor) tickInstanced.instanceColor.needsUpdate = true;
    tickInstanced.computeBoundingSphere();
    radarDeckGroup.add(tickInstanced);

    // -------------------------------------------------------------------------
    // 2. Composite 6-Part Central Sonar Transducer Beacon (THREE.Group)
    // -------------------------------------------------------------------------
    const transducerGroup = new THREE.Group();
    transducerGroup.position.set(0, 0, 0);
    scene.add(transducerGroup);

    // Part 1 (Primary Silhouette): Heavy machined octagonal seabed base plinth
    const plinthGeo = new THREE.CylinderGeometry(0.62, 0.78, 0.22, 8);
    plinthGeo.translate(0, 0.11, 0);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f291e,
      roughness: 0.42,
      metalness: 0.85,
      bumpMap: metalBump,
      bumpScale: 0.015,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.castShadow = !caps.isSoftwareGl;
    plinthMesh.receiveShadow = !caps.isSoftwareGl;
    transducerGroup.add(plinthMesh);

    // Part 2 (Secondary Read): Brushed azimuth collar ring (roughness delta >= 0.25)
    const collarGeo = new THREE.TorusGeometry(0.56, 0.055, 16, 48);
    collarGeo.rotateX(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.16,
      metalness: 0.92,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.23;
    transducerGroup.add(collarMesh);

    // Part 3 (Secondary Read): Pressurized acoustic transducer core column
    const columnGeo = new THREE.CylinderGeometry(0.36, 0.46, 0.42, 24);
    columnGeo.translate(0, 0.43, 0);
    const columnMat = new THREE.MeshPhysicalMaterial({
      color: 0x064e3b,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.55,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
    });
    const columnMesh = new THREE.Mesh(columnGeo, columnMat);
    columnMesh.castShadow = !caps.isSoftwareGl;
    transducerGroup.add(columnMesh);

    // Rotating Turret Sub-Group (Parts 4, 5, 6 rotate with the sonar sweep)
    const turretHeadGroup = new THREE.Group();
    turretHeadGroup.position.y = 0.64;
    transducerGroup.add(turretHeadGroup);

    // Part 4 (Secondary Read): Lathe-turned parabolic acoustic dish
    const dishPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.18, 0.04),
      new THREE.Vector2(0.34, 0.14),
      new THREE.Vector2(0.44, 0.28),
      new THREE.Vector2(0.39, 0.31),
      new THREE.Vector2(0.12, 0.09),
      new THREE.Vector2(0.0, 0.06),
    ];
    const dishGeo = new THREE.LatheGeometry(dishPoints, 32);
    dishGeo.rotateZ(-Math.PI * 0.22);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.22,
      metalness: 0.88,
      bumpMap: metalBump,
      bumpScale: 0.01,
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.castShadow = !caps.isSoftwareGl;
    turretHeadGroup.add(dishMesh);

    // Part 5 (Accent Detail): Gimbal yoke mount
    const yokeGeo = new THREE.BoxGeometry(0.24, 0.18, 0.24);
    const yokeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.75,
    });
    const yokeMesh = new THREE.Mesh(yokeGeo, yokeMat);
    yokeMesh.position.y = -0.04;
    turretHeadGroup.add(yokeMesh);

    // Part 6 (Accent Detail): Focal emitter spire & crystalline tip
    const spireGeo = new THREE.OctahedronGeometry(0.11, 0);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x34d399,
      emissiveIntensity: 1.1,
      roughness: 0.12,
      metalness: 0.3,
    });
    const spireMesh = new THREE.Mesh(spireGeo, spireMat);
    spireMesh.position.set(0.22, 0.24, 0);
    turretHeadGroup.add(spireMesh);

    // -------------------------------------------------------------------------
    // 3. Green Scanning Sweep Wedge & Expanding Ping Wave Ring
    // -------------------------------------------------------------------------
    const sweepGroup = new THREE.Group();
    sweepGroup.position.y = 0.035;
    scene.add(sweepGroup);

    const sweepArcAngle = Math.PI * 0.34;
    const sweepGeo = new THREE.CircleGeometry(4.45, 40, -sweepArcAngle, sweepArcAngle);
    sweepGeo.rotateX(-Math.PI / 2);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepGroup.add(sweepMesh);

    // Leading laser line of the sweep
    const leadLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.45, 0.01, 0),
      new THREE.Vector3(4.48, 0.01, 0),
    ]);
    const leadLineMat = new THREE.LineBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.95,
    });
    const leadLine = new THREE.Line(leadLineGeo, leadLineMat);
    sweepGroup.add(leadLine);

    // Expanding sonar pulse wave ring
    const pulseRingGeo = new THREE.RingGeometry(0.95, 1.02, 64);
    pulseRingGeo.rotateX(-Math.PI / 2);
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pulseRingMesh = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    pulseRingMesh.position.y = 0.04;
    scene.add(pulseRingMesh);

    // -------------------------------------------------------------------------
    // 4. Subtle Acoustic Scatter Particles (THREE.Points)
    // -------------------------------------------------------------------------
    const particleCount = 140;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const pColor = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      // Deterministic pseudo-random distribution in cylindrical radar volume
      const seed1 = Math.sin(i * 12.9898) * 43758.5453;
      const u = seed1 - Math.floor(seed1);
      const seed2 = Math.sin(i * 78.233) * 43758.5453;
      const v = seed2 - Math.floor(seed2);
      const seed3 = Math.sin(i * 39.425) * 43758.5453;
      const w = seed3 - Math.floor(seed3);

      const radius = 0.8 + Math.sqrt(u) * 3.7;
      const theta = v * Math.PI * 2;
      const y = 0.12 + w * 2.1;

      particlePositions[i * 3] = Math.cos(theta) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(theta) * radius;

      pColor.setHex(i % 4 === 0 ? 0x22d3ee : 0x34d399);
      particleColors[i * 3] = pColor.r;
      particleColors[i * 3 + 1] = pColor.g;
      particleColors[i * 3 + 2] = pColor.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particlesGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(particleColors, 3)
    );
    const particlesMat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    if (!caps.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------------------
    // 5. WebGL Context Loss & Resize Listeners
    // -------------------------------------------------------------------------
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
    // 6. Animation Loop (Software-WebGL Safe Pacing & Exponential Damping)
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let frameId = 0;
    let timerId = 0;
    let unmounted = false;
    let sweepAngle = 0;
    let pulseProgress = 0;

    const tick = () => {
      if (unmounted) return;
      const dt = Math.min(clock.getDelta(), 0.1);

      // Smoothly damp camera to preset if triggered
      if (presetTriggerRef.current.active) {
        const p = presetTriggerRef.current.preset;
        if (p === 'isometric') _targetCamPos.set(0, 6.8, 8.8);
        else if (p === 'top') _targetCamPos.set(0, 11.2, 0.01);
        else _targetCamPos.set(0, 2.3, 9.8);

        const dampFactor = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(_targetCamPos, dampFactor);
        controls.target.lerp(_targetLookAt, dampFactor);

        if (camera.position.distanceToSquared(_targetCamPos) < 0.005) {
          presetTriggerRef.current.active = false;
        }
      }

      if (!isPausedRef.current) {
        const speed = sweepSpeedRef.current;
        sweepAngle -= dt * 1.15 * speed;
        sweepGroup.rotation.y = sweepAngle;
        turretHeadGroup.rotation.y = sweepAngle;

        // Expanding sonar wave ring
        pulseProgress = (pulseProgress + dt * 0.42 * speed) % 1;
        const ringScale = 0.45 + pulseProgress * 4.0;
        pulseRingMesh.scale.set(ringScale, 1, ringScale);
        pulseRingMat.opacity = (1 - pulseProgress) * 0.45;

        // Subtle orbital drift of scatter particles
        particleSystem.rotation.y += dt * 0.06 * speed;
      }

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
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      disposeThreeScene(scene, renderer, [envTexture, metalBump, shadowTex]);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webglAvailable || contextLost) {
    return (
      <div
        className={`relative rounded-3xl border border-green-500/25 bg-[#020806] p-6 flex flex-col items-center justify-center text-center space-y-4 ${heightClass} ${className}`}
        role="region"
        aria-label="3D Sonar Radar Visualization Fallback"
      >
        <svg className="w-36 h-36 text-emerald-400/70" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          <circle cx="100" cy="100" r="35" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          <line x1="15" y1="100" x2="185" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          <line x1="100" y1="15" x2="100" y2="185" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          <path d="M100,100 L165,45 A85,85 0 0,1 185,100 Z" fill="currentColor" opacity="0.2" />
          <circle cx="100" cy="100" r="6" fill="#34d399" />
        </svg>
        <div className="space-y-1 max-w-md">
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            2D Acoustic Radar Fallback (WebGL Unavailable)
          </p>
          <p className="text-xs text-slate-400">
            Decorative sonar sweep visualization. Actual Rock vs. Mine classification is performed by the Flask scikit-learn backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl border border-green-500/25 bg-[#020806] overflow-hidden select-none ${heightClass} ${className}`}
      role="region"
      aria-label="Interactive 3D Sonar Radar Visualization"
    >
      {/* Dedicated WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Minimal Spec & Decorative Disclaimer Overlay (Zero Pulsing Dots, No Backdrop-Filter) */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-2 pointer-events-none z-10">
        <div className="bg-[#030d09]/90 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 space-y-1 max-w-md">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
            <Compass size={14} className="text-emerald-400 shrink-0" />
            <span>3D Sonar Radar Visualization</span>
            <span className="text-slate-500">·</span>
            <span className="text-[11px] text-cyan-300 font-normal">Decorative 3D Scene</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Visualizes a 360° acoustic sweep grid. This animation does not detect mines; live classification is computed by the Flask ML backend.
          </p>
        </div>

        <div className="bg-[#030d09]/90 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 space-y-0.5">
          <div>
            Backend Pipeline: <span className="text-emerald-400">{activeModelLabel}</span>
          </div>
          {verifiedAccuracyText && (
            <div>
              Verified Test Accuracy: <span className="text-cyan-300 tabular-nums">{verifiedAccuracyText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Solid RGBA Surface, <= 15% Viewport Footprint) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="px-3 py-1 rounded-t-xl bg-[#04120c] border border-b-0 border-emerald-500/30 text-[11px] font-mono text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          {dockCollapsed ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{dockCollapsed ? 'Show 3D Radar Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="bg-[#04120c]/95 border border-emerald-500/35 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-center gap-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-mono text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{isPaused ? 'Resume Sweep' : 'Pause Sweep'}</span>
            </button>

            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSweepSpeed(spd)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    sweepSpeed === spd
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
              {(
                [
                  { id: 'isometric', label: 'Isometric' },
                  { id: 'top', label: 'Top-Down' },
                  { id: 'horizon', label: 'Horizon' },
                ] as { id: CameraPreset; label: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCameraPreset(preset.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    cameraPreset === preset.id
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSelectCameraPreset('isometric')}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title="Reset 3D camera angle"
            >
              <RotateCcw size={12} />
              <span>Reset View</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
