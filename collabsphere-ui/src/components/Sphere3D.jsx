import { useEffect, useRef } from "react";

// ── Module-level constants — computed once, never GC'd ─────────────────────

const ORBIT_PARAMS = [
  [0,              0],
  [Math.PI * 0.28, 0],
  [Math.PI * 0.55, 0],
  [Math.PI * 0.28, Math.PI / 2],
  [Math.PI * 0.55, Math.PI * 0.67],
  [Math.PI * 0.5,  Math.PI / 4],
];

const STEPS = 90; // quality/perf sweet-spot

// Build each orbit once as a Float32Array [x0,y0,z0, x1,y1,z1, ...]
// on the unit sphere, in its final orientation.
function buildOrbitBase(inc, yaw) {
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const buf = new Float32Array((STEPS + 1) * 3);
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const x0 = Math.cos(t), z0 = Math.sin(t);
    // tilt around Z axis (inclination)
    const x1 = x0 * ci, y1 = x0 * si, z1 = z0;
    // yaw around Y axis
    buf[i * 3]     = x1 * cy + z1 * sy;
    buf[i * 3 + 1] = y1;
    buf[i * 3 + 2] = -x1 * sy + z1 * cy;
  }
  return buf;
}

const BASE_ORBITS = ORBIT_PARAMS.map(([inc, yaw]) => buildOrbitBase(inc, yaw));

// Pre-compute exact 3D crossing points analytically (no runtime O(n²) detection).
// The normal to orbit (inc,yaw) is the transformed Y-axis:
//   n = (-sin(inc)*cos(yaw),  cos(inc),  sin(inc)*sin(yaw))
// The crossings of two great circles are ±normalize(n₁ × n₂).
const SPARKLE_BASES = (() => {
  const normal = (inc, yaw) => [
    -Math.sin(inc) * Math.cos(yaw),
     Math.cos(inc),
     Math.sin(inc) * Math.sin(yaw),
  ];
  const cross = ([ax,ay,az], [bx,by,bz]) => [
    ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx,
  ];
  const norm = ([x,y,z]) => {
    const l = Math.hypot(x, y, z);
    return l < 1e-9 ? [x,y,z] : [x/l, y/l, z/l];
  };

  const pts = [];
  for (let i = 0; i < ORBIT_PARAMS.length; i++) {
    for (let j = i + 1; j < ORBIT_PARAMS.length; j++) {
      const c = norm(cross(normal(...ORBIT_PARAMS[i]), normal(...ORBIT_PARAMS[j])));
      if (Math.hypot(...c) > 0.5) {
        pts.push(c, [-c[0], -c[1], -c[2]]);
      }
    }
  }
  return pts; // at most 30 fixed 3D crossing points
})();

// ── Component ──────────────────────────────────────────────────────────────

