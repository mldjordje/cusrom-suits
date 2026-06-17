"use client";

import React, { useEffect, useRef } from "react";

/**
 * WebGL fabric warp layer (Path A — displacement-from-base-photo).
 *
 * The screen-space tiling approach draws a flat, dead-vertical stripe and fakes the
 * lapel with rigid per-zone rotation, which leaves a hard seam and never drapes. This
 * layer instead samples the real fabric tile through a displacement field derived from
 * the garment's own grayscale base photo: the photo's luminance gradient approximates
 * the cloth surface slope, so the stripe bends continuously around folds, the lapel
 * roll, the chest curve and the sleeves — then we multiply the garment shading back in
 * for depth. Composite is `warped_fabric × shading`, masked to the silhouette, which is
 * the same model Hockerty-class configurators use.
 *
 * Renders nothing (and reports via onStatus) if WebGL is unavailable or a texture fails
 * to load, so the caller can fall back to the CSS tiling path.
 */

export type FabricWarpStatus = "idle" | "ready" | "failed";

type Props = {
  fabricTextureUrl?: string | null;
  /** Grayscale garment base photo — supplies both shading and the displacement field. */
  displacementUrl?: string | null;
  /** Silhouette mask (PNG); alpha (or luminance) gates the output. */
  maskUrl?: string | null;
  /** Tile period in CSS px (matches FabricUnion textureTileSizePx). */
  tileSizePx: number;
  /** panZoom.scale * textureScale — same effective scale as the CSS tile. */
  scale: number;
  /** Pan offset in CSS px. */
  offset: { x: number; y: number };
  /** Element pixel box (drawing buffer is sized to this * dpr). */
  canvas: { w: number; h: number };
  /** Displacement gain (px of stripe shift per unit luma slope). */
  dispStrength?: number;
  /** Neutral shading luminance — base-photo luma that maps to no darkening. */
  shadeMid?: number;
  /** Output alpha multiplier. */
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
  onStatus?: (status: FabricWarpStatus) => void;
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 1.0 - (aPos.y * 0.5 + 0.5));
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFabric;
uniform sampler2D uDisp;
uniform sampler2D uMask;
uniform vec2 uCanvas;
uniform vec2 uOffset;
uniform float uTileSize;
uniform float uScale;
uniform float uDispStrength;
uniform float uShadeMid;
uniform float uOpacity;
uniform vec2 uGradStep;

float luma(vec3 c) { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

void main() {
  vec4 maskTex = texture2D(uMask, vUv);
  // PNG masks may carry the silhouette in alpha or in luminance — take whichever exists.
  float m = maskTex.a > 0.001 ? maskTex.a : luma(maskTex.rgb);
  if (m < 0.004) discard;

  // Low-frequency slope from the base photo (wide gradient step = drape, not weave).
  float lC = luma(texture2D(uDisp, vUv).rgb);
  float lX = luma(texture2D(uDisp, vUv + vec2(uGradStep.x, 0.0)).rgb);
  float lY = luma(texture2D(uDisp, vUv + vec2(0.0, uGradStep.y)).rgb);
  vec2 grad = vec2(lX - lC, lY - lC);

  float period = max(uTileSize * uScale, 1.0);
  vec2 fabPx = vUv * uCanvas + uOffset + grad * uDispStrength;
  vec2 fabUv = fract(fabPx / period);
  vec3 fab = texture2D(uFabric, fabUv).rgb;

  // Multiply garment shading back in: base-photo luma normalised around uShadeMid so a
  // mid-lit region is neutral, folds darken, ridges lift — gives the cloth its depth.
  float shade = clamp(lC / max(uShadeMid, 0.04), 0.35, 1.55);
  vec3 col = fab * shade;

  gl_FragColor = vec4(col, m * uOpacity);
}
`;

const loadTexture = (
  gl: WebGLRenderingContext,
  url: string,
): Promise<WebGLTexture> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const tex = gl.createTexture();
        if (!tex) throw new Error("createTexture failed");
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        resolve(tex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
};

const FabricWarpLayerComponent: React.FC<Props> = ({
  fabricTextureUrl,
  displacementUrl,
  maskUrl,
  tileSizePx,
  scale,
  offset,
  canvas,
  dispStrength = 320,
  shadeMid = 0.62,
  opacity = 1,
  className,
  style,
  onStatus,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<FabricWarpStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    const el = canvasRef.current;
    if (!el || !fabricTextureUrl || !displacementUrl || !maskUrl) return;

    const report = (s: FabricWarpStatus) => {
      if (cancelled) return;
      statusRef.current = s;
      onStatus?.(s);
    };

    const gl = el.getContext("webgl", {
      premultipliedAlpha: false,
      alpha: true,
      antialias: true,
    });
    if (!gl) {
      report("failed");
      return;
    }

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const W = Math.max(1, Math.round(canvas.w * dpr));
    const H = Math.max(1, Math.round(canvas.h * dpr));
    el.width = W;
    el.height = H;

    let program: WebGLProgram | null = null;
    const textures: WebGLTexture[] = [];

    const run = async () => {
      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        program = gl.createProgram();
        if (!program) throw new Error("createProgram failed");
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(`link failed: ${gl.getProgramInfoLog(program)}`);
        }

        const [fabricTex, dispTex, maskTex] = await Promise.all([
          loadTexture(gl, fabricTextureUrl),
          loadTexture(gl, displacementUrl),
          loadTexture(gl, maskUrl),
        ]);
        textures.push(fabricTex, dispTex, maskTex);
        if (cancelled) return;

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );

        gl.useProgram(program);
        const aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uni = (name: string) => gl.getUniformLocation(program!, name);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fabricTex);
        gl.uniform1i(uni("uFabric"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, dispTex);
        gl.uniform1i(uni("uDisp"), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, maskTex);
        gl.uniform1i(uni("uMask"), 2);

        gl.uniform2f(uni("uCanvas"), canvas.w, canvas.h);
        gl.uniform2f(uni("uOffset"), offset.x, offset.y);
        gl.uniform1f(uni("uTileSize"), tileSizePx);
        gl.uniform1f(uni("uScale"), scale);
        gl.uniform1f(uni("uDispStrength"), dispStrength);
        gl.uniform1f(uni("uShadeMid"), shadeMid);
        gl.uniform1f(uni("uOpacity"), opacity);
        // Wide gradient step (in UV) so we read drape, not weave noise. ~3 CSS px.
        gl.uniform2f(uni("uGradStep"), 3 / Math.max(canvas.w, 1), 3 / Math.max(canvas.h, 1));

        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        report("ready");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[FabricWarpLayer]", err);
        }
        report("failed");
      }
    };

    void run();

    return () => {
      cancelled = true;
      textures.forEach((t) => gl.deleteTexture(t));
      if (program) gl.deleteProgram(program);
    };
  }, [
    fabricTextureUrl,
    displacementUrl,
    maskUrl,
    tileSizePx,
    scale,
    offset.x,
    offset.y,
    canvas.w,
    canvas.h,
    dispStrength,
    shadeMid,
    opacity,
    onStatus,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "absolute inset-0 h-full w-full"}
      style={{ pointerEvents: "none", ...style }}
    />
  );
};

export const FabricWarpLayer = React.memo(FabricWarpLayerComponent);
