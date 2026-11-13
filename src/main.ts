import "./styles.css";
import "@babylonjs/loaders/glTF";

import {
  AbstractEngine,
  Axis,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Quaternion,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Space,
  TransformNode,
  Vector3,
  WebGPUEngine
} from "@babylonjs/core";

type TrainingTarget = {
  root: TransformNode;
  core: Mesh;
  ring: Mesh;
  position: Vector3;
  health: number;
  active: boolean;
  damage: (amount: number) => boolean;
};

type HeroRig = {
  root: TransformNode;
  skeleton: any;
  restPose: Map<string, Quaternion>;
  meshes: Mesh[];
};

type Projectile = { mesh: Mesh; direction: Vector3; lifetime: number };

const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas")!;
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen")!;
const introScreen = document.querySelector<HTMLElement>("#intro-screen")!;
const hud = document.querySelector<HTMLElement>("#hud")!;
const errorScreen = document.querySelector<HTMLElement>("#error-screen")!;
const loadingFill = document.querySelector<HTMLElement>("#loading-fill")!;
const loadingMessage = document.querySelector<HTMLElement>("#loading-message")!;
const errorMessage = document.querySelector<HTMLElement>("#error-message")!;
const pauseHint = document.querySelector<HTMLElement>("#pause-hint")!;
const toast = document.querySelector<HTMLElement>("#toast")!;

const state = {
  started: false,
  health: 100,
  energy: 100,
  targetsCompleted: 0,
  toastUntil: 0,
  fps: 0
};

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("show");
  state.toastUntil = performance.now() + 1600;
}

function updateHud(targetsTotal: number): void {
  const healthFill = document.querySelector<HTMLElement>("#health-fill")!;
  const energyFill = document.querySelector<HTMLElement>("#energy-fill")!;
  const healthValue = document.querySelector<HTMLElement>("#health-value")!;
  const energyValue = document.querySelector<HTMLElement>("#energy-value")!;
  const targetCount = document.querySelector<HTMLElement>("#target-count")!;
  const objectiveText = document.querySelector<HTMLElement>("#objective-text")!;

  healthFill.style.width = `${state.health}%`;
  energyFill.style.width = `${state.energy}%`;
  healthValue.textContent = String(Math.round(state.health));
  energyValue.textContent = String(Math.round(state.energy));
  targetCount.textContent = `${state.targetsCompleted} / ${targetsTotal}`;
  objectiveText.textContent = state.targetsCompleted >= targetsTotal
    ? "Training course completed"
    : "Activate the 3 practice targets";

  if (performance.now() > state.toastUntil) toast.classList.remove("show");
}

function pbr(
  scene: Scene,
  name: string,
  color: Color3,
  metallic = 0.08,
  roughness = 0.72,
  emissive = Color3.Black()
): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = color;
  material.metallic = metallic;
  material.roughness = roughness;
  material.emissiveColor = emissive;
  return material;
}