export function Sphere3D({ size = 320 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    rotX: 0, rotY: 0,
    velX: 0.0009, velY: 0.0015,
    mouse: null,        // { x, y } in canvas px
    energy: 0,          // 0–1, decays after click
    breathPhase: 0,     // drives subtle scale oscillation
  });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";

    const cx = size / 2, cy = size / 2;
    const R  = size * 0.36;

    // Pre-allocated projection buffers — never reallocated
    const px = new Float32Array(STEPS + 1);
    const py = new Float32Array(STEPS + 1);
    const pz = new Float32Array(STEPS + 1);

    // Project one orbit into px/py/pz using current global rotation + effective radius
    function projectOrbit(base, cY, sY, cX, sX, Reff) {
      for (let k = 0; k <= STEPS; k++) {
        const bx = base[k * 3], by = base[k * 3 + 1], bz = base[k * 3 + 2];
        const x1 = bx * cY + bz * sY;
        const z1 = -bx * sY + bz * cY;
        const y2 = by * cX - z1 * sX;
        const z2 = by * sX + z1 * cX;
        const sc = Reff * (2.6 / (2.2 + z2));
        px[k] = cx + x1 * sc;
        py[k] = cy + y2 * sc;
        pz[k] = z2;
      }
    }

    // Build a 2D canvas path for just the front OR back hemisphere of the current orbit.
    // Uses moveTo/lineTo to handle discontinuities without creating any arrays.
    function buildHemispherePath(front) {
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= STEPS; k++) {
        if ((pz[k] < 0) === front) {
          if (pen) ctx.lineTo(px[k], py[k]);
          else { ctx.moveTo(px[k], py[k]); pen = true; }
        } else {
          pen = false;
        }
      }
    }

    function draw() {
      const st = stateRef.current;

      // ── Physics ──────────────────────────────────────────────
      st.breathPhase += 0.007;
      st.energy = Math.max(0, st.energy - 0.016); // ~60-frame decay

      const breathScale = 1 + Math.sin(st.breathPhase) * 0.018 + st.energy * 0.05;

      if (st.mouse) {
        st.velX += ((st.mouse.y - cy) * 0.000055 - st.velX) * 0.08;
        st.velY += ((st.mouse.x - cx) * 0.000055 - st.velY) * 0.08;
      } else {
        st.velX += (0.0009 - st.velX) * 0.04;
        st.velY += (0.0015 - st.velY) * 0.04;
      }
      st.rotX += st.velX;
      st.rotY += st.velY;

      ctx.clearRect(0, 0, size, size);

      // ── Pre-compute rotation trig once per frame ─────────────
      const cY = Math.cos(st.rotY), sY = Math.sin(st.rotY);
      const cX = Math.cos(st.rotX), sX = Math.sin(st.rotX);

      // ── Atmosphere glow (shifts toward cursor) ────────────────
      const mx = st.mouse ? st.mouse.x : cx;
      const my = st.mouse ? st.mouse.y : cy;
      const atmR = R * breathScale * 1.22;
      const gx = cx + (mx - cx) * 0.15, gy = cy + (my - cy) * 0.15;
      const atm = ctx.createRadialGradient(gx, gy, atmR * 0.28, cx, cy, atmR);
      atm.addColorStop(0, `rgba(52,211,153,${0.07 + st.energy * 0.13})`);
      atm.addColorStop(0.55, `rgba(52,211,153,${0.02 + st.energy * 0.03})`);
      atm.addColorStop(1,   "rgba(52,211,153,0)");
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, atmR, 0, Math.PI * 2);
      ctx.fill();

      // ── Orbits — batched paths, no shadowBlur ─────────────────
      const Reff = R * breathScale;

      for (let oi = 0; oi < BASE_ORBITS.length; oi++) {
        projectOrbit(BASE_ORBITS[oi], cY, sY, cX, sX, Reff);

        // Back hemisphere — single dim stroke
        buildHemispherePath(false);
        ctx.strokeStyle = "rgba(52,211,153,0.15)";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Front hemisphere — three strokes on the SAME compiled path:
        // 1. Wide diffuse glow  2. Mid glow  3. Bright core
        buildHemispherePath(true);

        ctx.strokeStyle = `rgba(40,200,130,${0.17 + st.energy * 0.22})`;
        ctx.lineWidth = 7 + st.energy * 5;
        ctx.stroke();

        ctx.strokeStyle = `rgba(90,220,160,${0.42 + st.energy * 0.28})`;
        ctx.lineWidth = 3.0 + st.energy * 2;
        ctx.stroke();

        ctx.strokeStyle = `rgba(180,248,210,${0.90 + st.energy * 0.10})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Sparkle intersections — pre-computed 3D, just project ─
      for (const [bx, by, bz] of SPARKLE_BASES) {
        // Apply same global rotation
        const x1 = bx * cY + bz * sY;
        const z1 = -bx * sY + bz * cY;
        const y2 = by * cX - z1 * sX;
        const z2 = by * sX + z1 * cX;
        if (z2 > 0.05) continue; // skip back-facing
        const alpha = Math.max(0, 0.95 + z2 * (-1.8));
        const sc = Reff * (2.6 / (2.2 + z2));
        const spx = cx + x1 * sc, spy = cy + y2 * sc;

        // Three layered arcs — no radial gradient, no shadowBlur
        ctx.beginPath();
        ctx.arc(spx, spy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${alpha * (0.22 + st.energy * 0.28)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(spx, spy, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,243,208,${alpha * (0.65 + st.energy * 0.22)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(spx, spy, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * (0.88 + st.energy * 0.12)})`;
        ctx.fill();
      }

      // ── Click ripple ring ─────────────────────────────────────
      if (st.energy > 0.02) {
        const rippleR = R * breathScale * (1 + (1 - st.energy) * 0.55);
        ctx.beginPath();
        ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,230,170,${st.energy * 0.45})`;
        ctx.lineWidth = st.energy * 2.5;
        ctx.stroke();

        if (st.energy > 0.5) {
          const rippleR2 = R * breathScale * (1 + (1 - st.energy) * 0.25);
          ctx.beginPath();
          ctx.arc(cx, cy, rippleR2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(167,243,208,${(st.energy - 0.5) * 0.5})`;
          ctx.lineWidth = (st.energy - 0.5) * 3;
          ctx.stroke();
        }
      }

      // ── Custom crosshair cursor ───────────────────────────────
      if (st.mouse) {
        const { x: hx, y: hy } = st.mouse;
        const dist = Math.hypot(hx - cx, hy - cy);
        const insideSphere = dist < R * breathScale * 1.05;
        const cursorAlpha = insideSphere ? 0.9 : 0.55;

        // Dot
        ctx.beginPath();
        ctx.arc(hx, hy, insideSphere ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,243,208,${cursorAlpha})`;
        ctx.fill();

        // Crosshair lines
        const arm = insideSphere ? 10 : 7, gap = insideSphere ? 5 : 3.5;
        ctx.strokeStyle = `rgba(167,243,208,${cursorAlpha * 0.65})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx - arm, hy); ctx.lineTo(hx - gap, hy);
        ctx.moveTo(hx + gap,  hy); ctx.lineTo(hx + arm, hy);
        ctx.moveTo(hx, hy - arm); ctx.lineTo(hx, hy - gap);
        ctx.moveTo(hx, hy + gap);  ctx.lineTo(hx, hy + arm);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  const rect = () => canvasRef.current?.getBoundingClientRect();

  const onMouseMove  = (e) => { const r = rect(); if (r) stateRef.current.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMouseLeave = ()  => { stateRef.current.mouse = null; };
  const onClick      = ()  => { stateRef.current.energy = 1; };
  const onTouchMove  = (e) => { const r = rect(), t = e.touches[0]; if (r && t) stateRef.current.mouse = { x: t.clientX - r.left, y: t.clientY - r.top }; };
  const onTouchEnd   = ()  => { stateRef.current.mouse = null; };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ display: "block", cursor: "none", touchAction: "none" }}
      aria-hidden="true"
    />
  );
}
