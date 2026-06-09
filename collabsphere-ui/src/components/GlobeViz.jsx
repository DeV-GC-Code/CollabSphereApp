import { useEffect, useRef } from "react";

const DOT_COUNT = 9800;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

const CYAN_BAND = normalize([0.34, 0.44, 0.83]);
const GREEN_BAND = normalize([-0.72, 0.30, 0.62]);
const MERIDIAN_BAND = normalize([0.18, 0.92, -0.34]);

const DOTS = (() => {
  const rand = seededRandom(42);
  const x = new Float32Array(DOT_COUNT);
  const y = new Float32Array(DOT_COUNT);
  const z = new Float32Array(DOT_COUNT);
  const size = new Float32Array(DOT_COUNT);
  const brightness = new Float32Array(DOT_COUNT);
  const phase = new Float32Array(DOT_COUNT);
  const speed = new Float32Array(DOT_COUNT);
  const cyan = new Float32Array(DOT_COUNT);
  const green = new Float32Array(DOT_COUNT);
  const meridian = new Float32Array(DOT_COUNT);
  const sparkle = new Uint8Array(DOT_COUNT);

  for (let i = 0; i < DOT_COUNT; i += 1) {
    const yy = 1 - (i / (DOT_COUNT - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - yy * yy));
    const theta = GOLDEN_ANGLE * i;
    const xx = Math.cos(theta) * radius;
    const zz = Math.sin(theta) * radius;
    const cDot = Math.abs(xx * CYAN_BAND[0] + yy * CYAN_BAND[1] + zz * CYAN_BAND[2]);
    const gDot = Math.abs(xx * GREEN_BAND[0] + yy * GREEN_BAND[1] + zz * GREEN_BAND[2]);
    const mDot = Math.abs(xx * MERIDIAN_BAND[0] + yy * MERIDIAN_BAND[1] + zz * MERIDIAN_BAND[2]);
    const cyanI = Math.max(0, 1 - cDot / 0.33);
    const greenI = Math.max(0, 1 - gDot / 0.16);
    const meridianI = Math.max(0, 1 - mDot / 0.12);
    const bandI = Math.max(cyanI, greenI, meridianI);
    const r = rand();

    x[i] = xx;
    y[i] = yy;
    z[i] = zz;
    cyan[i] = cyanI;
    green[i] = greenI;
    meridian[i] = meridianI;
    brightness[i] = 0.28 + rand() * 0.48 + bandI * 0.22;
    phase[i] = rand() * Math.PI * 2;
    speed[i] = 0.006 + rand() * 0.022;
    size[i] = r < 0.72
      ? 0.18 + rand() * 0.38
      : r < 0.94
        ? 0.58 + rand() * 0.82
        : 1.8 + rand() * 2.8;
    sparkle[i] = size[i] > 1.75 || (bandI > 0.82 && rand() > 0.96) ? 1 : 0;
  }

  return { x, y, z, size, brightness, phase, speed, cyan, green, meridian, sparkle };
})();

