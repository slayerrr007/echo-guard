import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Eye, EyeOff, Layers, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  getWebGLCapabilities,
  createStudioRenderer,
  applyStudioEnvironmentAndLighting,
  createContactShadowPlane,
  createProceduralSurfaceBumpTexture,
  scheduleAfterDraw,
  disposeThreeScene,
} from './webglUtils';

export interface PredictionResult3DProps {
  /** Verified prediction label from Flask /predict ('ROCK' | 'MINE'), or null if awaiting classification */
  label: 'ROCK' | 'MINE' | null;
  /** Verified confidence in [0, 1] from Flask /predict */
  confidence?: number;
  /** Verified model name from Flask /predict */
  modelName?: string;
  className?: string;
  heightClass?: string;
}

interface ExplodablePart {
  mesh: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

/**
 * 3D Prediction Result Scene
 * - Visually distinguishes Rock (R) and Mine (M) using composite multi-part 3D assemblies
 *   driven strictly by real Flask /predict responses.
 * - ROCK: 7-part natural seafloor basalt boulder & crystalline mineral formation (THREE.Group)
 * - MINE: 10-part pressurized metallic naval contact mine with machined Hertz horns & flange (THREE.Group)
 * - Includes an interactive Exploded View slider with smooth exponential damping.
 */
export function PredictionResult3D({
  label,
  confidence = 0.85,
  modelName = 'scikit-learn classifier',
  className = '',
  heightClass = 'h-[360px] sm:h-[400px]',
}: PredictionResult3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const labelRef = useRef(label);
  labelRef.current = label;

  const confidenceRef = useRef(confidence);
  confidenceRef.current = confidence;

  const explodeRef = useRef(explodeAmount);
  explodeRef.current = explodeAmount;

  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;

  const resetCamRef = useRef(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const caps = getWebGLCapabilities();
    if (!caps.supported) {
      setWebglAvailable(false);
      return;
    }

    const width = Math.max(container.clientWidth, 280);
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
    const { envTexture, rimLight } = applyStudioEnvironmentAndLighting(
      renderer,
      scene,
      caps.isSoftwareGl
    );

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.7, 5.4);
    camera.lookAt(0, 1.0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !caps.isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 2.8;
    controls.maxDistance = 10.5;
    controls.target.set(0, 0.95, 0);

    const rockBump = createProceduralSurfaceBumpTexture(renderer, 'rock');
    const metalBump = createProceduralSurfaceBumpTexture(renderer, 'metal');
    const { mesh: shadowPlane, texture: shadowTex } = createContactShadowPlane(
      2.8,
      '#000000',
      '#10b981'
    );
    scene.add(shadowPlane);

    const allMaterials: THREE.MeshStandardMaterial[] = [];
    const rockParts: ExplodablePart[] = [];
    const mineParts: ExplodablePart[] = [];

    // =========================================================================
    // GROUP A: Composite 7-Part Natural Seafloor Rock Formation (label === 'ROCK')
    // =========================================================================
    const rockGroup = new THREE.Group();
    scene.add(rockGroup);

    // Part 1 (Primary Silhouette): Faceted basalt boulder core
    const boulderCoreGeo = new THREE.DodecahedronGeometry(0.92, 1);
    boulderCoreGeo.scale(1.15, 0.88, 1.04);
    const boulderCoreMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a2f,
      roughness: 0.86,
      metalness: 0.12,
      bumpMap: rockBump,
      bumpScale: 0.04,
      flatShading: true,
    });
    allMaterials.push(boulderCoreMat);
    const boulderCoreMesh = new THREE.Mesh(boulderCoreGeo, boulderCoreMat);
    boulderCoreMesh.castShadow = !caps.isSoftwareGl;
    boulderCoreMesh.receiveShadow = !caps.isSoftwareGl;
    rockGroup.add(boulderCoreMesh);
    rockParts.push({
      mesh: boulderCoreMesh,
      basePos: new THREE.Vector3(0, 0.82, 0),
      explodeOffset: new THREE.Vector3(0, 0.25, 0),
    });

