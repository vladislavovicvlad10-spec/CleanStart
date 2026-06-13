// Pointer-driven motion helpers. Every handler writes styles directly to the
// element (no React state, no re-render) so they stay under one frame even on
// rapid mousemove. All effects no-op under prefers-reduced-motion.

import type { MouseEvent as ReactMouseEvent } from "react";

let reduceMotion = false;
if (typeof window !== "undefined" && window.matchMedia) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduceMotion = mq.matches;
  mq.addEventListener?.("change", (event) => {
    reduceMotion = event.matches;
  });
}

export function prefersReducedMotion(): boolean {
  return reduceMotion;
}

const MAX_TILT_DEG = 5;

/**
 * 3D tilt toward the cursor plus a spotlight position. Rotation is capped at
 * ~7deg; the card also lifts on Z. Coordinates feed the gradient border/glow
 * via --mx / --my. Pair with onTiltEnter / onTiltLeave for the spring return.
 */
export function onTiltMove(event: ReactMouseEvent<HTMLElement>) {
  if (reduceMotion) return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const nx = x / rect.width - 0.5;
  const ny = y / rect.height - 0.5;
  el.style.transform = `perspective(1000px) rotateX(${(-ny * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(nx * MAX_TILT_DEG).toFixed(2)}deg) translateZ(10px)`;
  el.style.setProperty("--mx", `${x}px`);
  el.style.setProperty("--my", `${y}px`);
}

/** Switch to a fast follow transition while the cursor is over the card. */
export function onTiltEnter(event: ReactMouseEvent<HTMLElement>) {
  if (reduceMotion) return;
  event.currentTarget.style.transition = "transform 120ms linear";
}

/** Spring back home; clears the inline transform so :hover styles settle. */
export function onTiltLeave(event: ReactMouseEvent<HTMLElement>) {
  if (reduceMotion) return;
  const el = event.currentTarget;
  el.style.transition = "";
  el.style.transform = "";
}

/**
 * Parallax: writes normalized cursor offset (-1..1) as --px / --py on the
 * target. Layers inside read these vars with their own multipliers.
 */
export function onParallaxMove(event: ReactMouseEvent<HTMLElement>) {
  if (reduceMotion) return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty("--px", (px * 2).toFixed(3));
  el.style.setProperty("--py", (py * 2).toFixed(3));
}

export function onParallaxLeave(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--px", "0");
  el.style.setProperty("--py", "0");
}
