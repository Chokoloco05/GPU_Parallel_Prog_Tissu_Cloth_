struct Uniforms {
  color : vec4<f32>,
  mvp   : mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> u : Uniforms;

@vertex
fn vs_main(@location(0) pos : vec4<f32>) -> @builtin(position) vec4<f32> {
  return u.mvp * pos;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
  return u.color;
}
