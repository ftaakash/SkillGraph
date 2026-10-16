"use client";

import { useEffect, useRef } from "react";

/**
 * Landing-page background: a rising market chart and a small skill network, rendered as a
 * glowing grid of gold cells with shimmer and occasional glitches (a "grid glow" effect).
 *
 * It follows the pointer: the chart line bends up or down towards the pointer around its column,
 * the skill nodes drift out of its way, and a click sends a ripple through the grid
 * (all off for reduced motion).
 *
 * Everything is drawn on a canvas in the page, so there is no video player, no controls and no
 * footage to license. The scene is drawn at one pixel per cell into a small offscreen canvas;
 * each cell's brightness then sets the size and glow of its square on screen.
 */

const CELL = 9;            // on-screen cell size in CSS pixels
const FPS = 30;
const GOLD = [212, 175, 55] as const;     // theme primary
const AMBER = [255, 196, 92] as const;    // brightest cells
const GLITCH = [255, 120, 60] as const;   // occasional warm glitch tint
const EMBER = [176, 92, 28] as const;     // dim edges fade towards deep amber

type Node = { x: number; y: number; vx: number; vy: number; r: number };

export default function GridGlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const scene = document.createElement("canvas");
    const sctx = scene.getContext("2d", { willReadFrequently: true });
    if (!ctx || !sctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cols = 0, rows = 0, dpr = 1, raf = 0, last = 0;
    let nodes: Node[] = [];
    let glitchRows: { row: number; shift: number; until: number }[] = [];

    // Pointer, in cell units. The position eases towards the pointer and the effect fades in when
    // the pointer is over the background and out when it leaves, so nothing jumps.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 };
    let ripples: { x: number; y: number; start: number }[] = [];
    const POINTER_RADIUS = 16;    // cells
    const RIPPLE_MS = 1400;

    const toCells = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / CELL, y = (e.clientY - rect.top) / CELL;
      return x >= 0 && y >= 0 && x <= cols && y <= rows ? { x, y } : null;
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = toCells(e);
      if (!p) { pointer.target = 0; return; }
      if (pointer.strength < 0.05) { pointer.x = p.x; pointer.y = p.y; }
      pointer.tx = p.x; pointer.ty = p.y; pointer.target = 1;
    };
    const onPointerDown = (e: PointerEvent) => {
      const p = toCells(e);
      if (p) ripples = [...ripples.slice(-4), { x: p.x, y: p.y, start: performance.now() }];
    };
    const onPointerLeave = () => { pointer.target = 0; };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      scene.width = cols;
      scene.height = rows;
      // A small network of "skills" drifting on the right-hand side
      nodes = Array.from({ length: 9 }, (_, i) => ({
        x: cols * (0.58 + 0.38 * ((i * 37) % 100) / 100),
        y: rows * (0.12 + 0.6 * ((i * 61) % 100) / 100),
        vx: (((i * 13) % 7) - 3) * 0.004,
        vy: (((i * 17) % 7) - 3) * 0.004,
        r: 1.8 + (i % 3) * 0.8,
      }));
    };

    // The scene, one pixel per cell: brightness becomes the cell's glow
    const drawScene = (t: number) => {
      sctx.fillStyle = "#000";
      sctx.fillRect(0, 0, cols, rows);

      // Rising market line with a soft filled area beneath it
      const points: [number, number][] = [];
      for (let x = 0; x <= cols; x++) {
        const p = x / cols;
        const trend = rows * (0.78 - 0.5 * p);
        const wave = Math.sin(p * 9 + t * 0.6) * rows * 0.035 + Math.sin(p * 23 - t * 1.1) * rows * 0.015;
        // The wave follows the pointer: around the pointer's column the line bends towards its height,
        // falling off smoothly to either side
        const pull = pointer.strength * Math.exp(-(((x - pointer.x) / (cols * 0.16)) ** 2));
        points.push([x, trend + wave + (pointer.y - (trend + wave)) * pull * 0.85]);
      }
      const area = sctx.createLinearGradient(0, rows * 0.25, 0, rows);
      area.addColorStop(0, "rgba(255,255,255,0.32)");
      area.addColorStop(1, "rgba(255,255,255,0)");
      sctx.beginPath();
      sctx.moveTo(0, rows);
      points.forEach(([x, y]) => sctx.lineTo(x, y));
      sctx.lineTo(cols, rows);
      sctx.closePath();
      sctx.fillStyle = area;
      sctx.fill();
      sctx.beginPath();
      points.forEach(([x, y], i) => (i ? sctx.lineTo(x, y) : sctx.moveTo(x, y)));
      sctx.strokeStyle = "rgba(255,255,255,0.95)";
      sctx.lineWidth = 2.2;
      sctx.stroke();

      // Candles along the line
      for (let x = 4; x < cols; x += 7) {
        const [, y] = points[x];
        const h = 3 + Math.abs(Math.sin(x * 1.7 + t * 0.8)) * 6;
        sctx.fillStyle = "rgba(255,255,255,0.55)";
        sctx.fillRect(x - 1, y - h - 2, 2, h);
      }

      // Skill network: drifting nodes with links between nearby ones
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        // Nodes near the pointer drift away from it
        if (pointer.strength > 0.01) {
          const dx = n.x - pointer.x, dy = n.y - pointer.y, d = Math.hypot(dx, dy) || 1;
          if (d < POINTER_RADIUS) {
            const push = (1 - d / POINTER_RADIUS) * 0.35 * pointer.strength;
            n.x += (dx / d) * push; n.y += (dy / d) * push;
          }
        }
        if (n.x < cols * 0.5 || n.x > cols * 0.98) n.vx = Math.abs(n.vx) * (n.x < cols * 0.5 ? 1 : -1);
        if (n.y < rows * 0.06 || n.y > rows * 0.75) n.vy = Math.abs(n.vy) * (n.y < rows * 0.06 ? 1 : -1);
      }
      sctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > cols * 0.22) continue;
          sctx.strokeStyle = `rgba(255,255,255,${0.45 * (1 - d / (cols * 0.22))})`;
          sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(b.x, b.y); sctx.stroke();
        }
      }
      for (const n of nodes) {
        const pulse = 0.75 + 0.25 * Math.sin(t * 2 + n.x);
        sctx.fillStyle = `rgba(255,255,255,${pulse})`;
        sctx.beginPath(); sctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); sctx.fill();
      }
    };

    const render = (now: number) => {
      const t = now / 1000;
      // Ease the pointer so the chart glides after it; it lets go when the pointer leaves the page
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      pointer.strength += (pointer.target - pointer.strength) * 0.06;
      drawScene(t);
      const data = sctx.getImageData(0, 0, cols, rows).data;

      // Glitches: now and then a few rows slip sideways for a moment
      if (!reduceMotion && Math.random() < 0.04) {
        const row = Math.floor(Math.random() * rows);
        glitchRows.push({ row, shift: Math.round((Math.random() - 0.5) * 8), until: now + 120 + Math.random() * 200 });
      }
      glitchRows = glitchRows.filter(g => g.until > now);
      const shiftFor = (r: number) => glitchRows.find(g => Math.abs(g.row - r) <= 1)?.shift ?? 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, cols * CELL, rows * CELL);

      ripples = ripples.filter(rp => now - rp.start < RIPPLE_MS);

      for (let r = 0; r < rows; r++) {
        const shift = shiftFor(r);
        for (let c = 0; c < cols; c++) {
          const b = data[(r * cols + c) * 4] / 255;
          // Faint grid everywhere, so the field reads as a dot matrix even where it's dark
          const shimmer = reduceMotion ? 0 : (Math.sin(c * 0.9 + r * 1.3 + t * 3) + 1) * 0.5;
          let level = b > 0.04 ? b : 0.025 + 0.02 * shimmer;
          const x = (c + shift) * CELL, y = r * CELL;

          // Click ripples: a bright ring that expands and fades
          let boost = 0;
          for (const rp of ripples) {
            const age = (now - rp.start) / RIPPLE_MS;
            const ring = Math.abs(Math.hypot(c - rp.x, r - rp.y) - age * 40);
            if (ring < 2.5) boost += (1 - ring / 2.5) * (1 - age) * 0.9;
          }
          if (boost > 0) level = Math.min(1, level + boost * 0.6);

          const size = Math.max(1, CELL * (0.18 + 0.62 * Math.min(1, level * 1.4)));
          const off = (CELL - size) / 2;
          const flicker = !reduceMotion && b > 0.2 && Math.random() < 0.015;
          const col = shift !== 0 && b > 0.1 ? GLITCH : level > 0.75 ? AMBER : level > 0.3 ? GOLD : b > 0.04 ? EMBER : GOLD;
          const alpha = Math.min(1, (flicker ? 0.25 : 1) * (0.12 + level * 0.95));
          if (level > 0.25) {
            // Soft glow behind bright cells
            ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.28})`;
            ctx.fillRect(x - 3, y - 3, CELL + 6, CELL + 6);
          }
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
          ctx.fillRect(x + off, y + off, size, size);
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      render(now);
    };

    resize();
    if (reduceMotion) {
      render(4000); // one still frame
    } else {
      raf = requestAnimationFrame(loop);
    }
    const onResize = () => { resize(); if (reduceMotion) render(4000); };
    window.addEventListener("resize", onResize);
    // The page content sits on top of the canvas, so listen on the window
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("blur", onPointerLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Keep the hero text readable over the animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.72),transparent_65%)]" />
    </div>
  );
}