function createCity(scene: Scene): { targets: TrainingTarget[]; shadowCasters: Mesh[] } {
  const shadowCasters: Mesh[] = [];
  const asphalt = pbr(scene, "Road / asphalt", new Color3(0.055, 0.085, 0.12), 0.12, 0.92);
  const concrete = pbr(scene, "Sidewalk / concrete", new Color3(0.31, 0.37, 0.42), 0.04, 0.9);
  const plazaMat = pbr(scene, "Training plaza", new Color3(0.18, 0.26, 0.31), 0.18, 0.72);
  const laneMat = pbr(scene, "Road markings", new Color3(0.77, 0.82, 0.78), 0.02, 0.8, new Color3(0.12, 0.12, 0.1));
  const facadeMaterials = [
    pbr(scene, "Facade / blue slate", new Color3(0.09, 0.16, 0.23), 0.18, 0.78),
    pbr(scene, "Facade / warm stone", new Color3(0.32, 0.31, 0.28), 0.08, 0.84),
    pbr(scene, "Facade / deep teal", new Color3(0.07, 0.2, 0.22), 0.15, 0.78),
    pbr(scene, "Facade / graphite", new Color3(0.12, 0.15, 0.19), 0.22, 0.68)
  ];
  const glassMat = pbr(scene, "Window glass", new Color3(0.055, 0.16, 0.22), 0.46, 0.22, new Color3(0.035, 0.13, 0.18));
  const neonMat = pbr(scene, "Cyan architectural light", new Color3(0.04, 0.4, 0.43), 0.22, 0.24, new Color3(0.06, 0.8, 0.74));

  const ground = MeshBuilder.CreateGround("City foundation", { width: 220, height: 220 }, scene);
  ground.material = concrete;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  const roadA = MeshBuilder.CreateBox("Central avenue", { width: 220, height: 0.12, depth: 22 }, scene);
  roadA.position.y = 0.045;
  roadA.material = asphalt;
  const roadB = MeshBuilder.CreateBox("Cross street", { width: 18, height: 0.13, depth: 220 }, scene);
  roadB.position.y = 0.05;
  roadB.material = asphalt;

  for (let i = -96; i <= 96; i += 8) {
    const dashA = MeshBuilder.CreateBox("Lane dash", { width: 3.3, height: 0.03, depth: 0.16 }, scene);
    dashA.position.set(i, 0.12, 0);
    dashA.material = laneMat;
  }
  for (let i = -96; i <= 96; i += 8) {
    const dashB = MeshBuilder.CreateBox("Lane dash", { width: 0.16, height: 0.03, depth: 3.3 }, scene);
    dashB.position.set(0, 0.12, i);
    dashB.material = laneMat;
  }

  const sidewalks = [
    { x: 0, z: 13.2, w: 220, d: 3.6 }, { x: 0, z: -13.2, w: 220, d: 3.6 },
    { x: 11.2, z: 0, w: 3.6, d: 220 }, { x: -11.2, z: 0, w: 3.6, d: 220 }
  ];
  for (const s of sidewalks) {
    const walk = MeshBuilder.CreateBox("Sidewalk strip", { width: s.w, height: 0.18, depth: s.d }, scene);
    walk.position.set(s.x, 0.05, s.z);
    walk.material = concrete;
  }

  // A dedicated practice yard sits beside the central avenue.
  const plaza = MeshBuilder.CreateBox("U.A. practice yard", { width: 46, height: 0.22, depth: 34 }, scene);
  plaza.position.set(0, 0.09, 36);
  plaza.material = plazaMat;
  plaza.receiveShadows = true;

  const platformMat = pbr(scene, "Target platform", new Color3(0.13, 0.22, 0.27), 0.25, 0.58);
  for (const x of [-9, 0, 9]) {
    const pad = MeshBuilder.CreateCylinder("Practice pad", { diameter: 5.2, height: 0.22, tessellation: 48 }, scene);
    pad.position.set(x, 0.26, 29);
    pad.material = platformMat;
    const rim = MeshBuilder.CreateTorus("Practice pad rim", { diameter: 5.15, thickness: 0.055, tessellation: 48 }, scene);
    rim.position.set(x, 0.39, 29);
    rim.material = neonMat;
  }

  // Shared window geometry is drawn as thin instances to keep the city lightweight.
  const windowProto = MeshBuilder.CreateBox("Window instance source", { width: 1.35, height: 1.05, depth: 0.07 }, scene);
  windowProto.material = glassMat;
  windowProto.position.y = -100;
  const addWindow = (x: number, y: number, z: number, rotationY = 0): void => {
    const rotation = Quaternion.RotationYawPitchRoll(rotationY, 0, 0);
    const matrix = Matrix.Compose(new Vector3(1, 1, 1), rotation, new Vector3(x, y + 100, z));
    windowProto.thinInstanceAdd(matrix);
  };

  const plots = [
    [-76, -69, 22, 20, 34], [-43, -72, 21, 25, 27], [42, -73, 23, 22, 39], [76, -69, 20, 25, 30],
    [-78, -34, 24, 22, 24], [-43, -34, 20, 20, 31], [44, -34, 22, 22, 25], [77, -32, 22, 20, 36],
    [-77, 48, 22, 24, 35], [-45, 76, 22, 20, 26], [44, 72, 24, 22, 38], [77, 45, 22, 24, 28],
    [-77, 12, 22, 18, 23], [77, 12, 22, 18, 32]
  ];
  plots.forEach(([x, z, width, depth, height], index) => {
    const building = MeshBuilder.CreateBox(`City building ${index + 1}`, { width, height, depth }, scene);
    building.position.set(x, height / 2, z);
    building.material = facadeMaterials[index % facadeMaterials.length];
    building.checkCollisions = true;
    building.receiveShadows = true;
    building.isPickable = false;
    shadowCasters.push(building);

    const frontZ = z + depth / 2 + 0.055;
    const sideX = x + width / 2 + 0.055;
    const floors = Math.floor(height / 3.1);
    for (let floor = 0; floor < floors; floor++) {
      const y = 2.1 + floor * 3.0;
      for (let col = 0; col < Math.floor(width / 2.5); col++) {
        const wx = x - width / 2 + 1.65 + col * 2.45;
        addWindow(wx, y, frontZ);
      }
      for (let col = 0; col < Math.floor(depth / 2.7); col++) {
        const wz = z - depth / 2 + 1.7 + col * 2.6;
        addWindow(sideX, y, wz, Math.PI / 2);
      }
    }

    const roofBand = MeshBuilder.CreateBox("Roof detail", { width: width + 0.4, height: 0.32, depth: depth + 0.4 }, scene);
    roofBand.position.set(x, height + 0.12, z);
    roofBand.material = facadeMaterials[(index + 2) % facadeMaterials.length];
    const accent = MeshBuilder.CreateBox("Facade light strip", { width: 0.12, height: Math.min(height * 0.72, 24), depth: 0.12 }, scene);
    accent.position.set(x - width / 2 + 0.6, height * 0.47, frontZ + 0.02);
    accent.material = neonMat;
  });

  // Small street trees use shared low-poly meshes.
  const trunkMat = pbr(scene, "Tree bark", new Color3(0.18, 0.12, 0.08), 0, 0.95);
  const leafMat = pbr(scene, "Tree canopy", new Color3(0.07, 0.25, 0.2), 0, 0.9);
  for (const x of [-21, 21]) {
    for (const z of [-68, -42, -16, 12, 60, 84]) {
      const trunk = MeshBuilder.CreateCylinder("Street tree trunk", { height: 3.1, diameter: 0.42, tessellation: 8 }, scene);
      trunk.position.set(x, 1.55, z);
      trunk.material = trunkMat;
      const crown = MeshBuilder.CreateSphere("Street tree crown", { diameter: 3.2, segments: 7 }, scene);
      crown.position.set(x, 3.9, z);
      crown.material = leafMat;
      shadowCasters.push(trunk, crown);
    }
  }

  // Street lights are grouped as static geometry around the practice district.
  const poleMat = pbr(scene, "Streetlight metal", new Color3(0.16, 0.22, 0.27), 0.72, 0.32);
  const lampMat = pbr(scene, "Streetlight emitter", new Color3(0.8, 0.88, 0.9), 0.1, 0.2, new Color3(0.45, 0.68, 0.72));
  for (const z of [-24, 24, 55, 86]) {
    for (const x of [-17, 17]) {
      const pole = MeshBuilder.CreateCylinder("Street light pole", { height: 6.3, diameter: 0.18 }, scene);
      pole.position.set(x, 3.15, z);
      pole.material = poleMat;
      const arm = MeshBuilder.CreateBox("Street light arm", { width: 1.45, height: 0.13, depth: 0.13 }, scene);
      arm.position.set(x + (x < 0 ? 0.6 : -0.6), 6.1, z);
      arm.material = poleMat;
      const bulb = MeshBuilder.CreateSphere("Street light", { diameter: 0.42, segments: 10 }, scene);
      bulb.position.copyFrom(arm.position);
      bulb.material = lampMat;
      shadowCasters.push(pole, arm);
    }
  }

  const targetMaterial = pbr(scene, "Training target shell", new Color3(0.08, 0.19, 0.24), 0.55, 0.28);
  const targetCoreMaterial = pbr(scene, "Training target core", new Color3(0.08, 0.6, 0.55), 0.18, 0.2, new Color3(0.05, 0.72, 0.65));
  const targets: TrainingTarget[] = [];

  for (const [x, z] of [[-9, 16], [0, 16], [9, 16]] as const) {
    const root = new TransformNode("Training target", scene);
    root.position.set(x, 0.2, z);
    const base = MeshBuilder.CreateCylinder("Target base", { diameter: 2.2, height: 0.5, tessellation: 32 }, scene);
    base.parent = root;
    base.position.y = 0.25;
    base.material = targetMaterial;
    const stem = MeshBuilder.CreateCylinder("Target stem", { diameterTop: 0.5, diameterBottom: 0.8, height: 1.6, tessellation: 16 }, scene);
    stem.parent = root;
    stem.position.y = 1.25;
    stem.material = targetMaterial;
    const ring = MeshBuilder.CreateTorus("Target ring", { diameter: 1.6, thickness: 0.11, tessellation: 32 }, scene);
    ring.parent = root;
    ring.position.y = 1.75;
    ring.rotation.x = Math.PI / 2;
    ring.material = neonMat;
    const core = MeshBuilder.CreateSphere("Target core", { diameter: 0.95, segments: 20 }, scene);
    core.parent = root;
    core.position.y = 1.75;
    core.material = targetCoreMaterial;
    const targetPosition = new Vector3(x, 1.85, z);
    const target: TrainingTarget = {
      root,
      core,
      ring,
      position: targetPosition,
      health: 100,
      active: true,
      damage(amount: number): boolean {
        if (!target.active) return false;
        target.health = Math.max(0, target.health - amount);
        const intensity = target.health / 100;
        const tint = Color3.Lerp(new Color3(0.9, 0.18, 0.13), new Color3(0.08, 0.6, 0.55), intensity);
        targetCoreMaterial.albedoColor = tint;
        targetCoreMaterial.emissiveColor = tint.scale(1.1);
        if (target.health <= 0) {
          target.active = false;
          root.setEnabled(false);
          return true;
        }
        return false;
      }
    };
    targets.push(target);
    shadowCasters.push(base, stem);
  }

  return { targets, shadowCasters };
}

