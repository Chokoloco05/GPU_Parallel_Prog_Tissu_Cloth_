struct Params {
  grid    : vec4<f32>, // width, height, vertex_count, dt
  forces  : vec4<f32>, // gravity, mass, damping, max_speed
  springs : vec4<f32>, // spacing, k_struct, k_shear, k_bend
  sphere  : vec4<f32>, // center.xyz, radius
  contact : vec4<f32>, // floor_y, mu_static, mu_dynamic, time
};

@group(0) @binding(0) var<uniform> u : Params;
@group(0) @binding(1) var<storage, read> srcPos : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> srcVel : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> dstPos : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> dstVel : array<vec4<f32>>;

fn particleIndex(x : i32, y : i32) -> u32 {
  return u32(y) * u32(u.grid.x) + u32(x);
}

fn springForce(p : vec3<f32>, x : i32, y : i32, rest : f32, k : f32) -> vec3<f32> {
  if (x < 0 || y < 0 || x >= i32(u.grid.x) || y >= i32(u.grid.y)) {
    return vec3<f32>(0.0);
  }

  let n = srcPos[particleIndex(x, y)].xyz;
  let d = n - p;
  let len = length(d);
  if (len < 1e-5) {
    return vec3<f32>(0.0);
  }

  return k * (len - rest) * (d / len);
}

fn springCorrection(p : vec3<f32>, x : i32, y : i32, rest : f32, stiffness : f32) -> vec3<f32> {
  if (x < 0 || y < 0 || x >= i32(u.grid.x) || y >= i32(u.grid.y)) {
    return vec3<f32>(0.0);
  }

  let n = srcPos[particleIndex(x, y)].xyz;
  let d = n - p;
  let len = length(d);
  if (len < 1e-5) {
    return vec3<f32>(0.0);
  }

  let maxCorrection = rest * 0.35;
  let correction = clamp((len - rest) * 0.5 * stiffness, -maxCorrection, maxCorrection);
  return correction * (d / len);
}

fn clampSpeed(v : vec3<f32>, maxSpeed : f32) -> vec3<f32> {
  let s = length(v);
  if (s > maxSpeed) {
    return v * (maxSpeed / s);
  }
  return v;
}

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
  let i = id.x;
  if (i >= u32(u.grid.z)) {
    return;
  }

  let width = u32(u.grid.x);
  let x = i32(i % width);
  let y = i32(i / width);
  let dt = u.grid.w;
  let mass = u.forces.y;

  let p0 = srcPos[i].xyz;
  var p = p0;
  var v = srcVel[i].xyz;

  var force = vec3<f32>(0.0, u.forces.x * mass, 0.0);

  let restStruct = u.springs.x;
  let restShear = u.springs.x * 1.41421356237;
  let restBend = u.springs.x * 2.0;

  force += springForce(p, x + 1, y, restStruct, u.springs.y);
  force += springForce(p, x - 1, y, restStruct, u.springs.y);
  force += springForce(p, x, y + 1, restStruct, u.springs.y);
  force += springForce(p, x, y - 1, restStruct, u.springs.y);

  force += springForce(p, x + 1, y + 1, restShear, u.springs.z);
  force += springForce(p, x - 1, y + 1, restShear, u.springs.z);
  force += springForce(p, x + 1, y - 1, restShear, u.springs.z);
  force += springForce(p, x - 1, y - 1, restShear, u.springs.z);

  force += springForce(p, x + 2, y, restBend, u.springs.w);
  force += springForce(p, x - 2, y, restBend, u.springs.w);
  force += springForce(p, x, y + 2, restBend, u.springs.w);
  force += springForce(p, x, y - 2, restBend, u.springs.w);

  v = (v + (force / mass) * dt) * u.forces.z;
  v = clampSpeed(v, u.forces.w);
  p = p + v * dt;

  var correction = vec3<f32>(0.0);
  correction += springCorrection(p, x + 1, y, restStruct, 0.30);
  correction += springCorrection(p, x - 1, y, restStruct, 0.30);
  correction += springCorrection(p, x, y + 1, restStruct, 0.30);
  correction += springCorrection(p, x, y - 1, restStruct, 0.30);
  correction += springCorrection(p, x + 1, y + 1, restShear, 0.18);
  correction += springCorrection(p, x - 1, y + 1, restShear, 0.18);
  correction += springCorrection(p, x + 1, y - 1, restShear, 0.18);
  correction += springCorrection(p, x - 1, y - 1, restShear, 0.18);
  correction += springCorrection(p, x + 2, y, restBend, 0.08);
  correction += springCorrection(p, x - 2, y, restBend, 0.08);
  correction += springCorrection(p, x, y + 2, restBend, 0.08);
  correction += springCorrection(p, x, y - 2, restBend, 0.08);
  p += correction;
  v = clampSpeed((p - p0) / dt, u.forces.w);

  let center = u.sphere.xyz;
  let radius = u.sphere.w + 0.02;
  var toPoint = p - center;
  var dist = length(toPoint);

  // Continuous support on the upper hemisphere. A discrete integration step can
  // jump from above the sphere to below it without ending inside the sphere
  // volume; this clamp prevents that tunneling case.
  let local = p - center;
  let radialSq = dot(local.xz, local.xz);
  if (radialSq < radius * radius) {
    let surfaceY = center.y + sqrt(max(radius * radius - radialSq, 0.0));
    if (p.y < surfaceY) {
      var nTop = normalize(vec3<f32>(local.x, surfaceY - center.y, local.z));
      p.y = surfaceY;

      let vnTop = dot(v, nTop);
      var tangentTop = v - vnTop * nTop;
      let tangentSpeedTop = length(tangentTop);
      let normalPressureTop = abs(min(vnTop, 0.0));

      if (tangentSpeedTop <= u.contact.y * normalPressureTop + 0.0005) {
        tangentTop = vec3<f32>(0.0);
      } else {
        tangentTop *= max(0.0, 1.0 - u.contact.z);
      }

      v = max(vnTop, 0.0) * nTop + tangentTop;
    }
  }

  toPoint = p - center;
  dist = length(toPoint);
  if (dist < radius) {
    var n = vec3<f32>(0.0, 1.0, 0.0);
    if (dist >= 1e-5) {
      n = toPoint / dist;
    }
    p = center + n * radius;

    let vn = dot(v, n);
    var tangentV = v - vn * n;
    let tangentSpeed = length(tangentV);
    let normalPressure = abs(min(vn, 0.0));

    if (tangentSpeed <= u.contact.y * normalPressure + 0.0005) {
      tangentV = vec3<f32>(0.0);
    } else {
      tangentV *= max(0.0, 1.0 - u.contact.z);
    }

    v = max(vn, 0.0) * n + tangentV;
  }

  if (p.y < u.contact.x) {
    p.y = u.contact.x;
    if (v.y < 0.0) {
      v.y = 0.0;
    }
    v.x *= max(0.0, 1.0 - u.contact.z);
    v.z *= max(0.0, 1.0 - u.contact.z);
  }

  if (any(p != p) || any(abs(p) > vec3<f32>(1e4))) {
    p = vec3<f32>(p0.x, u.contact.x, p0.z);
    v = vec3<f32>(0.0);
  }

  dstPos[i] = vec4<f32>(p, 1.0);
  dstVel[i] = vec4<f32>(v, 0.0);
}
