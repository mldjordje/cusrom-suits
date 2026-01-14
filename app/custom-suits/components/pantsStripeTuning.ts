export const PANTS_STRIPE_TUNING = {
  // 1️⃣ LEVA NOGAVICA – jaka dijagonala
  leftRotationDeg: -28.0,

  // 2️⃣ PREKLOP / ŠLIC
  // gotovo horizontalno (mnogo manji nagib)
  rightUpperRotationDeg: -6.0,
  rightLowerRotationDeg: -6.0,

  // 3️⃣ POJAS – čisto vertikalno
  waistRotationDeg: 90,

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
  },

  // split mora ostati neutralan da ne “lomi” pruge
  rightSplitRatio: 98 / 254,

  // blagi X push samo za kontinuitet
  rightForceXRatio: 0.88,
  waistbandXRatio: 0.945,

  // OVO MORA BITI NISKO
  // inače ubija razliku između zona
  stripeRotationMinStrength: 0.02,
};
