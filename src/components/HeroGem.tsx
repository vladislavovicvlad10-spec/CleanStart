import { useEffect, useRef } from "react";
import * as THREE from "three";

/* HeroGem ---------------------------------------------------------------------
   A real WebGL crystal for the dashboard hero, built with Three.js.

   Why Three.js over raw WebGL: per-face flat-shaded lighting, a Fresnel rim
   shader, a wireframe overlay, additive core glow and orbiting sprites are all
   a few lines each here; hand-writing the equivalent GLSL + matrix plumbing
   would be hundreds of lines for the same result. Bundle cost (~0.15MB gz)
   is acceptable for a desktop app where the dashboard loads first anyway.

   Geometry: an OctahedronGeometry scaled ~1.6x on Y — eight triangular faces,
   sharp apex top and bottom, taller than wide, reading as a cut gem.

   Everything is decorative: the canvas is pointer-events-none and the whole
   thing freezes (at a flattering angle) under prefers-reduced-motion. */

const COLD_WHITE = 0xe8f4ff;
const ICE_BLUE = 0xa8d8ff;
const CORE_BLUE = 0xc8e8ff;
const NAVY = 0x0a1830;

/** Soft radial sprite texture (white center fading to transparent). */
function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(220,238,255,0.65)");
  g.addColorStop(1, "rgba(200,232,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f);
  }
