// Centralized physics defaults so tuning is easy in one place.
export const physicsDefaults = {
  substeps: 30,
  baseDt: 0.016,      // ~60 FPS
  gravity: -9.81,
  mass: 0.1,
  kStruct: 100.0,
  kShear: 50.0,
  kBend: 10.0,
  damping: 0.992,
  muStatic: 0.65,
  muDynamic: 0.42,
  contactOffset: 0.02,
  maxSpeed: 2.2
};

export function buildPhysicsParams(spacing, sphereR) {
  const p = physicsDefaults;
  return {
    substeps: p.substeps,
    dt: p.baseDt / p.substeps,
    gravity: p.gravity,
    mass: p.mass,
    kStruct: p.kStruct,
    kShear: p.kShear,
    kBend: p.kBend,
    damping: p.damping,
    muStatic: p.muStatic,
    muDynamic: p.muDynamic,
    contactOffset: p.contactOffset,
    maxSpeed: p.maxSpeed,
    spacing,
    sphereR
  };
}