async function loadHero(scene: Scene, shadows: ShadowGenerator): Promise<HeroRig> {
  const assetRoot = `${import.meta.env.BASE_URL}assets/`;
  const imported = await SceneLoader.ImportMeshAsync("", assetRoot, "hero.glb", scene);
  const root = new TransformNode("Player hero rig", scene);
  const importedRoot = imported.meshes.find((mesh) => mesh.name === "__root__") ?? imported.meshes[0];
  if (importedRoot) importedRoot.parent = root;

  const meshes = imported.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
  const bodyMaterial = pbr(scene, "Hero suit / deep ocean", new Color3(0.055, 0.14, 0.23), 0.28, 0.5);
  const faceMaterial = pbr(scene, "Hero skin", new Color3(0.66, 0.46, 0.34), 0.02, 0.84);
  const detailMaterial = pbr(scene, "Hero detail", new Color3(0.04, 0.62, 0.58), 0.36, 0.32, new Color3(0.02, 0.19, 0.17));

  for (const mesh of meshes) {
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.material = mesh.name.toLowerCase().includes("face") ? faceMaterial : bodyMaterial;
    shadows.addShadowCaster(mesh, true);
  }

  // A simple bright chest marker makes the imported base model easy to read at gameplay distance.
  const emblem = MeshBuilder.CreateSphere("Hero chest marker", { diameter: 0.16, segments: 12 }, scene);
  emblem.parent = root;
  emblem.position.set(0, 1.25, 0.18);
  emblem.material = detailMaterial;
  emblem.isPickable = false;

  const skeleton = imported.skeletons[0] ?? null;
  const restPose = new Map<string, Quaternion>();
  if (skeleton) {
    for (const bone of skeleton.bones) {
      const localRotation = bone.getRotationQuaternion(Space.LOCAL);
      restPose.set(bone.name, localRotation ? localRotation.clone() : Quaternion.Identity());
    }
  }

  root.scaling.setAll(1.0);
  root.position.set(0, 0, 0);
  return { root, skeleton, restPose, meshes };
}

