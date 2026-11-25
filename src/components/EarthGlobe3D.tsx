import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  DEG,
  OBLIQUITY,
  getEarthSpinAngle,
  getOrbitalAngle,
} from "../astronomy";
import { createEarthTextures } from "../earthTexture";

export interface EarthGlobe3DHandle {
  resetView: () => void;
  lookFromSun: () => void;
}

interface EarthGlobe3DProps {
  day: number;
  hour: number;
}

// Vue de profil par défaut : cadrée pour afficher le globe entier, les rayons et le mot « Soleil »
const DEFAULT_CAMERA_POS = new THREE.Vector3(-0.32, 0.22, 4.95);
const SUN_SIDE_CAMERA_POS = new THREE.Vector3(-3.85, 0.35, 1.55);
const DEFAULT_TARGET = new THREE.Vector3(-0.32, 0, 0);

// Direction fixe du Soleil en vue de profil : à gauche (-X)
const SUN_DIRECTION = new THREE.Vector3(-1, 0, 0);
const _upVec = new THREE.Vector3(0, 1, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/** Crée un anneau de latitude sur une sphère de rayon r */
function createLatitudeRing(
  latDeg: number,
  radius: number,
  color: number,
  opacity: number,
  segments = 128
): THREE.LineLoop {
  const latRad = latDeg * DEG;
  const ringR = Math.cos(latRad) * radius;
  const y = Math.sin(latRad) * radius;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * ringR, y, Math.sin(theta) * ringR));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.LineLoop(geometry, material);
}