`;

interface Particle {
  sprite: THREE.Sprite;
  trail?: THREE.Sprite;
  radius: number;
  speed: number;
  angle: number;
  tilt: number;
  yOff: number;
  size: number;
  breathePhase: number;
  trailLag: number;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function HeroGem() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || 380;
    let height = mount.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // Group hierarchy: float/tilt (mouse + bob + intro) > spin (auto-rotate).
    const floatGroup = new THREE.Group();
    const spinGroup = new THREE.Group();
    floatGroup.add(spinGroup);
    scene.add(floatGroup);

    const RADIUS = 1.15;
    const Y_STRETCH = 1.6;

    const gemGeo = new THREE.OctahedronGeometry(RADIUS, 0);
    gemGeo.scale(1, Y_STRETCH, 1);

    // Faceted translucent body — flat shading gives per-face lighting/depth.
    const bodyMat = new THREE.MeshStandardMaterial({
      color: NAVY,
      metalness: 0.4,
      roughness: 0.16,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const body = new THREE.Mesh(gemGeo, bodyMat);
    spinGroup.add(body);

    // Fresnel rim — glows along the silhouette and shifts as the gem turns,
    // standing in for moving specular highlights.
    const fresnelMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(ICE_BLUE) },
        uPower: { value: 2.4 },
        uIntensity: { value: 1.5 },
      },
      vertexShader: FRESNEL_VERT,
      fragmentShader: FRESNEL_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fresnel = new THREE.Mesh(gemGeo, fresnelMat);
    fresnel.scale.setScalar(1.012);
    spinGroup.add(fresnel);

    // Crisp edge lines on every edge.
    const edges = new THREE.EdgesGeometry(gemGeo, 1);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wire = new THREE.LineSegments(edges, edgeMat);
    spinGroup.add(wire);

    const glowTex = makeGlowTexture();

    // Volumetric core glow.
    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(CORE_BLUE),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(2.1);
    floatGroup.add(core);

    // Two apex glints that catch the light, parented to the spin so they ride
    // the rotation.
    const glints: THREE.Sprite[] = [];
    for (const sign of [1, -1]) {
      const m = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(COLD_WHITE),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const s = new THREE.Sprite(m);
      s.scale.setScalar(0.7);
      s.position.set(0, sign * RADIUS * Y_STRETCH, 0);
      spinGroup.add(s);
      glints.push(s);
    }

    // Lights — a cold key from upper-left, an ice point from the right, low
    // ambient. Faces toward the key read brighter; depth emerges.
    scene.add(new THREE.AmbientLight(0x33405f, 0.9));
    const key = new THREE.DirectionalLight(COLD_WHITE, 2.4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.PointLight(ICE_BLUE, 6, 20);
    fill.position.set(4, -1, 3);
    scene.add(fill);

    // Orbiting particles. A few carry a faint trailing sprite.
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 11;
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const size = 0.05 + Math.random() * 0.035;
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.setScalar(size * 6);
      scene.add(sprite);

      let trail: THREE.Sprite | undefined;
      if (i % 3 === 0) {
        const trailMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(ICE_BLUE),
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        trail = new THREE.Sprite(trailMat);
        trail.scale.setScalar(size * 5);
        scene.add(trail);
      }

      particles.push({
        sprite,
        trail,
        radius: 1.45 + Math.random() * 1.15,
        speed: (0.18 + Math.random() * 0.34) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.9,
        yOff: (Math.random() - 0.5) * 1.4,
        size,
        breathePhase: Math.random() * Math.PI * 2,
        trailLag: 0.16 + Math.random() * 0.1,
      });
    }

    const placeParticle = (p: Particle, angle: number, target: THREE.Sprite) => {
      const x = Math.cos(angle) * p.radius;
      const z = Math.sin(angle) * p.radius;
      const y = p.yOff + Math.sin(angle) * p.radius * p.tilt;
      target.position.set(x, y, z);
    };

    // Pointer tracking — gem leans toward the cursor (mapped against the
    // canvas centre), spring-smoothed each frame.
    let targetTiltX = 0;
    let targetTiltY = 0;
    let curTiltX = 0;
    let curTiltY = 0;
    const MAX_TILT = THREE.MathUtils.degToRad(15);

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (event.clientX - cx) / (window.innerWidth / 2);
      const ny = (event.clientY - cy) / (window.innerHeight / 2);
      targetTiltY = THREE.MathUtils.clamp(nx, -1, 1) * MAX_TILT;
      targetTiltX = THREE.MathUtils.clamp(ny, -1, 1) * MAX_TILT;
    };
    if (!reduce) window.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let raf = 0;
    let running = false;

    const frame = () => {
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      // Intro: scale 0.3 -> 1 with spring overshoot over 0.8s.
      const introP = Math.min(t / 0.8, 1);
      floatGroup.scale.setScalar(0.3 + 0.7 * easeOutBack(introP));

      // Auto-rotate Y (12s/turn) + subtle X wobble (+/-8deg, 7s).
      spinGroup.rotation.y += dt * ((Math.PI * 2) / 12);
      spinGroup.rotation.x = THREE.MathUtils.degToRad(8) * Math.sin((t / 7) * Math.PI * 2);

      // Pointer tilt, spring-eased toward target (lerp 0.05/frame @60fps).
      curTiltX += (targetTiltX - curTiltX) * 0.05;
      curTiltY += (targetTiltY - curTiltY) * 0.05;
      floatGroup.rotation.x = curTiltX;
      floatGroup.rotation.y = curTiltY;

      // Idle float (+/-6px ~ 0.1 world units, 4s).
      floatGroup.position.y = Math.sin((t / 4) * Math.PI * 2) * 0.1;

      // Core pulse.
      const pulse = 0.5 + 0.5 * Math.sin((t / 3.4) * Math.PI * 2);
      coreMat.opacity = 0.4 + pulse * 0.4;
      core.scale.setScalar(1.9 + pulse * 0.35);

      // Glints sparkle out of phase.
      glints.forEach((g, i) => {
        const s = 0.5 + 0.5 * Math.sin((t / 2.2) * Math.PI * 2 + i * Math.PI);
        g.material.opacity = s * 0.8;
      });

      // Particles orbit + breathe; trails lag behind.
      for (const p of particles) {
        p.angle += p.speed * dt;
        placeParticle(p, p.angle, p.sprite);
        const breathe = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.breathePhase));
        p.sprite.material.opacity = breathe;
        if (p.trail) {
          placeParticle(p, p.angle - p.trailLag * Math.sign(p.speed || 1), p.trail);
          p.trail.material.opacity = breathe * 0.4;
        }
      }

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      frame();
    };

    const start = () => {
      if (reduce || running) return;
      running = true;
      clock.getDelta(); // drop the gap accumulated while paused
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (reduce) {
      // Static, flattering three-quarter angle. No loops.
      floatGroup.scale.setScalar(1);
      spinGroup.rotation.set(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(34), 0);
      coreMat.opacity = 0.55;
      glints.forEach((g) => (g.material.opacity = 0.5));
      particles.forEach((p) => {
        placeParticle(p, p.angle, p.sprite);
        if (p.trail) placeParticle(p, p.angle - p.trailLag, p.trail);
        p.sprite.material.opacity = 0.55;
      });
      renderer.render(scene, camera);
    } else {
      start();
    }

    // Pause the loop while the tab/window is hidden.
    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (reduce) renderer.render(scene, camera);
    });
    ro.observe(mount);

    return () => {
      stop();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();

      gemGeo.dispose();
      edges.dispose();
      bodyMat.dispose();
      fresnelMat.dispose();
      edgeMat.dispose();
      coreMat.dispose();
      glowTex.dispose();
      glints.forEach((g) => g.material.dispose());
      particles.forEach((p) => {
        p.sprite.material.dispose();
        p.trail?.material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none hidden h-[320px] w-[380px] shrink-0 lg:block"
    />
  );
}
