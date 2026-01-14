export const PANTS_STRIPE_TUNING = {
  // glavna nogavica (leva velika površina) – treba jače da se nagne u dijagonalu
  leftRotationDeg: -24.5,

  // desna strana (zona preklopa/šlica) – ne 90° (to često “ubije” smer),
  // nego isti dijagonalni smer kao referenca
  rightUpperRotationDeg: -24.5,
  rightLowerRotationDeg: -24.5,

  // pojas – blago prati dijagonalu (na referenci nije “0° flat”)
  waistRotationDeg: -6.0,

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
  },

  // split na desnoj strani: malo pomeri rez da se pruge bolje “nastave”
  rightSplitRatio: 102 / 254,

  // blagi push ka X da se linije poravnaju preko preklopa
  rightForceXRatio: 0.86,

  // waistband offset sitno unazad (manje “beži” pattern)
  waistbandXRatio: 0.935,

  // da rotacija stvarno “pobedi” preko shading-a i maski (trenutno ti je preslabo)
  stripeRotationMinStrength: 0.065,
};
