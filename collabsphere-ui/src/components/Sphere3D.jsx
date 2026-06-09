import { useEffect, useRef } from "react";

const POINTS = 5200;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

const BAND_A = normalize([0.36, 0.48, 0.80]);
const BAND_B = normalize([-0.68, 0.24, 0.70]);
const BAND_C = normalize([0.18, 0.94, -0.28]);
const ORBITS = [
  { normal: BAND_A, front: "rgba(118,229,255,0.72)", back: "rgba(56,189,248,0.22)", width: 2.2, phase: -0.1 },
  { normal: BAND_B, front: "rgba(196,181,253,0.62)", back: "rgba(139,92,246,0.18)", width: 1.8, phase: 0.22 },
  { normal: BAND_C, front: "rgba(221,214,254,0.42)", back: "rgba(139,92,246,0.12)", width: 1.25, phase: 0.44 },
];

const CLOUD = (() => {
  const rand = seededRandom(9);
  const x = new Float32Array(POINTS);
  const y = new Float32Array(POINTS);
  const z = new Float32Array(POINTS);
  const size = new Float32Array(POINTS);
  const brightness = new Float32Array(POINTS);
  const phase = new Float32Array(POINTS);
  const speed = new Float32Array(POINTS);
  const cyan = new Float32Array(POINTS);
  const green = new Float32Array(POINTS);
  const sparkle = new Uint8Array(POINTS);

  for (let i = 0; i < POINTS; i += 1) {
    const yy = 1 - (i / (POINTS - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - yy * yy));
    const theta = GOLDEN_ANGLE * i;
    const xx = Math.cos(theta) * radius;
    const zz = Math.sin(theta) * radius;
    const cyanI = Math.max(0, 1 - Math.abs(xx * BAND_A[0] + yy * BAND_A[1] + zz * BAND_A[2]) / 0.31);
    const greenI = Math.max(
      0,
      1 - Math.min(
        Math.abs(xx * BAND_B[0] + yy * BAND_B[1] + zz * BAND_B[2]) / 0.15,
        Math.abs(xx * BAND_C[0] + yy * BAND_C[1] + zz * BAND_C[2]) / 0.12,
      ),
    );
    const band = Math.max(cyanI, greenI);
    const r = rand();

    x[i] = xx;
    y[i] = yy;
    z[i] = zz;
    cyan[i] = cyanI;
    green[i] = greenI;
    brightness[i] = 0.44 + rand() * 0.56 + band * 0.24;
    phase[i] = rand() * Math.PI * 2;
    speed[i] = 0.009 + rand() * 0.026;
    size[i] = r < 0.72 ? 0.3 + rand() * 0.55 : r < 0.93 ? 0.72 + rand() * 0.95 : 1.8 + rand() * 2.6;
    sparkle[i] = size[i] > 1.75 || (band > 0.82 && rand() > 0.94) ? 1 : 0;
  }

  return { x, y, z, size, brightness, phase, speed, cyan, green, sparkle };
})();