function animateHero(hero: HeroRig, elapsed: number, movement: number): void {
  const skeleton = hero.skeleton;
  if (!skeleton) {
    hero.root.position.y = Math.sin(elapsed * 2.2) * 0.025;
    return;
  }
  const stride = movement > 0.1 ? Math.min(movement, 1.5) : 0.08;
  const swing = Math.sin(elapsed * (movement > 0.1 ? 10.5 : 2.4)) * stride * 0.42;
  const sideSwing = Math.sin(elapsed * (movement > 0.1 ? 10.5 : 2.4) + Math.PI) * stride * 0.42;

  const angleByBone: Record<string, number> = {
    thigh_l: swing, thigh_r: sideSwing,
    calf_l: Math.max(0, -swing) * 0.55, calf_r: Math.max(0, -sideSwing) * 0.55,
    upperarm_l: -sideSwing * 0.72, upperarm_r: -swing * 0.72,
    lowerarm_l: Math.max(0, swing) * 0.2, lowerarm_r: Math.max(0, sideSwing) * 0.2,
    spine_02: movement > 0.1 ? -0.035 : Math.sin(elapsed * 1.6) * 0.018
  };

  for (const bone of skeleton.bones) {
    const rest = hero.restPose.get(bone.name);
    const angle = angleByBone[bone.name];
    if (!rest || angle === undefined) continue;
    const animated = rest.multiply(Quaternion.RotationAxis(Axis.X, angle));
    bone.setRotationQuaternion(animated, Space.LOCAL);
  }
}

