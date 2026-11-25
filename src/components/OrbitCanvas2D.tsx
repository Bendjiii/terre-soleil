import { useEffect, useRef } from "react";
import {
  DEG,
  OBLIQUITY,
  PI,
  getDateLabel,
  getOrbitalAngle,
  DAY_SPRING_EQUINOX,
  DAY_SUMMER_SOLSTICE,
  DAY_AUTUMN_EQUINOX,
  DAY_WINTER_SOLSTICE,
} from "../astronomy";

interface OrbitCanvas2DProps {
  day: number;
}

export function OrbitCanvas2D({ day }: OrbitCanvas2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Fond spatial profond (aligné sur la palette du globe 3D)
      ctx.fillStyle = "#081226";
      ctx.fillRect(0, 0, w, h);

      // Subtiles étoiles de fond déterministes
      ctx.fillStyle = "rgba(226, 232, 240, 0.38)";
      for (let i = 0; i < 48; i++) {
        const sx = ((i * 197 + 43) % 997) / 997 * w;
        const sy = ((i * 313 + 71) % 991) / 991 * h;
        const sr = (i % 3 === 0) ? 1.2 : 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, 2 * PI);
        ctx.fill();
      }

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w * 0.285, h * 0.33);

      // Quadrillage discret des axes équinoxes / solstices
      ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - radius - 14, cy);
      ctx.lineTo(cx + radius + 14, cy);
      ctx.moveTo(cx, cy - radius - 14);
      ctx.lineTo(cx, cy + radius + 14);
      ctx.stroke();

      // Orbite terrestre (cercle en pointillés)
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * PI);
      ctx.strokeStyle = "rgba(226, 232, 240, 0.72)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flèches discrètes indiquant le sens de révolution (sens horaire sur ce schéma : Printemps -> Été -> Automne -> Hiver)
      const arrowAngles = [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4];
      ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";
      ctx.lineWidth = 1.6;
      for (const a of arrowAngles) {
        const ax = cx + radius * Math.sin(a);
        const ay = cy - radius * Math.cos(a);
        // Tangente dans le sens de révolution croissante
        const txDir = Math.cos(a);
        const tyDir = Math.sin(a);
        const normX = -tyDir;
        const normY = txDir;
        ctx.beginPath();
        ctx.moveTo(ax - txDir * 5 + normX * 4.5, ay - tyDir * 5 + normY * 4.5);
        ctx.lineTo(ax + txDir * 4, ay + tyDir * 4);
        ctx.lineTo(ax - txDir * 5 - normX * 4.5, ay - tyDir * 5 - normY * 4.5);
        ctx.stroke();
      }

      // ---- SOLEIL AU CENTRE ----
      const sunCorona = ctx.createRadialGradient(cx, cy, 6, cx, cy, 44);
      sunCorona.addColorStop(0, "rgba(254, 240, 138, 0.95)");
      sunCorona.addColorStop(0.35, "rgba(251, 191, 36, 0.45)");
      sunCorona.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 44, 0, 2 * PI);
      ctx.fillStyle = sunCorona;
      ctx.fill();

      const sunCore = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 20);
      sunCore.addColorStop(0, "#fffbeb");
      sunCore.addColorStop(0.55, "#fbbf24");
      sunCore.addColorStop(1, "#ea580c");
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, 2 * PI);
      ctx.fillStyle = sunCore;
      ctx.fill();

      ctx.fillStyle = "#fde68a";
      ctx.font = '600 12px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("SOLEIL", cx, cy + 26);

      // ---- REPÈRES DES 4 SAISONS (Équinoxes & Solstices) ----
      const points = [
        {
          x: cx,
          y: cy - radius,
          label: "Printemps",
          sub: "21 mars (Équinoxe)",
          align: "center" as CanvasTextAlign,
          dx: 0,
          dy: -34,
          active: Math.abs(day - DAY_SPRING_EQUINOX) <= 3,
        },
        {
          x: cx + radius,
          y: cy,
          label: "Été",
          sub: "21 juin (Solstice)",
          align: "left" as CanvasTextAlign,
          dx: 14,
          dy: -14,
          active: Math.abs(day - DAY_SUMMER_SOLSTICE) <= 3,
        },
        {
          x: cx,
          y: cy + radius,
          label: "Automne",
          sub: "23 sept. (Équinoxe)",
          align: "center" as CanvasTextAlign,
          dx: 0,
          dy: 16,
          active: Math.abs(day - DAY_AUTUMN_EQUINOX) <= 3,
        },
        {
          x: cx - radius,
          y: cy,
          label: "Hiver",
          sub: "21 déc. (Solstice)",
          align: "right" as CanvasTextAlign,
          dx: -14,
          dy: -14,
          active: Math.abs(day - DAY_WINTER_SOLSTICE) <= 3,
        },
      ];

      for (const pt of points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.active ? 5 : 3.5, 0, 2 * PI);
        ctx.fillStyle = pt.active ? "#fbbf24" : "#94a3b8";
        ctx.fill();

        ctx.textAlign = pt.align;
        ctx.textBaseline = "top";
        ctx.font = '700 13px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillStyle = pt.active ? "#fde68a" : "#f1f5f9";
        ctx.fillText(pt.label, pt.x + pt.dx, pt.y + pt.dy);

        ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillStyle = pt.active ? "#fcd34d" : "#94a3b8";
        ctx.fillText(pt.sub, pt.x + pt.dx, pt.y + pt.dy + 15);
      }

      // ---- POSITION DE LA TERRE ----
      const angle = getOrbitalAngle(day);
      const tx = cx + radius * Math.sin(angle);
      const ty = cy - radius * Math.cos(angle);

      // Rayon Soleil -> Terre
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = "rgba(253, 224, 71, 0.72)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // ---- TERRE AVEC MOITIÉ JOUR / NUIT ORIENTÉE VERS LE SOLEIL ----
      const earthR = 14;
      // Angle du Soleil vu depuis la Terre sur le canevas 2D
      const sunAngleFromEarth = Math.atan2(cy - ty, cx - tx);

      // Base nocturne très sombre
      ctx.beginPath();
      ctx.arc(tx, ty, earthR, 0, 2 * PI);
      ctx.fillStyle = "#060e24";
      ctx.fill();

      // Demi-disque éclairé face au Soleil
      ctx.beginPath();
      ctx.arc(
        tx,
        ty,
        earthR,
        sunAngleFromEarth - PI / 2,
        sunAngleFromEarth + PI / 2
      );
      ctx.closePath();
      ctx.fillStyle = "#3898ec";
      ctx.fill();

      // Touche verte continentale sur la face éclairée pour un repère visuel clair
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, earthR, 0, 2 * PI);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(
        tx + Math.cos(sunAngleFromEarth) * 4,
        ty + Math.sin(sunAngleFromEarth) * 4 - 2,
        6,
        0,
        2 * PI
      );
      ctx.fillStyle = "rgba(74, 173, 94, 0.55)";
      ctx.fill();
      ctx.restore();

      // Contour atmosphérique
      ctx.beginPath();
      ctx.arc(tx, ty, earthR, 0, 2 * PI);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ---- AXE DE ROTATION TERRESTRE INCLINÉ À 23,44° (TOUJOURS PARALLÈLE À LUI-MÊME) ----
      const tilt = OBLIQUITY * DEG;
      const dx = -Math.sin(tilt);
      const dy = -Math.cos(tilt);

      ctx.beginPath();
      ctx.moveTo(tx - dx * 27, ty - dy * 27);
      ctx.lineTo(tx + dx * 27, ty + dy * 27);
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.stroke();

      // Repère Pôle Nord (N)
      ctx.fillStyle = "#fca5a5";
      ctx.font = '700 11px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", tx + dx * 34, ty + dy * 34);

      // ---- ÉTIQUETTE DATE & TERRE ----
      // Placer la date légèrement vers l'intérieur ou à l'écart des étiquettes de saison
      const radialOutX = Math.sin(angle);
      const radialOutY = -Math.cos(angle);
      const labelDist = 34;
      const lx = tx - radialOutX * labelDist;
      const ly = ty - radialOutY * labelDist;

      const dateStr = getDateLabel(day);
      ctx.font = '600 12px "Plus Jakarta Sans", Arial, sans-serif';
      const padX = 7;
      const boxW = ctx.measureText(dateStr).width + padX * 2;
      const boxH = 20;

      ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lx - boxW / 2, ly - boxH / 2, boxW, boxH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde68a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dateStr, lx, ly + 0.5);

      ctx.restore();
    };

    draw();

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [day]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden bg-[#081226]"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label="Schéma de la révolution de la Terre autour du Soleil sur 365 jours"
      />
    </div>
  );
}