/** Crée un sprite texte net pour les repères (Pôle N, Pôle S, Soleil) */
function createTextSprite(
  text: string,
  color: string,
  scaleX = 0.44,
  scaleY = 0.18
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 72;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = '700 32px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(3, 6, 20, 0.92)";
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

export const EarthGlobe3D = forwardRef<EarthGlobe3DHandle, EarthGlobe3DProps>(
  function EarthGlobe3D({ day, hour }, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextError, setContextError] = useState(false);

    const stateRef = useRef({ day, hour });
    stateRef.current = { day, hour };

    const cameraTransitionRef = useRef<{
      active: boolean;
      goalPos: THREE.Vector3;
    }>({
      active: false,
      goalPos: DEFAULT_CAMERA_POS.clone(),
    });

    const controlsRef = useRef<OrbitControls | null>(null);

    useImperativeHandle(ref, () => ({
      resetView: () => {
        cameraTransitionRef.current = {
          active: true,
          goalPos: DEFAULT_CAMERA_POS.clone(),
        };
        if (controlsRef.current) {
          controlsRef.current.target.copy(DEFAULT_TARGET);
        }
      },
      lookFromSun: () => {
        cameraTransitionRef.current = {
          active: true,
          goalPos: SUN_SIDE_CAMERA_POS.clone(),
        };
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
        }
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareWebGL();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: "high-performance",
        });
      } catch {
        setContextError(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );

      const width = container.clientWidth || 500;
      const height = container.clientHeight || 420;
      renderer.setSize(width, height);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.outline = "none";

      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextError(true);
      };
      const onContextRestored = () => {
        setContextError(false);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      // ---- Scène & Caméra (vue de profil par défaut) ----
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020510);

      const camera = new THREE.PerspectiveCamera(37, width / height, 0.1, 120);
      camera.position.copy(DEFAULT_CAMERA_POS);

      // ---- Contrôles souris (OrbitControls) ----
      const controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
      controls.target.copy(DEFAULT_TARGET);
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 0.85;
      controls.panSpeed = 0.7;
      controls.minDistance = 2.0;
      controls.maxDistance = 8.0;
      controls.minPolarAngle = 0.05;
      controls.maxPolarAngle = Math.PI - 0.05;

      const onControlsStart = () => {
        cameraTransitionRef.current.active = false;
      };
      controls.addEventListener("start", onControlsStart);

      // ---- Champ d'étoiles en arrière-plan ----
      const starCount = 1000;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 24 + ((i * 7919) % 100) * 0.18;
        const theta = ((i * 104729) % 3600) * (Math.PI / 1800);
        const phi = Math.acos(2 * (((i * 31337) % 1000) / 1000) - 1);
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.cos(phi);
        starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const tint = 0.6 + ((i * 17) % 35) / 100;
        starColors[i * 3] = tint;
        starColors[i * 3 + 1] = tint;
        starColors[i * 3 + 2] = Math.min(1, tint + 0.12);
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
      const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // ---- Référentiel vertical de l'écliptique (perpendiculaire au plan orbital) ----
      const eclipticRefGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1.42, 0),
        new THREE.Vector3(0, 1.42, 0),
      ]);
      const eclipticRefMat = new THREE.LineDashedMaterial({
        color: 0x64748b,
        dashSize: 0.06,
        gapSize: 0.05,
        transparent: true,
        opacity: 0.42,
      });
      const eclipticRefLine = new THREE.Line(eclipticRefGeom, eclipticRefMat);
      eclipticRefLine.computeLineDistances();
      scene.add(eclipticRefLine);

      // ---- Hiérarchie d'orientation astronomique :
      // seasonPrecessionGroup (rotation autour de la normale à l'écliptique selon le jour)
      //   -> tiltGroup (inclinaison constante de 23,44°)
      //       -> earthMesh (rotation propre selon l'heure solaire) ----
      const seasonPrecessionGroup = new THREE.Group();
      scene.add(seasonPrecessionGroup);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = 0;
      tiltGroup.rotation.x = OBLIQUITY * DEG;
      seasonPrecessionGroup.add(tiltGroup);

      // Textures procédurales haute résolution
      const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      const earthTextures = createEarthTextures(maxAniso);

      const earthGeometry = new THREE.SphereGeometry(1, 96, 96);

      // Shader personnalisé à très fort contraste jour / nuit et frontière jour/nuit nette
      const earthMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColorMap: { value: earthTextures.colorMap },
          uRoughnessMap: { value: earthTextures.roughnessMap },
          uSunDir: { value: SUN_DIRECTION.clone() },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D uColorMap;
          uniform sampler2D uRoughnessMap;
          uniform vec3 uSunDir;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          void main() {
            vec3 texColor = texture2D(uColorMap, vUv).rgb;
            float rough = texture2D(uRoughnessMap, vUv).r;
            vec3 N = normalize(vWorldNormal);
            vec3 L = normalize(uSunDir);
            vec3 V = normalize(cameraPosition - vWorldPos);

            float ndotl = dot(N, L);

            // Transition jour/nuit nette pour une lecture pédagogique immédiate
            float dayFactor = smoothstep(-0.03, 0.04, ndotl);
            // Diffusion solaire élevée sur tout l'hémisphère éclairé
            float diffuse = max(ndotl, 0.0);
            float litBrightness = mix(0.75, 1.55, pow(diffuse, 0.42));

            // Léger reflet spéculaire solaire sur les océans (faible rugosité)
            vec3 H = normalize(L + V);
            float oceanMask = 1.0 - smoothstep(0.32, 0.65, rough);
            float spec = pow(max(dot(N, H), 0.0), 42.0) * oceanMask * 0.30 * dayFactor;

            // Face éclairée lumineuse vs face nocturne très sombre (en espace linéaire)
            vec3 dayColor = texColor * litBrightness + vec3(1.0, 0.96, 0.88) * spec;
            vec3 nightColor = texColor * vec3(0.0035, 0.005, 0.012);

            vec3 finalColor = mix(nightColor, dayColor, dayFactor);

            // Fine lueur crépusculaire ambrée sur la frontière jour/nuit
            float terminatorBand = exp(-pow(ndotl * 32.0, 2.0)) * 0.14;
            finalColor += vec3(0.98, 0.48, 0.14) * terminatorBand;

            gl_FragColor = vec4(finalColor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      });

      const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
      tiltGroup.add(earthMesh);

      // Cercles de latitude pédagogiques (Équateur, Tropiques ±23,44°, Cercles polaires ±66,56°)
      const equatorRing = createLatitudeRing(0, 1.004, 0xfbbf24, 0.68);
      const tropicNorthRing = createLatitudeRing(23.44, 1.003, 0xfb923c, 0.42);
      const tropicSouthRing = createLatitudeRing(-23.44, 1.003, 0xfb923c, 0.42);
      const arcticRing = createLatitudeRing(66.56, 1.004, 0x38bdf8, 0.62);
      const antarcticRing = createLatitudeRing(-66.56, 1.004, 0x38bdf8, 0.62);
      tiltGroup.add(equatorRing, tropicNorthRing, tropicSouthRing, arcticRing, antarcticRing);

      // Tige matérielle de l'axe de rotation terrestre + pointes polaires + étiquettes Pôle N / Pôle S
      const axisGeom = new THREE.CylinderGeometry(0.013, 0.013, 2.74, 16);
      const axisMat = new THREE.MeshStandardMaterial({
        color: 0xf87171,
        emissive: 0xef4444,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.4,
      });
      const axisRod = new THREE.Mesh(axisGeom, axisMat);
      tiltGroup.add(axisRod);

      const poleCapGeom = new THREE.ConeGeometry(0.034, 0.085, 16);
      const northCap = new THREE.Mesh(poleCapGeom, axisMat);
      northCap.position.set(0, 1.39, 0);
      const southCap = new THREE.Mesh(poleCapGeom, axisMat);
      southCap.position.set(0, -1.39, 0);
      southCap.rotation.z = Math.PI;
      tiltGroup.add(northCap, southCap);

      const northLabel = createTextSprite("Pôle N", "#fca5a5");
      northLabel.position.set(0, 1.54, 0);
      const southLabel = createTextSprite("Pôle S", "#fca5a5");
      southLabel.position.set(0, -1.54, 0);
      tiltGroup.add(northLabel, southLabel);

      // ---- Halo atmosphérique exclusivement du côté éclairé ----
      const atmoGeom = new THREE.SphereGeometry(1.028, 64, 64);
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: SUN_DIRECTION.clone() },
        },
        vertexShader: `
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uSunDir;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - max(dot(viewDir, vWorldNormal), 0.0), 3.4);
            float sunFacing = smoothstep(-0.08, 0.35, dot(vWorldNormal, normalize(uSunDir)));
            vec3 glowColor = mix(vec3(0.95, 0.55, 0.25), vec3(0.35, 0.72, 1.0), smoothstep(0.0, 0.45, sunFacing));
            float alpha = fresnel * sunFacing * 0.6;
            gl_FragColor = vec4(glowColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
      scene.add(atmoMesh);

      // ---- Rayons solaires parallèles venant de la gauche (-X -> +X) ----
      const sunRaysGroup = new THREE.Group();
      const rayOffsetsY = [-0.62, 0, 0.62];
      const rayArrows: THREE.ArrowHelper[] = [];
      for (const ry of rayOffsetsY) {
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1.82, ry, 0),
          0.5,
          0xfbbf24,
          0.13,
          0.07
        );
        sunRaysGroup.add(arrow);
        rayArrows.push(arrow);
      }
      const sunLabel = createTextSprite("Soleil", "#fde68a", 0.48, 0.19);
      sunLabel.position.set(-1.57, 0.94, 0);
      sunRaysGroup.add(sunLabel);
      scene.add(sunRaysGroup);

      // Lumière directionnelle légère pour les cônes et la tige de l'axe
      const axisAmbient = new THREE.AmbientLight(0xffffff, 0.65);
      const axisDirLight = new THREE.DirectionalLight(0xfff7e6, 1.2);
      axisDirLight.position.set(-5, 2, 2);
      scene.add(axisAmbient, axisDirLight);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // ---- Synchronisation astronomique & Boucle d'animation ----
      let frameId = 0;
      let disposed = false;
      const timer = new THREE.Timer();
      timer.connect(document);

      function syncSceneToState() {
        const { day: curDay, hour: curHour } = stateRef.current;
        const angle = getOrbitalAngle(curDay);

        // Précession relative de l'axe par rapport aux rayons solaires de profil (-X) :
        // - 21 mars (0) : incliné vers le spectateur (+Z) -> équinoxe
        // - 21 juin (π/2) : incliné vers la gauche (-X, Soleil) -> solstice d'été
        // - 23 sept (π) : incliné à l'opposé (-Z) -> équinoxe
        // - 21 déc (3π/2) : incliné vers la droite (+X, opposé au Soleil) -> solstice d'hiver
        seasonPrecessionGroup.rotation.y = -angle;

        // Rotation propre de la Terre autour de son axe incliné (heure solaire 0h..24h)
        earthMesh.rotation.y = getEarthSpinAngle(curDay, curHour);
      }

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === "function") {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      }

      function tick(timestamp?: number) {
        if (disposed) return;
        timer.update(timestamp);
        const delta = Math.min(timer.getDelta(), 0.1);

        syncSceneToState();

        if (cameraTransitionRef.current.active) {
          const alpha = 1 - Math.exp(-7.5 * delta);
          camera.position.lerp(cameraTransitionRef.current.goalPos, alpha);
          if (camera.position.distanceTo(cameraTransitionRef.current.goalPos) < 0.015) {
            camera.position.copy(cameraTransitionRef.current.goalPos);
            cameraTransitionRef.current.active = false;
          }
        }

        camera.up.copy(_upVec);
        controls.update();
        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      syncSceneToState();
      if (isSoftwareGl) {
        tick();
      } else {
        frameId = requestAnimationFrame(tick);
      }

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(100, entry.contentRect.width);
          const h = Math.max(100, entry.contentRect.height);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        timer.dispose();
        resizeObserver.disconnect();
        controls.removeEventListener("start", onControlsStart);
        controls.dispose();
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

        earthTextures.dispose();
        earthGeometry.dispose();
        earthMaterial.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
        eclipticRefGeom.dispose();
        eclipticRefMat.dispose();
        axisGeom.dispose();
        axisMat.dispose();
        poleCapGeom.dispose();
        atmoGeom.dispose();
        atmoMat.dispose();
        [equatorRing, tropicNorthRing, tropicSouthRing, arcticRing, antarcticRing].forEach(
          (ring) => {
            ring.geometry.dispose();
            (ring.material as THREE.Material).dispose();
          }
        );
        [northLabel, southLabel, sunLabel].forEach((s) => {
          s.material.map?.dispose();
          s.material.dispose();
        });
        rayArrows.forEach((a) => a.dispose());
        renderer.dispose();
        controlsRef.current = null;
      };
    }, []);

    if (contextError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#020510] text-slate-200 p-6 text-center rounded-lg">
          <p className="text-sm font-semibold mb-1">Rendu WebGL temporairement indisponible</p>
          <p className="text-xs text-slate-400">
            Vérifiez que l&apos;accélération graphique est activée dans votre navigateur.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        aria-label="Globe terrestre 3D interactif en vue de profil incliné à 23,44 degrés"
      />
    );
  }
);