function createTrainingBurst(scene: Scene, origin: Vector3): Mesh {
  const ring = MeshBuilder.CreateTorus("Burst Step ring", { diameter: 1.2, thickness: 0.08, tessellation: 36 }, scene);
  ring.position.copyFrom(origin);
  ring.rotation.x = Math.PI / 2;
  const material = pbr(scene, "Burst Step glow", new Color3(0.08, 0.65, 0.62), 0.2, 0.18, new Color3(0.12, 0.9, 0.8));
  material.alpha = 0.8;
  ring.material = material;
  return ring;
}

function showError(error: unknown): void {
  loadingScreen.classList.add("hidden");
  errorScreen.classList.remove("hidden");
  errorMessage.textContent = error instanceof Error ? error.message : String(error);
}

async function createEngine(canvasElement: HTMLCanvasElement): Promise<AbstractEngine> {
  if (await WebGPUEngine.IsSupportedAsync) {
    try {
      const webgpu = new WebGPUEngine(canvasElement, { antialias: true, adaptToDeviceRatio: true });
      await webgpu.initAsync();
      return webgpu;
    } catch (error) {
      console.warn("WebGPU initialization failed; using WebGL 2 instead.", error);
    }
  }
  return new Engine(canvasElement, true, {
    antialias: true,
    adaptToDeviceRatio: true,
    preserveDrawingBuffer: false,
    stencil: true
  });
}

