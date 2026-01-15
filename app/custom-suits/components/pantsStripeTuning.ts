export const PANTS_STRIPE_TUNING = {
  // 1️⃣ LEVA NOGAVICA – jaka dijagonala
  leftRotationDeg: -44,

  // 2️⃣ PREKLOP / ŠLIC
  // gotovo horizontalno (mnogo manji nagib)
  rightUpperRotationDeg: -0.8,
  rightLowerRotationDeg: -0.8,

  // 3️⃣ POJAS – čisto vertikalno
  waistRotationDeg: 90,

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
  },

  stripeOffsets: {
    leftMain: { x: 0, y: 0 },
    leftUnderlap: { x: 0, y: 24 },
    rightFly: { x: 0, y: 0 },
    rightUnder: { x: 0, y: 0 },
    waist: { x: 0, y: 0 },
  },

  // split mora ostati neutralan da ne “lomi” pruge
  rightSplitRatio: 98 / 254,

  // blagi X push samo za kontinuitet
  rightForceXRatio: 0.88,
  waistbandXRatio: 0.96,

  // OVO MORA BITI NISKO
  // inače ubija razliku između zona
  stripeRotationMinStrength: 0.02,
};