    // Part 2 (Secondary Read): Stratified upper mineral shelf (roughness delta >= 0.25)
    const upperShelfGeo = new THREE.IcosahedronGeometry(0.58, 0);
    upperShelfGeo.scale(1.2, 0.65, 0.95);
    const upperShelfMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.52,
      metalness: 0.28,
      bumpMap: rockBump,
      bumpScale: 0.025,
      flatShading: true,
    });
    allMaterials.push(upperShelfMat);
    const upperShelfMesh = new THREE.Mesh(upperShelfGeo, upperShelfMat);
    upperShelfMesh.castShadow = !caps.isSoftwareGl;
    rockGroup.add(upperShelfMesh);
    rockParts.push({
      mesh: upperShelfMesh,
      basePos: new THREE.Vector3(-0.22, 1.32, 0.12),
      explodeOffset: new THREE.Vector3(-0.45, 0.65, 0.25),
    });

    // Part 3 (Secondary Read): Lateral granite outcropping
    const lateralRockGeo = new THREE.DodecahedronGeometry(0.52, 0);
    lateralRockGeo.scale(0.95, 1.1, 0.85);
    const lateralRockMat = new THREE.MeshStandardMaterial({
      color: 0x0f291e,
      roughness: 0.78,
      metalness: 0.15,
      flatShading: true,
    });
    allMaterials.push(lateralRockMat);
    const lateralRockMesh = new THREE.Mesh(lateralRockGeo, lateralRockMat);
    lateralRockMesh.castShadow = !caps.isSoftwareGl;
    rockGroup.add(lateralRockMesh);
    rockParts.push({
      mesh: lateralRockMesh,
      basePos: new THREE.Vector3(0.68, 0.56, -0.18),
      explodeOffset: new THREE.Vector3(0.75, 0.15, -0.35),
    });

    // Part 4 (Accent Detail): Crystalline emerald quartz seam
    const quartzGeo = new THREE.OctahedronGeometry(0.34, 0);
    quartzGeo.scale(0.7, 1.45, 0.7);
    const quartzMat = new THREE.MeshPhysicalMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      roughness: 0.16,
      metalness: 0.35,
      clearcoat: 1.0,
    });
    allMaterials.push(quartzMat);
    const quartzMesh = new THREE.Mesh(quartzGeo, quartzMat);
    quartzMesh.rotation.set(0.25, 0.4, -0.3);
    rockGroup.add(quartzMesh);
    rockParts.push({
      mesh: quartzMesh,
      basePos: new THREE.Vector3(0.28, 1.38, 0.32),
      explodeOffset: new THREE.Vector3(0.55, 0.85, 0.55),
    });

    // Parts 5 & 6 (Accent Detail): Grounded basal seafloor stones (flush at y=0)
    const pebble1Geo = new THREE.DodecahedronGeometry(0.32, 0);
    pebble1Geo.scale(1.3, 0.65, 1.1);
    const pebble1Mesh = new THREE.Mesh(pebble1Geo, boulderCoreMat);
    rockGroup.add(pebble1Mesh);
    rockParts.push({
      mesh: pebble1Mesh,
      basePos: new THREE.Vector3(-0.78, 0.21, 0.42),
      explodeOffset: new THREE.Vector3(-0.65, 0, 0.55),
    });

    const pebble2Geo = new THREE.DodecahedronGeometry(0.26, 0);
    pebble2Geo.scale(1.1, 0.7, 1.25);
    const pebble2Mesh = new THREE.Mesh(pebble2Geo, lateralRockMat);
    rockGroup.add(pebble2Mesh);
    rockParts.push({
      mesh: pebble2Mesh,
      basePos: new THREE.Vector3(0.42, 0.18, 0.74),
      explodeOffset: new THREE.Vector3(0.45, 0, 0.75),
    });

    // Part 7 (Accent Detail): Acoustic Safe-Passage Harmonic Ring
    const rockRingGeo = new THREE.TorusGeometry(1.55, 0.028, 16, 64);
    rockRingGeo.rotateX(Math.PI / 2);
    const rockRingMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.8,
    });
    allMaterials.push(rockRingMat);
    const rockRingMesh = new THREE.Mesh(rockRingGeo, rockRingMat);
    rockGroup.add(rockRingMesh);
    rockParts.push({
      mesh: rockRingMesh,
      basePos: new THREE.Vector3(0, 0.85, 0),
      explodeOffset: new THREE.Vector3(0, -0.35, 0),
    });

    // =========================================================================
    // GROUP B: Composite 10-Part Naval Cylindrical/Horned Mine (label === 'MINE')
    // =========================================================================
    const mineGroup = new THREE.Group();
    scene.add(mineGroup);

    // Part 1 (Primary Silhouette): Pressurized metallic mine hull (Sphere + Lathe profile)
    const hullGeo = new THREE.SphereGeometry(0.86, 36, 28);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.24,
      metalness: 0.88,
      bumpMap: metalBump,
      bumpScale: 0.02,
    });
    allMaterials.push(hullMat);
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.castShadow = !caps.isSoftwareGl;
    hullMesh.receiveShadow = !caps.isSoftwareGl;
    mineGroup.add(hullMesh);
    mineParts.push({
      mesh: hullMesh,
      basePos: new THREE.Vector3(0, 1.05, 0),
      explodeOffset: new THREE.Vector3(0, 0.15, 0),
    });

    // Part 2 (Secondary Read): Equatorial welded reinforcement flange (roughness delta >= 0.25)
    const flangeGeo = new THREE.TorusGeometry(0.88, 0.065, 16, 48);
    flangeGeo.rotateX(Math.PI / 2);
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.52,
      metalness: 0.94,
    });
    allMaterials.push(flangeMat);
    const flangeMesh = new THREE.Mesh(flangeGeo, flangeMat);
    mineGroup.add(flangeMesh);
    mineParts.push({
      mesh: flangeMesh,
      basePos: new THREE.Vector3(0, 1.05, 0),
      explodeOffset: new THREE.Vector3(0, 0.55, 0),
    });

    // Part 3 (Secondary Read): Upper hydrostatic pressure fuse cap
    const capGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.18, 24);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.75,
    });
    allMaterials.push(capMat);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    mineGroup.add(capMesh);
    mineParts.push({
      mesh: capMesh,
      basePos: new THREE.Vector3(0, 1.92, 0),
      explodeOffset: new THREE.Vector3(0, 0.95, 0),
    });

    // Part 4 (Secondary Read): Lower ballast mooring base (flush at y=0)
    const mooringBaseGeo = new THREE.CylinderGeometry(0.38, 0.56, 0.28, 16);
    mooringBaseGeo.translate(0, 0.14, 0);
    const mooringBaseMesh = new THREE.Mesh(mooringBaseGeo, flangeMat);
    mineGroup.add(mooringBaseMesh);
    mineParts.push({
      mesh: mooringBaseMesh,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeOffset: new THREE.Vector3(0, -0.25, 0),
    });

    // Parts 5–9 (Accent Details): 5 Machined Hertz Acoustic Contact Horns
    const hornDirections = [
      new THREE.Vector3(0.75, 0.65, 0).normalize(),
      new THREE.Vector3(-0.75, 0.65, 0).normalize(),
      new THREE.Vector3(0, 0.65, 0.75).normalize(),
      new THREE.Vector3(0, 0.65, -0.75).normalize(),
      new THREE.Vector3(0.55, -0.45, 0.55).normalize(),
    ];

    const hornStemGeo = new THREE.CylinderGeometry(0.055, 0.09, 0.42, 12);
    hornStemGeo.translate(0, 0.21, 0);
    const hornTipGeo = new THREE.SphereGeometry(0.068, 12, 12);
    hornTipGeo.translate(0, 0.44, 0);

    hornDirections.forEach((dir) => {
      const hornAssembly = new THREE.Group();
      const stem = new THREE.Mesh(hornStemGeo, flangeMat);
      const tip = new THREE.Mesh(hornTipGeo, capMat);
      hornAssembly.add(stem, tip);

      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir
      );
      hornAssembly.quaternion.copy(quat);

      const basePos = dir.clone().multiplyScalar(0.78).add(new THREE.Vector3(0, 1.05, 0));
      const explodeOffset = dir.clone().multiplyScalar(0.75);

      mineGroup.add(hornAssembly);
      mineParts.push({
        mesh: hornAssembly,
        basePos,
        explodeOffset,
      });
    });

    // Part 10 (Accent Detail): Acoustic Hazard Warning Containment Ring
    const hazardRingGeo = new THREE.TorusGeometry(1.58, 0.032, 16, 64);
    hazardRingGeo.rotateX(Math.PI / 2);
    const hazardRingMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });
    allMaterials.push(hazardRingMat);
    const hazardRingMesh = new THREE.Mesh(hazardRingGeo, hazardRingMat);
    mineGroup.add(hazardRingMesh);
    mineParts.push({
      mesh: hazardRingMesh,
      basePos: new THREE.Vector3(0, 1.05, 0),
      explodeOffset: new THREE.Vector3(0, -0.35, 0),
    });

    // =========================================================================
    // GROUP C: Standby Calibration Ring (when label === null before prediction)
    // =========================================================================
    const standbyGroup = new THREE.Group();
    scene.add(standbyGroup);

    const standbyOuterGeo = new THREE.TorusGeometry(1.15, 0.05, 16, 64);
    const standbyInnerGeo = new THREE.TorusGeometry(0.78, 0.04, 16, 48);
    const standbyCoreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const standbyMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.8,
    });
    allMaterials.push(standbyMat);
    const standbyOuter = new THREE.Mesh(standbyOuterGeo, standbyMat);
    const standbyInner = new THREE.Mesh(standbyInnerGeo, standbyMat);
    const standbyCore = new THREE.Mesh(standbyCoreGeo, standbyMat);
    standbyGroup.position.set(0, 1.05, 0);
    standbyGroup.add(standbyOuter, standbyInner, standbyCore);

    // -------------------------------------------------------------------------
    // Resize & Context Loss Listeners
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
      const newW = Math.max(container.clientWidth, 240);
      const newH = Math.max(container.clientHeight, 220);
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
    let currentExplode = 0;

    const tick = () => {
      if (unmounted) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const damp = 1 - Math.exp(-7.5 * dt);

      if (resetCamRef.current) {
        camera.position.lerp(new THREE.Vector3(0, 2.7, 5.4), damp);
        controls.target.lerp(new THREE.Vector3(0, 0.95, 0), damp);
        if (camera.position.distanceToSquared(new THREE.Vector3(0, 2.7, 5.4)) < 0.01) {
          resetCamRef.current = false;
        }
      }

      const activeLabel = labelRef.current;
      const conf = Math.max(0.5, Math.min(1, confidenceRef.current || 0.85));
      currentExplode = THREE.MathUtils.lerp(currentExplode, explodeRef.current, damp);

      const wf = wireframeRef.current;
      for (const m of allMaterials) {
        if (m.wireframe !== wf) m.wireframe = wf;
      }

      rockGroup.visible = activeLabel === 'ROCK';
      mineGroup.visible = activeLabel === 'MINE';
      standbyGroup.visible = activeLabel === null;

      if (activeLabel === 'ROCK') {
        rimLight.color.setHex(0x34d399);
        rockGroup.rotation.y = elapsed * 0.35;
        const ringScale = 0.85 + conf * 0.25;
        rockRingMesh.scale.set(ringScale, ringScale, 1);

        for (const p of rockParts) {
          p.mesh.position
            .copy(p.basePos)
            .addScaledVector(p.explodeOffset, currentExplode);
        }
      } else if (activeLabel === 'MINE') {
        rimLight.color.setHex(0xf43f5e);
        mineGroup.rotation.y = elapsed * 0.42;
        const ringScale = 0.85 + conf * 0.25;
        hazardRingMesh.scale.set(ringScale, ringScale, 1);

        for (const p of mineParts) {
          p.mesh.position
            .copy(p.basePos)
            .addScaledVector(p.explodeOffset, currentExplode);
        }
      } else {
        rimLight.color.setHex(0x22d3ee);
        standbyOuter.rotation.y = elapsed * 0.5;
        standbyInner.rotation.x = elapsed * 0.7;
        standbyCore.rotation.y = -elapsed * 0.8;
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
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      disposeThreeScene(scene, renderer, [envTexture, rockBump, metalBump, shadowTex]);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webglAvailable || contextLost) {
    return (
      <div
        className={`relative rounded-2xl border border-green-500/25 bg-[#020806] p-5 text-center space-y-2 ${heightClass} ${className}`}
        role="region"
        aria-label="Prediction Result Visualization Fallback"
      >
        <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
          2D Prediction Target Fallback
        </p>
        <p className="text-lg font-extrabold text-white">
          {label ? `Classified Target: ${label}` : 'Awaiting Backend Classification'}
        </p>
        {label && (
          <p className="text-xs font-mono text-slate-400">
            Model: {modelName} · Confidence: {(confidence * 100).toFixed(1)}%
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border border-green-500/25 bg-[#020806] overflow-hidden select-none ${heightClass} ${className}`}
      role="region"
      aria-label="3D Prediction Result Target Scene"
    >
      {/* Dedicated WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Overlay: Clearly Labeled State Driven by Verified Backend Prediction */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none z-10">
        <div className="bg-[#030d09]/92 border border-emerald-500/30 rounded-xl px-3 py-2 space-y-0.5 max-w-xs">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
            {label === 'ROCK' ? (
              <>
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-300">3D State: Natural Rock (R)</span>
              </>
            ) : label === 'MINE' ? (
              <>
                <ShieldAlert size={14} className="text-rose-400 shrink-0" />
                <span className="text-rose-300">3D State: Naval Mine (M)</span>
              </>
            ) : (
              <>
                <Layers size={14} className="text-cyan-400 shrink-0" />
                <span className="text-slate-300">Standby: Run /predict first</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {label
              ? `Visualizing verified ${modelName} classification (${(confidence * 100).toFixed(1)}% confidence).`
              : 'Click "Run Classification" to render the predicted Rock or Mine 3D assembly.'}
          </p>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center w-[92%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((p) => !p)}
          className="px-2.5 py-0.5 rounded-t-lg bg-[#04120c] border border-b-0 border-emerald-500/30 text-[10px] font-mono text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          {dockCollapsed ? <Eye size={11} /> : <EyeOff size={11} />}
          <span>{dockCollapsed ? 'Controls' : 'Hide'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-[#04120c]/95 border border-emerald-500/35 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            {label && (
              <label className="flex items-center gap-2 text-slate-300 flex-1 min-w-[140px]">
                <span className="whitespace-nowrap">Explode:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={explodeAmount}
                  onChange={(e) => setExplodeAmount(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </label>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setWireframe((w) => !w)}
                className={`px-2 py-1 rounded border text-[10px] cursor-pointer whitespace-nowrap ${
                  wireframe
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                Wireframe
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplodeAmount(0);
                  resetCamRef.current = true;
                }}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Reset 3D view"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