async function startGame(): Promise<void> {
  try {
    loadingFill.style.width = "22%";
    loadingMessage.textContent = "Starting the browser renderer…";
    const engine = await createEngine(canvas);
    loadingFill.style.width = "40%";
    loadingMessage.textContent = "Lighting the training district…";

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.035, 0.065, 0.095, 1);
    scene.collisionsEnabled = true;
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0015;
    scene.fogColor = new Color3(0.33, 0.48, 0.56);
    scene.environmentIntensity = 0.7;

    const skyLight = new HemisphericLight("Sky fill", new Vector3(0, 1, 0), scene);
    skyLight.intensity = 0.72;
    skyLight.diffuse = new Color3(0.62, 0.76, 0.9);
    skyLight.groundColor = new Color3(0.18, 0.22, 0.27);

    const sun = new DirectionalLight("Late afternoon sun", new Vector3(-0.42, -1, 0.28), scene);
    sun.position = new Vector3(50, 80, -45);
    sun.intensity = 2.0;
    sun.diffuse = new Color3(1.0, 0.82, 0.66);

    const shadows = new ShadowGenerator(1024, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 24;

    const { targets, shadowCasters } = createCity(scene);
    for (const caster of shadowCasters) shadows.addShadowCaster(caster);
    loadingFill.style.width = "66%";
    loadingMessage.textContent = "Loading the rigged hero model…";
    const hero = await loadHero(scene, shadows);

    const collider = MeshBuilder.CreateBox("Player collision body", { width: 0.75, height: 1.8, depth: 0.75 }, scene);
    collider.position.set(0, 0.92, 47);
    collider.isVisible = false;
    collider.isPickable = false;
    collider.checkCollisions = true;
    collider.ellipsoid = new Vector3(0.42, 0.9, 0.42);
    collider.ellipsoidOffset = new Vector3(0, 0, 0);

    const camera = new FreeCamera("Third person camera", new Vector3(0, 4, 55), scene);
    camera.minZ = 0.1;
    camera.maxZ = 420;
    camera.fov = 0.82;
    camera.setTarget(new Vector3(0, 1.4, 47));

    const pipeline = new (await import("@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline")).DefaultRenderingPipeline(
      "Hero City post processing",
      true,
      scene,
      [camera]
    );
    pipeline.fxaaEnabled = true;
    pipeline.samples = 2;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.88;
    pipeline.bloomWeight = 0.12;

    const keys = new Set<string>();
    let yaw = Math.PI;
    let pitch = 0.18;
    let verticalVelocity = 0;
    let grounded = true;
    let burstVelocity = 0;
    const projectiles: Projectile[] = [];
    const burstRings: { mesh: Mesh; age: number }[] = [];
    let elapsed = 0;
    let lastFrameTime = performance.now();
    let started = false;

    const firePulse = (): void => {
      if (!started || state.energy < 22) return;
      state.energy -= 22;
      const direction = new Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      const origin = hero.root.position.add(new Vector3(0, 1.35, 0)).add(direction.scale(0.9));
      const orb = MeshBuilder.CreateSphere("Energy pulse", { diameter: 0.42, segments: 16 }, scene);
      const orbMat = pbr(scene, "Energy pulse material", new Color3(0.05, 0.72, 0.68), 0.2, 0.12, new Color3(0.05, 0.9, 0.8));
      orb.material = orbMat;
      orb.position.copyFrom(origin);
      const pulseLight = new PointLight("Pulse light", origin, scene);
      pulseLight.diffuse = new Color3(0.14, 0.95, 0.84);
      pulseLight.intensity = 0.65;
      pulseLight.range = 4.5;
      orb.metadata = { pulseLight };
      projectiles.push({ mesh: orb, direction, lifetime: 2.2 });
      showToast("ENERGY PULSE");
    };

    const useBurstStep = (): void => {
      if (!started || state.energy < 18 || burstVelocity > 1) return;
      state.energy -= 18;
      burstVelocity = 18;
      const ring = createTrainingBurst(scene, hero.root.position.add(new Vector3(0, 0.08, 0)));
      burstRings.push({ mesh: ring, age: 0 });
      showToast("BURST STEP");
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      keys.add(event.code);
      if (event.repeat) return;
      if (event.code === "KeyQ") firePulse();
      if (event.code === "KeyE") useBurstStep();
      if (event.code === "Space" && started && grounded) {
        verticalVelocity = 8.1;
        grounded = false;
      }
    };
    const onKeyUp = (event: KeyboardEvent): void => { keys.delete(event.code); };
    const onMouseMove = (event: MouseEvent): void => {
      if (document.pointerLockElement !== canvas || !started) return;
      yaw += event.movementX * 0.0024;
      pitch = Math.max(-0.02, Math.min(0.52, pitch + event.movementY * 0.0018));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", () => {
      if (started && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
    });

    const update = (dt: number): void => {
      elapsed += dt;
      state.energy = Math.min(100, state.energy + dt * 7.5);

      if (started) {
        const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new Vector3(forward.z, 0, -forward.x);
        const forwardInput = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
        const sideInput = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
        const moveDirection = forward.scale(forwardInput).add(right.scale(sideInput));
        if (moveDirection.lengthSquared() > 1) moveDirection.normalize();
        const isMoving = moveDirection.lengthSquared() > 0.001;
        const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const speed = sprinting ? 10.8 : 6.1;
        const horizontalVelocity = moveDirection.scale(speed);
        const burst = burstVelocity > 0 ? forward.scale(burstVelocity) : Vector3.Zero();
        burstVelocity = Math.max(0, burstVelocity - dt * 48);

        verticalVelocity -= 20 * dt;
        const displacement = new Vector3(
          (horizontalVelocity.x + burst.x) * dt,
          verticalVelocity * dt,
          (horizontalVelocity.z + burst.z) * dt
        );
        collider.moveWithCollisions(displacement);

        if (collider.position.y <= 0.93) {
          collider.position.y = 0.93;
          verticalVelocity = 0;
          grounded = true;
        } else {
          grounded = false;
        }

        hero.root.position.set(collider.position.x, collider.position.y - 0.92, collider.position.z);
        if (isMoving) hero.root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        animateHero(hero, elapsed, isMoving ? (sprinting ? 1.45 : 1.0) : 0);

        const cameraTarget = hero.root.position.add(new Vector3(0, 1.25, 0));
        const horizontalDistance = 6.8 * Math.cos(pitch);
        camera.position.set(
          cameraTarget.x - Math.sin(yaw) * horizontalDistance,
          cameraTarget.y + 6.8 * Math.sin(pitch) + 0.32,
          cameraTarget.z - Math.cos(yaw) * horizontalDistance
        );
        camera.setTarget(cameraTarget);
      }

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.lifetime -= dt;
        projectile.mesh.position.addInPlace(projectile.direction.scale(25 * dt));
        const light = projectile.mesh.metadata?.pulseLight as PointLight | undefined;
        if (light) light.position.copyFrom(projectile.mesh.position);
        let hit = false;
        for (const target of targets) {
          if (target.active && Vector3.Distance(projectile.mesh.position, target.position) < 1.2) {
            if (target.damage(35)) {
              state.targetsCompleted += 1;
              showToast("TARGET DISABLED");
            } else {
              showToast("TARGET HIT");
            }
            hit = true;
            break;
          }
        }
        if (hit || projectile.lifetime <= 0) {
          light?.dispose();
          projectile.mesh.dispose();
          projectiles.splice(i, 1);
        }
      }

      for (let i = burstRings.length - 1; i >= 0; i--) {
        const ring = burstRings[i];
        ring.age += dt;
        ring.mesh.scaling.setAll(1 + ring.age * 4.5);
        ring.mesh.visibility = Math.max(0, 1 - ring.age / 0.48);
        if (ring.age > 0.48) {
          ring.mesh.material?.dispose();
          ring.mesh.dispose();
          burstRings.splice(i, 1);
        }
      }
    };

    loadingFill.style.width = "90%";
    loadingMessage.textContent = "Finalizing the camera and controls…";
    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      update(dt);
      updateHud(targets.length);
      scene.render();
      state.fps = engine.getFps();
    });

    window.addEventListener("resize", () => engine.resize());
    loadingFill.style.width = "100%";
    loadingMessage.textContent = "Ready.";
    window.setTimeout(() => {
      loadingScreen.classList.add("hidden");
      introScreen.classList.remove("hidden");
    }, 350);

    document.querySelector<HTMLButtonElement>("#start-button")!.addEventListener("click", () => {
      started = true;
      state.started = true;
      introScreen.classList.add("hidden");
      hud.classList.remove("hidden");
      pauseHint.classList.remove("hidden");
      void canvas.requestPointerLock();
      showToast("TRAINING SESSION STARTED");
    });

    document.addEventListener("pointerlockchange", () => {
      pauseHint.classList.toggle("hidden", document.pointerLockElement === canvas || !started);
    });

  } catch (error) {
    console.error(error);
    showError(error);
  }
}

void startGame();