export function Sphere3D({ size = 320 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    rotX: -0.12,
    rotY: 0.4,
    velX: 0.0005,
    velY: 0.0032,
    dragging: false,
    lastX: 0,
    lastY: 0,
    pointerX: 0,
    pointerY: 0,
    energy: 0,
    tick: 0,
  });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.42;
    const drawCount = size < 250 ? 3600 : POINTS;

    function drawOrbit(orbit, rotX, rotY, radius, energy) {
      const [nx, ny, nz] = orbit.normal;
      const basisA = normalize(Math.abs(ny) < 0.94 ? [ny, -nx, 0] : [0, nz, -ny]);
      const basisB = [
        ny * basisA[2] - nz * basisA[1],
        nz * basisA[0] - nx * basisA[2],
        nx * basisA[1] - ny * basisA[0],
      ];
      const cY = Math.cos(rotY + orbit.phase);
      const sY = Math.sin(rotY + orbit.phase);
      const cX = Math.cos(rotX);
      const sX = Math.sin(rotX);

      for (let pass = 0; pass < 2; pass += 1) {
        ctx.beginPath();
        let pen = false;
        for (let step = 0; step <= 112; step += 1) {
          const t = (step / 112) * Math.PI * 2;
          const bx = basisA[0] * Math.cos(t) + basisB[0] * Math.sin(t);
          const by = basisA[1] * Math.cos(t) + basisB[1] * Math.sin(t);
          const bz = basisA[2] * Math.cos(t) + basisB[2] * Math.sin(t);
          const x1 = bx * cY + bz * sY;
          const z1 = -bx * sY + bz * cY;
          const y1 = by * cX - z1 * sX;
          const z2 = by * sX + z1 * cX;
          const front = z2 < -0.02;
          if ((pass === 1) !== front) {
            pen = false;
            continue;
          }
          const scale = radius * (1.46 / (2.08 + z2));
          const sx = cx + x1 * scale;
          const sy = cy - y1 * scale;
          if (pen) ctx.lineTo(sx, sy);
          else {
            ctx.moveTo(sx, sy);
            pen = true;
          }
        }
        ctx.strokeStyle = pass === 1 ? orbit.front : orbit.back;
        ctx.lineWidth = (pass === 1 ? orbit.width : orbit.width * 0.5) + energy * 1.2;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    function drawPoint(sx, sy, alpha, drawSize, depth, cyanI, greenI, sparkle, tick, phase, speed) {
      const band = Math.max(cyanI, greenI);
      const twinkle = 0.74 + 0.26 * Math.sin(phase + tick * speed);

      if (sparkle && depth > 0.5 && alpha > 0.08) {
        const haloSize = drawSize * (cyanI > 0.1 ? 5.4 : 4.2);
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloSize);
        if (cyanI > greenI) {
          halo.addColorStop(0, `rgba(255,255,255,${Math.min(0.86, alpha * 1.55)})`);
          halo.addColorStop(0.22, `rgba(166,238,255,${alpha})`);
          halo.addColorStop(0.62, `rgba(56,189,248,${alpha * 0.32})`);
          halo.addColorStop(1, "rgba(56,189,248,0)");
        } else {
          halo.addColorStop(0, `rgba(255,255,255,${Math.min(0.82, alpha * 1.45)})`);
          halo.addColorStop(0.24, `rgba(216,180,254,${alpha})`);
          halo.addColorStop(0.64, `rgba(139,92,246,${alpha * 0.32})`);
          halo.addColorStop(1, "rgba(139,92,246,0)");
        }
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sx, sy, haloSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (cyanI > 0.02) {
        const c = Math.min(1, cyanI);
        ctx.fillStyle = `rgba(${Math.round(78 + c * 84)},${Math.round(193 + c * 50)},255,${alpha * (0.8 + c * 0.45)})`;
      } else if (greenI > 0.02) {
        const g = Math.min(1, greenI);
        ctx.fillStyle = `rgba(${Math.round(150 + g * 46)},${Math.round(120 + g * 60)},250,${alpha * (0.78 + g * 0.38)})`;
      } else {
        ctx.fillStyle = `rgba(${Math.round(120 + depth * 60)},${Math.round(130 + depth * 50)},${Math.round(230 + band * 25)},${alpha * 0.72})`;
      }

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.36, drawSize * twinkle), 0, Math.PI * 2);
      ctx.fill();
    }

    function draw() {
      const st = stateRef.current;
      st.tick += 1;
      st.energy = Math.max(0, st.energy - 0.017);

      if (!st.dragging) {
        st.velX += (st.pointerY * -0.0009 + 0.0005 - st.velX) * 0.035;
        st.velY += (st.pointerX * 0.0012 + 0.0032 - st.velY) * 0.04;
      }
      st.rotX = Math.max(-0.58, Math.min(0.5, st.rotX + st.velX));
      st.rotY += st.velY;

      const radius = baseRadius * (1 + Math.sin(st.tick * 0.024) * 0.014 + st.energy * 0.05);
      const cY = Math.cos(st.rotY);
      const sY = Math.sin(st.rotY);
      const cX = Math.cos(st.rotX);
      const sX = Math.sin(st.rotX);

      ctx.clearRect(0, 0, size, size);

      const glow = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.2, radius * 0.12, cx, cy, radius * 1.55);
      glow.addColorStop(0, `rgba(165,180,252,${0.22 + st.energy * 0.22})`);
      glow.addColorStop(0.42, `rgba(99,102,241,${0.08 + st.energy * 0.08})`);
      glow.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.55, 0, Math.PI * 2);
      ctx.fill();

      ORBITS.slice(1).forEach((orbit) => drawOrbit(orbit, st.rotX, st.rotY, radius, st.energy));

      for (let pass = 0; pass < 2; pass += 1) {
        const frontPass = pass === 1;
        for (let i = 0; i < drawCount; i += 1) {
          const x1 = CLOUD.x[i] * cY + CLOUD.z[i] * sY;
          const z1 = -CLOUD.x[i] * sY + CLOUD.z[i] * cY;
          const y1 = CLOUD.y[i] * cX - z1 * sX;
          const z2 = CLOUD.y[i] * sX + z1 * cX;
          const front = z2 < -0.025;
          if (frontPass !== front) continue;

          const scale = radius * (1.46 / (2.08 + z2));
          const sx = cx + x1 * scale;
          const sy = cy - y1 * scale;
          const dist = Math.hypot(sx - cx, sy - cy);
          const edge = Math.pow(Math.max(0, 1 - dist / (radius * 1.04)), 0.36);
          if (edge < 0.014) continue;

          const depth = (1 - z2) * 0.5;
          const band = Math.max(CLOUD.cyan[i], CLOUD.green[i]);
          const backBoost = !frontPass && band > 0.04 ? 0.35 : 0.11;
          const depthAlpha = frontPass ? 0.44 + depth * 0.9 : backBoost + depth * 0.14;
          const alpha = edge * depthAlpha * CLOUD.brightness[i] * (0.88 + st.energy * 0.38);
          if (alpha < 0.012) continue;

          const drawSize = CLOUD.size[i] * (0.42 + depth * 0.8 + band * 0.15);
          drawPoint(sx, sy, alpha, drawSize, depth, CLOUD.cyan[i], CLOUD.green[i], CLOUD.sparkle[i], st.tick, CLOUD.phase[i], CLOUD.speed[i]);
        }
      }

      drawOrbit(ORBITS[0], st.rotX, st.rotY, radius, st.energy);

      if (st.energy > 0.02) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1.02 + (1 - st.energy) * 0.46), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(165,180,252,${st.energy * 0.52})`;
        ctx.lineWidth = 1.4 + st.energy * 3;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(event) => {
        const st = stateRef.current;
        st.dragging = true;
        st.lastX = event.clientX;
        st.lastY = event.clientY;
        st.velX = 0;
        st.velY = 0;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.style.cursor = "grabbing";
      }}
      onPointerUp={(event) => {
        stateRef.current.dragging = false;
        event.currentTarget.style.cursor = "grab";
      }}
      onPointerLeave={() => {
        const st = stateRef.current;
        st.dragging = false;
        st.pointerX = 0;
        st.pointerY = 0;
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const st = stateRef.current;
        st.pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        st.pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        if (!st.dragging) return;
        const dx = event.clientX - st.lastX;
        const dy = event.clientY - st.lastY;
        st.rotY += dx * 0.008;
        st.rotX += dy * 0.006;
        st.velY = dx * 0.0045;
        st.velX = dy * 0.0035;
        st.lastX = event.clientX;
        st.lastY = event.clientY;
      }}
      onClick={() => {
        stateRef.current.energy = 1;
      }}
      style={{ display: "block", cursor: "grab", touchAction: "none" }}
      aria-hidden="true"
    />
  );
}
