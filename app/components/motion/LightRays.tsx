"use client";

import { useEffect, useRef } from "react";

type Props = {
  color?: string;
  count?: number;
  className?: string;
};

export default function LightRays({
  color = "rgba(201, 169, 110, 0.15)",
  count = 5,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const rays = Array.from({ length: count }, (_, i) => ({
      angle: ((i * 180) / count) * (Math.PI / 180),
      speed: 0.0008 + Math.random() * 0.0006,
      width: 0.15 + Math.random() * 0.2,
      opacity: 0.2 + Math.random() * 0.3,
    }));

    let time = 0;
    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.2;

      rays.forEach((ray) => {
        const currentAngle = ray.angle + Math.sin(time * ray.speed) * 0.2;
        const length = Math.max(width, height) * 1.5;

        const endX1 = centerX + Math.cos(currentAngle - ray.width) * length;
        const endY1 = centerY + Math.sin(currentAngle - ray.width) * length;
        const endX2 = centerX + Math.cos(currentAngle + ray.width) * length;
        const endY2 = centerY + Math.sin(currentAngle + ray.width) * length;

        const grad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          length * 0.8,
        );
        grad.addColorStop(0, color);
        grad.addColorStop(0.4, `rgba(201, 169, 110, ${ray.opacity * 0.5})`);
        grad.addColorStop(1, "rgba(8, 7, 6, 0)");

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX1, endY1);
        ctx.lineTo(endX2, endY2);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, count]);

  return (
    <canvas
      ref={canvasRef}
      className={`position-absolute inset-0 w-100 h-100 pointer-events-none ${className}`}
      style={{ zIndex: 2, opacity: 0.8 }}
    />
  );
}
