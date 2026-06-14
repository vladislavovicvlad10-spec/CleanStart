import { useEffect, useRef } from "react";
import * as THREE from "three";

/* HeroOrb ---------------------------------------------------------------------
   A Stripe/Linear-style gradient glow sphere for the dashboard hero, drawn on
   a transparent WebGL canvas with Three.js + a custom GLSL ShaderMaterial.

   Technique: a high-poly SphereGeometry is displaced in the vertex shader by
   3D simplex noise (Ashima/McEwan snoise, inlined) along each normal, so the
   surface breathes like liquid. The fragment shader lights it with a fake
   directional source (diffuse + 32-power specular + cubic Fresnel rim) and
   ramps deep-navy -> deep-blue -> cyan by facing angle, then mixes a faint
   noise-driven purple drift. Palette is hardcoded as linear vec3 constants so
   colors stay vivid (no tone mapping, no color-management surprises).

   Decorative: canvas is pointer-events-none. Under prefers-reduced-motion the
   displacement, rotation, parallax and CSS pulses all stop; the orb still
   renders, just static. */

// 3D Simplex noise — Ian McEwan, Ashima Arts (public domain). Inlined so the
// shader is self-contained.
const SIMPLEX_3D = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uDisplace;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vModelPos;
  ${SIMPLEX_3D}
  void main() {
    vModelPos = position;
    float disp = snoise(position * 1.2 + uTime * 0.3) * 0.18 * uDisplace;
    vec3 displaced = position + normal * disp;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vViewPos = mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vModelPos;
  ${SIMPLEX_3D}

  const vec3 deepColor      = vec3(0.0196, 0.0510, 0.1020); // #050d1a
  const vec3 midColor       = vec3(0.0392, 0.1647, 0.2902); // #0a2a4a
  const vec3 highlightColor = vec3(0.0000, 0.7059, 0.8471); // #00b4d8
  const vec3 hotSpotColor   = vec3(0.9098, 0.9569, 1.0000); // #e8f4ff
  const vec3 edgeGlowColor  = vec3(0.0000, 0.7059, 0.8471); // cyan rim
  const vec3 purpleColor    = vec3(0.2902, 0.0000, 0.6275); // #4a00a0

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    vec3 L = normalize(vec3(-0.5, 1.0, 0.8));

    float diffuse = max(dot(N, L), 0.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float specular = pow(max(dot(reflect(-L, N), V), 0.0), 32.0);

    vec3 color = mix(deepColor, midColor, smoothstep(0.0, 0.55, diffuse));
    color = mix(color, highlightColor, smoothstep(0.5, 1.0, diffuse));
    color += specular * hotSpotColor;
    color += fresnel * edgeGlowColor * 0.9;

    float drift = snoise(vModelPos * 1.5 + uTime * 0.15) * 0.5 + 0.5;
    color = mix(color, purpleColor, 0.15 * drift);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const CANVAS = 420;

export function HeroOrb() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(CANVAS, CANVAS);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDisplace: { value: reduce ? 0 : 1 },
        uOpacity: { value: reduce ? 1 : 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
    });
    // Parallax group (set per frame) wraps the orb (auto-rotation accumulates).
    const parallax = new THREE.Group();
    const orb = new THREE.Mesh(geometry, material);
    parallax.add(orb);
    scene.add(parallax);

    let time = 0;
    let raf = 0;
    let running = false;

    // Pointer parallax (spring-eased toward target).
    let targetX = 0;
    let targetY = 0;
    let offX = 0;
    let offY = 0;
    const onPointerMove = (event: PointerEvent) => {
      targetX = (event.clientY / window.innerHeight - 0.5) * 0.4;
      targetY = (event.clientX / window.innerWidth - 0.5) * 0.4;
    };
    if (!reduce) window.addEventListener("pointermove", onPointerMove);

    const start = performance.now();

    const frame = () => {
      // Hypnotic time + slow auto-rotation (accumulates on the orb).
      time += 0.008;
      material.uniforms.uTime.value = time;
      orb.rotation.y += 0.0015;
      orb.rotation.x += 0.0005;

      // Parallax: lerp the group's tilt toward the cursor target (set, not
      // accumulated, so it can't drift).
      offX += (targetX - offX) * 0.05;
      offY += (targetY - offY) * 0.05;
      parallax.rotation.x = offX;
      parallax.rotation.y = offY;

      // Load-in: scale 0 -> 1 with spring overshoot (~1.07) over 1.2s; fade in.
      const elapsed = (performance.now() - start) / 1000;
      orb.scale.setScalar(easeOutBack(Math.min(elapsed / 1.2, 1)));
      material.uniforms.uOpacity.value = Math.min(elapsed / 0.5, 1);

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      frame();
    };

    const startLoop = () => {
      if (reduce || running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (reduce) {
      orb.scale.setScalar(1);
      orb.rotation.set(0.2, 0.6, 0);
      material.uniforms.uTime.value = 1.0;
      renderer.render(scene, camera);
    } else {
      startLoop();
    }

    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopLoop();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden h-[300px] w-[380px] shrink-0 min-[900px]:block"
    >
      {/* CSS glow layers behind the canvas (pulse via keyframes). */}
      <span className="hero-orb-glow hero-orb-glow-b" />
      <span className="hero-orb-glow hero-orb-glow-a" />
      {/* Canvas mount — 420x420 centered, overflow softly clipped by the hero. */}
      <div
        ref={mountRef}
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
