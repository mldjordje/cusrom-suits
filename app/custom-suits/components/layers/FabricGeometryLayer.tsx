"use client";

import React, { useEffect, useRef } from "react";

/**
 * Geometry-aware fabric engine (the real Hockerty-style path).
 *
 * Instead of tiling a flat swatch in screen space, it samples the fabric through a
 * pre-baked UV map so the pattern follows the garment cut (wraps the body, the lapel,
 * the legs), then lights it with a baked normal map and darkens creases with an AO map:
 *
 *     color = fabric( UV ) * ( ambient + lambert(normal, light) ) * AO
 *
 * The UV / normal / AO maps are produced once per garment STYLE (procedural cylinder
 * unwrap, or CAD bake) and are fabric-independent — any of the 40+ swatches is sampled
 * through the same maps, so adding a fabric is a swatch upload with zero 3D work.
 *
 * The fabric swatch is uploaded as a power-of-two texture with mipmaps + REPEAT wrap, so
 * minified tiling stays smooth (no aliasing/"static" the naive CSS tile produced).
 *
 * Reports via onStatus; renders nothing on WebGL/texture failure so the caller can fall
 * back to the legacy CSS path.
 */

export type FabricGeometryStatus = "idle" | "ready" | "failed";

type Props = {
  fabricTextureUrl?: string | null;
  uvUrl?: string | null;
  normalUrl?: string | null;
  aoUrl?: string | null;
  maskUrl?: string | null;
  /** Optional base render/photo luminance map. Preserves real seams, folds and pocket detail. */
  shadeUrl?: string | null;
  shadeUrls?: string[];
  canvas: { w: number; h: number };
  /** Fabric tile repeats across the unwrapped garment width (pattern scale). */
  repeat?: number;
  /** Vertical repeat multiplier relative to horizontal (keeps swatch un-stretched). */
  aspect?: number;
  /** Directional light for the normal-map shading. */
  lightDir?: [number, number, number];
  ambient?: number;
  diffuse?: number;
  /** Local texture contrast: higher for chalk/seersucker stripes, lower for solids. */
  clothContrast?: number;
  /** Micro relief derived from fabric luminance, used as woven surface shading. */
  weaveStrength?: number;
  /** Small view-space sheen on raised normals, keeps solids from looking flat. */
  sheen?: number;
  fabricBrightness?: number;
  /** How strongly the base photo luminance drives garment depth. */
  photoShading?: number;
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
  onStatus?: (s: FabricGeometryStatus) => void;
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = vec2(aPos.x*0.5+0.5, 1.0-(aPos.y*0.5+0.5)); gl_Position = vec4(aPos,0.0,1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFabric;
uniform sampler2D uUV;
uniform sampler2D uNormal;
uniform sampler2D uAO;
uniform sampler2D uMask;
uniform sampler2D uShade;
uniform vec2 uRepeat;
uniform vec3 uLightDir;
uniform float uAmbient;
uniform float uDiffuse;
uniform float uClothContrast;
uniform float uWeaveStrength;
uniform float uSheen;
uniform float uFabricBrightness;
uniform float uPhotoShading;
uniform float uOpacity;
float luma(vec3 c){ return 0.2126*c.r+0.7152*c.g+0.0722*c.b; }
void main(){
  vec4 mk = texture2D(uMask, vUv);
  // Works for both an alpha mask (white rgb, silhouette in alpha) and a grayscale mask
  // (silhouette in luminance, alpha=1): the product equals the silhouette either way.
  float m = mk.a * luma(mk.rgb);
  if (m < 0.004) discard;
  vec2 uv = texture2D(uUV, vUv).rg;
  vec2 fuv = uv * uRepeat;
  vec2 texel = vec2(1.0 / 512.0);
  vec3 fabCenter = texture2D(uFabric, fuv).rgb;
  vec3 fabX1 = texture2D(uFabric, fuv + vec2(texel.x * 1.25, 0.0)).rgb;
  vec3 fabX2 = texture2D(uFabric, fuv - vec2(texel.x * 1.25, 0.0)).rgb;
  vec3 fabY1 = texture2D(uFabric, fuv + vec2(0.0, texel.y * 1.25)).rgb;
  vec3 fabY2 = texture2D(uFabric, fuv - vec2(0.0, texel.y * 1.25)).rgb;
  float lumX = luma(fabX1) - luma(fabX2);
  float lumY = luma(fabY1) - luma(fabY2);
  float fabricEdge = smoothstep(0.12, 0.34, abs(lumX) + abs(lumY) * 0.55);
  vec3 fabSmooth = (fabCenter + fabX1 + fabX2 + fabY1 + fabY2) * 0.2;
  vec3 fab = mix(fabSmooth, fabCenter, fabricEdge);
  float fabricLum = luma(fab);
  vec3 weaveNormal = normalize(vec3(-lumX * uWeaveStrength, -lumY * uWeaveStrength, 1.0));
  vec3 n = normalize(texture2D(uNormal, vUv).rgb * 2.0 - 1.0);
  n = normalize(n + weaveNormal * 0.18);
  float lam = clamp(dot(n, normalize(uLightDir)), 0.0, 1.0);
  float rim = pow(clamp(n.z, 0.0, 1.0), 10.0) * uSheen;
  float weaveShade = clamp(1.0 + (fabricLum - 0.5) * 0.22 * uWeaveStrength, 0.74, 1.24);
  float ao = texture2D(uAO, vUv).r;
  float proceduralShade = (uAmbient + lam * uDiffuse + rim) * weaveShade * ao;
  vec4 shadeSample = texture2D(uShade, vUv);
  float shadeAlpha = smoothstep(0.04, 0.24, shadeSample.a);
  float photoLum = mix(0.56, luma(shadeSample.rgb), shadeAlpha);
  float photoDetail = clamp(0.96 + (photoLum - 0.56) * 0.58, 0.72, 1.26);
  float photoShade = photoDetail * (0.9 + lam * 0.16) * weaveShade;
  float shade = mix(proceduralShade, photoShade, uPhotoShading * shadeAlpha);
  fab = clamp(((fab - 0.5) * uClothContrast + 0.5) * uFabricBrightness, 0.0, 1.0);
  vec3 col = fab * shade;
  gl_FragColor = vec4(col, m * uOpacity);
}
`;

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile: ${log}`);
  }
  return sh;
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`load failed: ${url}`));
    img.src = url;
  });

