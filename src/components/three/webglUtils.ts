import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface WebGLCapabilities {
  supported: boolean;
  isSoftwareGl: boolean;
  rendererInfo: string;
}

let cachedCapabilities: WebGLCapabilities | null = null;

/**
 * Probes WebGL support and detects software WebGL renderers (SwiftShader, llvmpipe, softpipe, Basic Render)
 * per the Three.js skill directive, freeing the temporary probe context immediately.
 */
export function getWebGLCapabilities(): WebGLCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true, rendererInfo: 'SSR' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      cachedCapabilities = {
        supported: false,
        isSoftwareGl: true,
        rendererInfo: 'Unavailable',
      };
      return cachedCapabilities;
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);

    cachedCapabilities = {
      supported: true,
      isSoftwareGl,
      rendererInfo: gpu || 'WebGL GPU',
    };
    return cachedCapabilities;
  } catch {
    cachedCapabilities = {
      supported: false,
      isSoftwareGl: true,
      rendererInfo: 'Error probing WebGL',
    };
    return cachedCapabilities;
  }
}

/**
 * Creates a studio-calibrated WebGLRenderer with ACESFilmicToneMapping, SRGBColorSpace,
 * and software-WebGL pixel ratio / shadow guards.
 */
export function createStudioRenderer(
  width: number,
  height: number,
  isSoftwareGl: boolean
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x020806, 1);
  return renderer;
}

/**
 * Populates `scene.environment` with a zero-dependency procedural RoomEnvironment
 * via PMREMGenerator and adds a balanced 3-point warm/cool studio lighting rig.
 */
export function applyStudioEnvironmentAndLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  isSoftwareGl: boolean
): {
  envTexture: THREE.Texture;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
} {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  scene.background = new THREE.Color(0x020806);
  scene.fog = new THREE.FogExp2(0x020806, 0.032);

  // Cool sky/ground HemisphereLight fill
  const hemiLight = new THREE.HemisphereLight(0x34d399, 0x04120c, 0.85);
  hemiLight.position.set(0, 18, 0);
  scene.add(hemiLight);

  // Warm-white directional Key Light with tight shadow frustum
  const keyLight = new THREE.DirectionalLight(0xecfdf5, 2.2);
  keyLight.position.set(6, 11, 7);
  keyLight.castShadow = !isSoftwareGl;
  const d = 7;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Crisp cyan/emerald Rim Light from behind
  const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.35);
  rimLight.position.set(-6, 5, -7);
  scene.add(rimLight);

  return { envTexture, keyLight, hemiLight, rimLight };
}

/**
 * Creates a procedural radial contact shadow texture on an HTML5 2D Canvas.
 * Zero external image dependencies.
 */
export function createContactShadowPlane(
  radius: number,
  tintHex = '#000000',
  glowHex = '#10b981'
): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, tintHex);
  grad.addColorStop(0.55, `${glowHex}33`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.01;
  return { mesh, texture };
}

/**
 * Creates a procedural micro-grain / brushed bump map texture on an HTML5 2D Canvas.
 */
export function createProceduralSurfaceBumpTexture(
  renderer: THREE.WebGLRenderer,
  mode: 'metal' | 'rock'
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  if (mode === 'metal') {
    // Anisotropic brushed lathe lines
    for (let y = 0; y < size; y += 2) {
      const shade = 115 + ((y * 17) % 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, size, 1);
    }
  } else {
    // Craggy mineral strata noise
    for (let i = 0; i < 900; i++) {
      const x = (i * 73) % size;
      const y = (i * 137) % size;
      const r = 4 + (i % 14);
      const v = i % 2 === 0 ? 165 : 90;
      ctx.fillStyle = `rgba(${v},${v},${v},0.22)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/**
 * Software-WebGL fence-synced frame pacing helper per the Three.js skill.
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  setTimerId: (id: number) => void
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext;
  if ('fenceSync' in gl && typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        setTimerId(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        setTimerId(window.setTimeout(cb, 80));
      }
    };
    setTimerId(window.setTimeout(poll, 5));
  } else {
    gl.flush();
    setTimerId(window.setTimeout(cb, 80));
  }
}

/**
 * Recursively disposes all geometries, materials, textures, environment maps,
 * and the WebGLRenderer when a component unmounts.
 */
export function disposeThreeScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  extraTextures: THREE.Texture[] = []
): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if (!mat) continue;
        const stdMat = mat as THREE.MeshStandardMaterial;
        stdMat.map?.dispose();
        stdMat.bumpMap?.dispose();
        stdMat.normalMap?.dispose();
        stdMat.roughnessMap?.dispose();
        stdMat.metalnessMap?.dispose();
        stdMat.emissiveMap?.dispose();
        stdMat.alphaMap?.dispose();
        mat.dispose();
      }
    }
  });

  if (scene.environment) {
    scene.environment.dispose();
    scene.environment = null;
  }

  for (const tex of extraTextures) {
    tex?.dispose();
  }

  scene.clear();
  renderer.dispose();
}
