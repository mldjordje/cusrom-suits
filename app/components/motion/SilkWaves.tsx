"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
};

export default function SilkWaves({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const lines = [
      { y: 0.3, amp: 25, freq: 0.002, speed: 0.015, color: "rgba(201, 169, 110, 0.08)" },
      { y: 0.45, amp: 40, freq: 0.0015, speed: 0.01, color: "rgba(242, 238, 231, 0.04)" },
      { y: 0.6, amp: 30, freq: 0.0025, speed: 0.018, color: "rgba(201, 169, 110, 0.06)" },
      { y: 0.75, amp: 50, freq: 0.001, speed: 0.008, color: "rgba(201, 169, 110, 0.03)" },
    ];

    let t = 0;
    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      lines.forEach((line) => {
        ctx.beginPath();
        const base = height * line.y;
        ctx.moveTo(0, base);

        for (let x = 0; x <= width; x += 10) {
          const wave =
            Math.sin(x * line.freq + t * line.speed) * line.amp +
            Math.cos(x * line.freq * 0.5 + t * line.speed * 0.8) * (line.amp * 0.4);
          ctx.lineTo(x, base + wave);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = line.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`position-absolute inset-0 w-100 h-100 pointer-events-none ${className}`}
      style={{ zIndex: 1, opacity: 0.9 }}
    />
  );
}