/** Map texture: CLAMP, LINEAR, no mipmap (data maps must not wrap/blur across edges). */
const dataTexture = (gl: WebGLRenderingContext, img: TexImageSource) => {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  return t;
};

const solidTexture = (gl: WebGLRenderingContext, r = 142, g = 142, b = 142, a = 255) => {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([r, g, b, a])
  );
  return t;
};

/** Fabric: redraw to power-of-two so mipmaps + REPEAT work -> smooth minified tiling.
 *  Center-crops the swatch to a square first so a non-square swatch isn't stretched
 *  (stretching skews stripe spacing / check aspect). */
const fabricTexture = (gl: WebGLRenderingContext, img: HTMLImageElement, size = 512) => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const side = Math.min(iw, ih);
  const sx = Math.max(0, (iw - side) / 2);
  const sy = Math.max(0, (ih - side) / 2);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  // Make the tile seamless: roll by half (so the photo's hard edges move to the centre
  // and the tile's OUTER edges meet continuously under REPEAT), then feather-heal the
  // resulting centre cross with the original. Kills the repeating-seam grid.
  const src = ctx.getImageData(0, 0, size, size).data;
  const dst = ctx.createImageData(size, size);
  const d = dst.data;
  const half = size >> 1;
  const feather = 0.18;
  for (let y = 0; y < size; y++) {
    const fy = Math.max(0, 1 - Math.abs(y - size / 2) / (size * feather));
    const ry = (y + half) % size;
    for (let x = 0; x < size; x++) {
      const fx = Math.max(0, 1 - Math.abs(x - size / 2) / (size * feather));
      const cross = Math.max(fx, fy); // 1 at centre cross -> use original; 0 at edges -> rolled
      const rx = (x + half) % size;
      const oi = (y * size + x) * 4;
      const ri = (ry * size + rx) * 4;
      for (let k = 0; k < 4; k++) {
        d[oi + k] = src[ri + k] * (1 - cross) + src[oi + k] * cross;
      }
    }
  }
  ctx.putImageData(dst, 0, 0);
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  return t;
};

