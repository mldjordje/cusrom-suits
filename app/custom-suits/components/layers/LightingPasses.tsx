"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  mask?: string | null;
  canvas: { w: number; h: number };
  intensity?: number;
  shadow?: number;
  specular?: number;
  opacity?: number;
};

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const LightingPasses: React.FC<Props> = ({
  mask,
  canvas,
  intensity = 1,
  shadow = 1,
  specular = 0,
  opacity = 0.45,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvas;
    if (el.width !== w) el.width = w;
    if (el.height !== h) el.height = h;
    ctx.clearRect(0, 0, w, h);

    if (!mask) return;

    let cancelled = false;
    const maskImg = new Image();
    maskImg.crossOrigin = "anonymous";
    maskImg.onload = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, w, h);

      const drawFull = (operation: GlobalCompositeOperation, fill: CanvasGradient) => {
        ctx.save();
        ctx.globalCompositeOperation = operation;
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      };

      const drawRect = (
        operation: GlobalCompositeOperation,
        fill: CanvasGradient,
        rect: { x: number; y: number; w: number; h: number }
      ) => {
        ctx.save();
        ctx.globalCompositeOperation = operation;
        ctx.fillStyle = fill;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
      };

      // Directional light (top-left to bottom-right).
      const dirLight = ctx.createLinearGradient(0, 0, w, h);
      dirLight.addColorStop(0, `rgba(255,255,255,${0.05 * intensity})`);
      dirLight.addColorStop(0.45, `rgba(255,255,255,${0.02 * intensity})`);
      dirLight.addColorStop(1, "rgba(255,255,255,0)");
      drawFull("screen", dirLight);

      const dirShadow = ctx.createLinearGradient(0, 0, w, h);
      dirShadow.addColorStop(0, "rgba(0,0,0,0)");
      dirShadow.addColorStop(0.65, `rgba(0,0,0,${0.03 * shadow})`);
      dirShadow.addColorStop(1, `rgba(0,0,0,${0.06 * shadow})`);
      drawFull("multiply", dirShadow);

      // Chest depth.
      const chestX = w * 0.5;
      const chestY = h * 0.48;
      const chestRadius = Math.min(w * 0.42, h * 0.42);
      const chest = ctx.createRadialGradient(chestX, chestY, w * 0.05, chestX, chestY, chestRadius);
      chest.addColorStop(0, `rgba(255,255,255,${0.045 * intensity})`);
      chest.addColorStop(0.55, `rgba(255,255,255,${0.02 * intensity})`);
      chest.addColorStop(1, "rgba(255,255,255,0)");
      drawFull("screen", chest);

      // Lapel plane separation.
      const lapelWidth = w * 0.28;
      const lapelHeight = h * 0.22;
      const lapelY = h * 0.27;
      const lapelOffset = w * 0.16;
      const lapelAngle = degToRad(28);
      const drawLapel = (cx: number, angle: number, alpha: number) => {
        ctx.save();
        ctx.translate(cx, lapelY);
        ctx.rotate(angle);
        const grad = ctx.createLinearGradient(-lapelWidth / 2, 0, lapelWidth / 2, 0);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.4})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.fillRect(-lapelWidth / 2, -lapelHeight / 2, lapelWidth, lapelHeight);
        ctx.restore();
      };
      drawLapel(w * 0.5 - lapelOffset, -lapelAngle, 0.035 * intensity);
      drawLapel(w * 0.5 + lapelOffset, lapelAngle, 0.03 * intensity);

      // Sleeve cylindrical shading.
      const sleeveWidth = w * 0.26;
      const sleeveHeight = h * 0.38;
      const sleeveY = h * 0.56;
      const sleeveXLeft = w * 0.2;
      const sleeveXRight = w * 0.8;

      const drawSleeve = (cx: number, flip: boolean) => {
        const rect = {
          x: cx - sleeveWidth / 2,
          y: sleeveY - sleeveHeight / 2,
          w: sleeveWidth,
          h: sleeveHeight,
        };
        const highlight = ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
        const highlightAlpha = 0.04 * intensity;
        if (flip) {
          highlight.addColorStop(0, "rgba(255,255,255,0)");
          highlight.addColorStop(0.55, `rgba(255,255,255,${highlightAlpha * 0.4})`);
          highlight.addColorStop(1, `rgba(255,255,255,${highlightAlpha})`);
        } else {
          highlight.addColorStop(0, `rgba(255,255,255,${highlightAlpha})`);
          highlight.addColorStop(0.45, `rgba(255,255,255,${highlightAlpha * 0.4})`);
          highlight.addColorStop(1, "rgba(255,255,255,0)");
        }
        drawRect("screen", highlight, rect);

        const shadowGrad = ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
        const shadowAlpha = 0.04 * shadow;
        if (flip) {
          shadowGrad.addColorStop(0, `rgba(0,0,0,${shadowAlpha})`);
          shadowGrad.addColorStop(0.6, `rgba(0,0,0,${shadowAlpha * 0.5})`);
          shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
          shadowGrad.addColorStop(0.4, `rgba(0,0,0,${shadowAlpha * 0.5})`);
          shadowGrad.addColorStop(1, `rgba(0,0,0,${shadowAlpha})`);
        }
        drawRect("multiply", shadowGrad, rect);
      };

      drawSleeve(sleeveXLeft, false);
      drawSleeve(sleeveXRight, true);

      // Soft specular rolloff for low-luminance fabrics.
      if (specular > 0) {
        const spec = ctx.createLinearGradient(w * 0.18, h * 0.18, w * 0.62, h * 0.45);
        spec.addColorStop(0, `rgba(255,255,255,${specular})`);
        spec.addColorStop(0.5, `rgba(255,255,255,${specular * 0.35})`);
        spec.addColorStop(1, "rgba(255,255,255,0)");
        drawFull("screen", spec);
      }

      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskImg, 0, 0, w, h);
    };
    maskImg.onerror = () => {
      if (!cancelled) ctx.clearRect(0, 0, w, h);
    };
    maskImg.src = mask;

    return () => {
      cancelled = true;
    };
  }, [mask, canvas.h, canvas.w, intensity, shadow, specular]);

  if (!mask) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvas.w}
      height={canvas.h}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", mixBlendMode: "soft-light", opacity }}
    />
  );
};
