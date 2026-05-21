# Real Fabric Custom Suits Preview Design

Date: 2026-05-21

## Goal

Improve the custom suits preview so striped and patterned fabrics remain based on the real uploaded fabric image while reading more like a constructed garment. The immediate quality target is the Hockerty reference behavior for the current folded pants artwork: jacket stripes should read along jacket panels, and pants stripes should follow the folded leg and waistband panels instead of staying flat across the whole pants silhouette.

## Constraints

- Do not generate synthetic stripe lines for garment preview.
- Use the real fabric texture selected from CMS data or its derived texture tile.
- Admin fabric upload must stay practical for phone photos.
- New fabrics should get a usable preview automatically, with admin correction controls for difficult fabrics.
- Existing `fabricSpecific` renders may remain an optional future quality path for select fabrics, not a requirement for normal uploads.

## Current State

The renderer already has most of the required building blocks:

- `FabricUnion` paints real fabric textures into masked garment areas.
- Jacket stripe rendering already splits body and lapel regions.
- Pants stripe masks, deterministic zone boundaries, rotation tuning, and phase-offset helpers already exist.
- Pants zoned texture rendering is currently disabled in the live renderer by the hardcoded `pantsZoneTextureActive = false`, so pants stripe fabrics render through the fallback full pants mask and read too flat.

## Recommended Approach

Use real-texture zoned mapping as the default patterned-fabric path, with small per-fabric tuning metadata saved in CMS where auto analysis is not enough.

This combines:

1. Automatic texture analysis and real texture tiling from upload.
2. Garment-zone mapping for jacket and pants.
3. Admin overrides for pattern classification, stripe direction, scale, and spacing.

It avoids the two bad extremes:

- Flatly repeating one uploaded image over every garment shape.
- Drawing fake stripe overlays that no longer match the selected fabric.

## Renderer Design

### Shared Texture Principle

Every garment zone for one preview uses the same real source fabric texture or derived real texture tile. Zones may rotate, scale, crop, and phase-shift that texture, but they must not substitute generated stripe artwork.

### Jacket

Keep the existing jacket model:

- Base body mask.
- Left lapel stripe zone.
- Right lapel stripe zone.
- Real texture rendering with per-zone orientation where stripes need it.

The jacket path should remain visually stable while the pants path is improved.

### Pants

Enable zoned real-texture rendering for stripe-eligible pants fabrics when the generated masks are valid.

The folded pants artwork should use these construction zones:

- `leftMain`: folded left leg panel. Stripes follow the diagonal folded leg direction.
- `rightUpper`: main right pants body panel. Stripes follow the long panel direction, close to the Hockerty horizontal reference.
- `rightLower`: lower fold region when the deterministic mask yields a meaningful panel.
- `waist`: narrow waistband and far-right belt panel.

The existing deterministic pants masks and stripe tuning files are the first implementation path. Zone angles, boundaries, and phase offsets should be tuned from the current pants sprite and validated against real fabric textures such as `blue line`, `stripes brown`, and `sive stripes`.

### Phase And Continuity

Zone boundaries should not reset stripe phase arbitrarily. The phase-offset helper should align texture phase from a reference zone into adjacent pants zones where possible. A fold seam may change stripe direction, but the stripe source should still read as the same fabric.

### Fallbacks

- If pants zoned mask generation fails validation, render the real texture through the fallback pants union mask.
- If pattern analysis is uncertain, do not draw synthetic pattern overlays.
- Solid fabrics keep the simpler path.

## Fabric Upload And Metadata

### Upload Inputs

Admin may upload a phone photo of a fabric. The system keeps the original asset and uses existing analysis/tile generation to derive a renderer-friendly texture input.

### Auto Analysis

The pipeline should continue or extend analysis for:

- dominant/base color
- pattern hint
- stripe presence and orientation hint
- contrast/texture strength guidance
- texture tile suitability

### Admin Corrections

Admin needs corrective controls for difficult fabrics:

- pattern: solid, stripe, pinstripe, check, or current supported equivalents
- stripe direction: auto, vertical, horizontal
- texture scale
- stripe spacing scale for jacket
- stripe spacing scale for pants
- existing texture strength, contrast, brightness controls

The renderer should honor stored fabric metadata before relying on inference.

## Data Flow

1. Admin uploads fabric image.
2. Fabric API stores image and metadata.
3. Texture analysis returns defaults.
4. Admin can save corrections.
5. Customer selects the fabric.
6. Suit preview chooses solid or patterned rendering path.
7. Patterned jacket and pants zones receive the real fabric source with their zone masks and rotations.

## Testing And Visual Verification

### Automated Checks

- Keep build and type validation green.
- Extend preview regression coverage where existing scripts can observe zoned pants state without relying on synthetic stripes.
- Preserve the synthetic stripe guard.

### Visual Checks

Verify on desktop and mobile:

- `blue line`
- `stripes brown`
- `sive stripes`
- one solid fabric

For striped pants, inspect:

- left folded leg stripe direction
- right body stripe direction
- waistband behavior
- absence of texture bleed outside the pants silhouette
- absence of generated fake lines

## Rollout

The production rollout should include only project changes needed for the feature and any already-reviewed site changes the user explicitly asks to ship. Local scratch files, screenshots, debug downloads, `.claude`, and legacy helper PHP files must not be pushed to Vercel unless separately requested and justified.

## Out Of Scope For This Pass

- A full 3D tailoring renderer.
- Fully automatic correction of every low-quality phone photo.
- Mandatory fabric-specific garment render assets for every CMS fabric.
- Rebuilding the entire custom suits asset pipeline around Hockerty internals.
