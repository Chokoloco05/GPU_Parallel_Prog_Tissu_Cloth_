// render/renderPipeline.js

// Render pipelines are defined with an inline shader to avoid fetch/runtime issues.
export async function createRenderPipelines(device, format) {
  const shader = device.createShaderModule({ code: RENDER_SHADER });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  const pipeline = topology => device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shader,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 16,
        attributes: [{ shaderLocation: 0, format: 'float32x4', offset: 0 }]
      }]
    },
    fragment: {
      module: shader,
      entryPoint: 'fs_main',
      targets: [{
        format,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          }
        }
      }]
    },
    primitive: { topology }
  });

  return {
    sphere: pipeline('line-list'),
    clothTri: pipeline('triangle-list'),
    clothLine: pipeline('line-list'),
    bindGroupLayout
  };
}

// Inline WGSL so rendering works even without static file serving.
const RENDER_SHADER = /* wgsl */ `
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
`;
