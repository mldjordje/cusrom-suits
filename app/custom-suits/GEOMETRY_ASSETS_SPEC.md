# Custom-Suits Geometry Assets — Production Spec

Goal: Hockerty-grade preview. Fabric pattern (stripe/check/solid) must follow the
garment geometry — bend over the lapel roll, wrap the sleeves, taper down the legs —
identically for **every** fabric, fully digital.

The trick: geometry is authored **once per garment style** (3D garment-CAD), baked to 2D
maps. At runtime the engine samples any fabric through those maps. Adding a new fabric =
upload one swatch, **zero** 3D work. Only a brand-new garment type (e.g. coat) needs a
new map set.

---

## Per garment STYLE + VIEW, per PIECE — deliver these maps

Pieces: `jacket_body`, `jacket_sleeves`, `pants` (lapel handled as overlay, see below).

| Map | Channels | Encoding | Purpose |
|---|---|---|---|
| `<piece>.uv.png` | R, G | **linear** (no sRGB), 16-bit preferred | Per-pixel fabric coordinate (u,v ∈ 0..1 in flat-fabric space). THE map that makes pattern follow the cut. |
| `<piece>.normal.png` | R, G, B | **linear**, view/camera space, 8-bit ok | Surface orientation → lighting, sheen, fold shading. |
| `<piece>.ao.png` | grayscale | sRGB ok | Ambient occlusion → darkens creases/seams for depth. |
| `<piece>.mask.png` | alpha | — | Silhouette. (Existing masks can be reused if aligned.) |

UV is the non-negotiable one. Without it, stripes can't follow the cloth grain.

### UV authoring rule (critical for stripes/checks)
UV must follow the **garment panel grain** — i.e. unwrap like real cut fabric, so a
vertical stripe in UV space runs straight along each panel and bends only where the cloth
physically bends. This is automatic in Marvelous Designer / CLO3D (panels = fabric pieces).
A generic auto-UV (per-triangle/atlas) will NOT work — stripes will shatter at seams.

---

## Camera & alignment (must match existing render exactly)

- **Orthographic, front view**, identical framing to the current photo layers in
  `public/assets/suits/{blue,black}/` so maps overlay the existing silhouettes/masks 1:1.
- Output canvas aspect: **jacket 600×733**, **pants 600×350** (current). Deliver at **4×**
  = jacket `2400×2932`, pants `2400×1400`; engine downsamples.
- Transparent background (alpha = silhouette).
- No lighting baked into UV/normal (those are data maps). AO may bake soft occlusion only.

---

## Lapel handling (avoids re-doing whole body per lapel option)

Body map covers torso. Lapel comes as a **separate overlay map set** per
`lapel_type × width` (notch/peak × narrow/medium/wide) — 6 small lapel map sets reused
across all bodies. Same for the contrast facing. So a new button count reuses the body;
only genuinely new silhouettes need new body maps.

---

## File naming

```
public/assets/suits/geometry/<styleId>/
  jacket_body.uv.png
  jacket_body.normal.png
  jacket_body.ao.png
  jacket_sleeves.uv.png   ... etc
  pants.uv.png            ... etc
lapel/<type>_<width>.uv.png / .normal.png / .ao.png
```

`<styleId>` matches `suits[].id` in `app/custom-suits/data/options.ts`
(e.g. `single_1btn`, `double_6btn`).

---

## Runtime (engine — built in-app)

WebGL shader per piece:
```
uv   = texture(uUV, screenUv).rg
fab  = texture(uFabric, fract(uv * tileRepeat)).rgb   // any fabric, follows cut
n    = texture(uNormal, screenUv).rgb*2-1
light= ambient + lambert(n, lightDir)*gain + sheen(n, view)
ao   = texture(uAO, screenUv).r
color= fab * light * ao
```
Fabric swaps freely. 40 fabrics = 40 swatch uploads, no asset regen.

---

## What changes when

| Action | 3D work? |
|---|---|
| Add new fabric (any pattern) | **No** — upload swatch only |
| New lapel width / button count | No (reuses body + lapel overlays) |
| New garment **silhouette** (coat, different cut) | **Yes, once** — author its map set |

---

## Tooling to produce the maps (pick one)

- **Marvelous Designer / CLO3D** — sew panels → drape on avatar → bake UV/normal/AO from
  front ortho camera. Industry standard, correct cloth UV. (Free trial; learnable, or hire
  a freelancer once per style.)
- Blender (cloth sim + manual UV) — possible but UV is more manual.

Deliver the four PNGs per piece per the naming above, aligned to the current camera.