const FabricGeometryLayerComponent: React.FC<Props> = ({
  fabricTextureUrl,
  uvUrl,
  normalUrl,
  aoUrl,
  maskUrl,
  shadeUrl,
  shadeUrls,
  canvas,
  repeat = 10,
  aspect = 1.0,
  lightDir = [-0.35, -0.3, 0.88],
  ambient = 0.55,
  diffuse = 0.62,
  clothContrast = 1.08,
  weaveStrength = 0.8,
  sheen = 0.05,
  fabricBrightness = 1,
  photoShading = 0.82,
  opacity = 1,
  className,
  style,
  onStatus,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = canvasRef.current;
    if (!el || !fabricTextureUrl || !uvUrl || !normalUrl || !aoUrl || !maskUrl) return;

    const report = (s: FabricGeometryStatus) => {
      if (!cancelled) onStatus?.(s);
    };

    const gl = el.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: true });
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

    (async () => {
      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(`link: ${gl.getProgramInfoLog(program)}`);
        }

        const resolvedShadeUrls = shadeUrls?.length ? shadeUrls : shadeUrl ? [shadeUrl] : [];
        const [fabImg, uvImg, nImg, aoImg, maskImg, shadeImgs] = await Promise.all([
          loadImage(fabricTextureUrl),
          loadImage(uvUrl),
          loadImage(normalUrl),
          loadImage(aoUrl),
          loadImage(maskUrl),
          Promise.all(resolvedShadeUrls.map((url) => loadImage(url).catch(() => null))),
        ]);
        if (cancelled) return;

        const fabTex = fabricTexture(gl, fabImg);
        const uvTex = dataTexture(gl, uvImg);
        const nTex = dataTexture(gl, nImg);
        const aoTex = dataTexture(gl, aoImg);
        const maskTex = dataTexture(gl, maskImg);
        const validShadeImgs = shadeImgs.filter(Boolean) as HTMLImageElement[];
        let shadeTex: WebGLTexture;
        if (validShadeImgs.length) {
          const shadeCanvas = document.createElement("canvas");
          shadeCanvas.width = canvas.w;
          shadeCanvas.height = canvas.h;
          const shadeCtx = shadeCanvas.getContext("2d")!;
          shadeCtx.clearRect(0, 0, canvas.w, canvas.h);
          for (const img of validShadeImgs) {
            shadeCtx.drawImage(img, 0, 0, canvas.w, canvas.h);
          }
          shadeTex = dataTexture(gl, shadeCanvas);
        } else {
          shadeTex = solidTexture(gl);
        }
        textures.push(fabTex, uvTex, nTex, aoTex, maskTex, shadeTex);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        gl.useProgram(program);
        const aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const u = (n: string) => gl.getUniformLocation(program!, n);
        const bind = (unit: number, tex: WebGLTexture, name: string) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(u(name), unit);
        };
        bind(0, fabTex, "uFabric");
        bind(1, uvTex, "uUV");
        bind(2, nTex, "uNormal");
        bind(3, aoTex, "uAO");
        bind(4, maskTex, "uMask");
        bind(5, shadeTex, "uShade");
        gl.uniform2f(u("uRepeat"), repeat, repeat * aspect);
        gl.uniform3f(u("uLightDir"), lightDir[0], lightDir[1], lightDir[2]);
        gl.uniform1f(u("uAmbient"), ambient);
        gl.uniform1f(u("uDiffuse"), diffuse);
        gl.uniform1f(u("uClothContrast"), clothContrast);
        gl.uniform1f(u("uWeaveStrength"), weaveStrength);
        gl.uniform1f(u("uSheen"), sheen);
        gl.uniform1f(u("uFabricBrightness"), fabricBrightness);
        gl.uniform1f(u("uPhotoShading"), validShadeImgs.length ? photoShading : 0);
        gl.uniform1f(u("uOpacity"), opacity);

        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        report("ready");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[FabricGeometryLayer]", err);
        }
        report("failed");
      }
    })();

    return () => {
      cancelled = true;
      textures.forEach((t) => gl.deleteTexture(t));
      if (program) gl.deleteProgram(program);
    };
  }, [
    fabricTextureUrl,
    uvUrl,
    normalUrl,
    aoUrl,
    maskUrl,
    shadeUrl,
    shadeUrls,
    canvas.w,
    canvas.h,
    repeat,
    aspect,
    lightDir,
    ambient,
    diffuse,
    clothContrast,
    weaveStrength,
    sheen,
    fabricBrightness,
    photoShading,
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

export const FabricGeometryLayer = React.memo(FabricGeometryLayerComponent);