export function GlobeViz({ size = 460 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    rotX: -0.16,
    rotY: 0.32,
    velX: 0.0002,
    velY: 0.0034,
    dragging: false,
    lastX: 0,
    lastY: 0,
    hoverX: 0,
    hoverY: 0,
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
    ctx.globalCompositeOperation = "source-over";

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.44;
    const maxDots = size < 360 ? 8200 : DOT_COUNT;

    function drawParticle(sx, sy, depth, alpha, drawSize, cyanI, greenI, meridianI, twinkle, isSparkle) {
      const band = Math.max(cyanI, greenI, meridianI);
      const haloEligible = isSparkle && depth > 0.52 && alpha > 0.14;

      if (haloEligible) {
        const haloSize = drawSize * (cyanI > 0.2 ? 8.5 : 6.2);
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloSize);
        if (cyanI > greenI) {
          halo.addColorStop(0, `rgba(255,255,255,${Math.min(0.78, alpha * 1.2)})`);
          halo.addColorStop(0.18, `rgba(185,242,255,${alpha * 0.75})`);
          halo.addColorStop(0.48, `rgba(65,195,255,${alpha * 0.3})`);
          halo.addColorStop(1, "rgba(32,105,255,0)");
        } else {
          halo.addColorStop(0, `rgba(255,255,255,${Math.min(0.72, alpha * 1.12)})`);
          halo.addColorStop(0.18, `rgba(202,255,224,${alpha * 0.7})`);
          halo.addColorStop(0.52, `rgba(74,222,128,${alpha * 0.28})`);
          halo.addColorStop(1, "rgba(22,163,74,0)");
        }
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sx, sy, haloSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (cyanI > 0.01) {
        const c = Math.min(1, cyanI);
        ctx.fillStyle = `rgba(${Math.round(70 + c * 90)},${Math.round(190 + c * 52)},255,${alpha * (0.62 + c * 0.24)})`;
      } else if (greenI > 0.01 || meridianI > 0.01) {
        const g = Math.max(greenI, meridianI);
        ctx.fillStyle = `rgba(${Math.round(90 + g * 120)},${Math.round(225 + g * 28)},${Math.round(138 + g * 70)},${alpha * (0.58 + g * 0.22)})`;
      } else {
        ctx.fillStyle = `rgba(${Math.round(54 + depth * 75)},${Math.round(185 + depth * 46)},${Math.round(105 + band * 70)},${alpha * 0.46})`;
      }

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.42, drawSize * (0.88 + band * 0.22) * twinkle), 0, Math.PI * 2);
      ctx.fill();
    }

    function drawOrbit(rotX, rotY, normal, color, lineWidth, phaseOffset) {
      const [nx, ny, nz] = normal;
      const basisA = normalize(Math.abs(ny) < 0.95 ? [ny, -nx, 0] : [0, nz, -ny]);
      const basisB = [
        ny * basisA[2] - nz * basisA[1],
        nz * basisA[0] - nx * basisA[2],
        nx * basisA[1] - ny * basisA[0],
      ];
      const cY = Math.cos(rotY + phaseOffset);
      const sY = Math.sin(rotY + phaseOffset);
      const cX = Math.cos(rotX);
      const sX = Math.sin(rotX);

      for (let pass = 0; pass < 2; pass += 1) {
        ctx.beginPath();
        let pen = false;
        for (let step = 0; step <= 144; step += 1) {
          const t = (step / 144) * Math.PI * 2;
          const bx = basisA[0] * Math.cos(t) + basisB[0] * Math.sin(t);
          const by = basisA[1] * Math.cos(t) + basisB[1] * Math.sin(t);
          const bz = basisA[2] * Math.cos(t) + basisB[2] * Math.sin(t);
          const x1 = bx * cY + bz * sY;
          const z1 = -bx * sY + bz * cY;
          const y1 = by * cX - z1 * sX;
          const z2 = by * sX + z1 * cX;
          const front = z2 < 0;
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
        ctx.strokeStyle = pass === 1 ? color.front : color.back;
        ctx.lineWidth = pass === 1 ? lineWidth : lineWidth * 0.55;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    function draw() {
      const st = stateRef.current;
      st.tick += 1;
      st.energy = Math.max(0, st.energy - 0.013);

      if (!st.dragging) {
        st.velX += ((st.hoverY * -0.0008) - st.velX) * 0.025;
        st.velY += (0.0034 + st.hoverX * 0.0012 - st.velY) * 0.03;
      }

      st.rotX += st.velX;
      st.rotY += st.velY;
      st.rotX = Math.max(-0.55, Math.min(0.45, st.rotX));

      const pulse = 1 + Math.sin(st.tick * 0.018) * 0.012 + st.energy * 0.045;
      const r = radius * pulse;
      const cY = Math.cos(st.rotY);
      const sY = Math.sin(st.rotY);
      const cX = Math.cos(st.rotX);
      const sX = Math.sin(st.rotX);

      ctx.clearRect(0, 0, size, size);

      const atmosphere = ctx.createRadialGradient(cx - r * 0.24, cy - r * 0.18, r * 0.16, cx, cy, r * 1.55);
      atmosphere.addColorStop(0, `rgba(95,255,165,${0.16 + st.energy * 0.18})`);
      atmosphere.addColorStop(0.36, `rgba(24,210,118,${0.07 + st.energy * 0.06})`);
      atmosphere.addColorStop(0.66, "rgba(20,184,166,0.03)");
      atmosphere.addColorStop(1, "rgba(20,184,166,0)");
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.58, 0, Math.PI * 2);
      ctx.fill();

      drawOrbit(st.rotX, st.rotY, GREEN_BAND, {
        front: `rgba(117,255,161,${0.46 + st.energy * 0.28})`,
        back: "rgba(74,222,128,0.18)",
      }, 2.4 + st.energy * 1.4, 0);
      drawOrbit(st.rotX, st.rotY, MERIDIAN_BAND, {
        front: `rgba(181,255,209,${0.36 + st.energy * 0.24})`,
        back: "rgba(74,222,128,0.13)",
      }, 1.6 + st.energy, 0.36);

      for (let pass = 0; pass < 2; pass += 1) {
        const frontPass = pass === 1;
        for (let i = 0; i < maxDots; i += 1) {
          const x1 = DOTS.x[i] * cY + DOTS.z[i] * sY;
          const z1 = -DOTS.x[i] * sY + DOTS.z[i] * cY;
          const y1 = DOTS.y[i] * cX - z1 * sX;
          const z2 = DOTS.y[i] * sX + z1 * cX;
          const isFront = z2 < -0.025;
          if (frontPass !== isFront) continue;

          const scale = r * (1.46 / (2.08 + z2));
          const sx = cx + x1 * scale;
          const sy = cy - y1 * scale;
          const dist = Math.hypot(sx - cx, sy - cy);
          const edge = Math.pow(Math.max(0, 1 - dist / (r * 1.03)), 0.34);
          if (edge < 0.014) continue;

          const depth = (1 - z2) * 0.5;
          const band = Math.max(DOTS.cyan[i], DOTS.green[i], DOTS.meridian[i]);
          const twinkle = 0.72 + 0.28 * Math.sin(DOTS.phase[i] + st.tick * DOTS.speed[i]);
          const backBandBoost = !frontPass && band > 0.05 ? 0.42 : 0.13;
          const depthAlpha = frontPass ? 0.42 + depth * 0.92 : backBandBoost + depth * 0.16;
          const alpha = edge * depthAlpha * DOTS.brightness[i] * twinkle * (0.52 + st.energy * 0.32);
          if (alpha < 0.012) continue;

          const drawSize = DOTS.size[i] * (0.44 + depth * 0.86 + band * 0.16);
          drawParticle(sx, sy, depth, alpha, drawSize, DOTS.cyan[i], DOTS.green[i], DOTS.meridian[i], twinkle, DOTS.sparkle[i]);
        }
      }

      drawOrbit(st.rotX, st.rotY, CYAN_BAND, {
        front: `rgba(128,229,255,${0.68 + st.energy * 0.22})`,
        back: "rgba(56,189,248,0.28)",
      }, 3.2 + st.energy * 2, -0.1);

      if (st.energy > 0.02) {
        const ripple = r * (1.02 + (1 - st.energy) * 0.52);
        ctx.beginPath();
        ctx.arc(cx, cy, ripple, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(110,255,180,${st.energy * 0.58})`;
        ctx.lineWidth = 2 + st.energy * 3.5;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <div className="globe-viz-wrap">
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
          st.hoverX = 0;
          st.hoverY = 0;
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const st = stateRef.current;
          st.hoverX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          st.hoverY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
          if (!st.dragging) return;
          const dx = event.clientX - st.lastX;
          const dy = event.clientY - st.lastY;
          st.rotY += dx * 0.0075;
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
    </div>
  );
}
