import { buildPhysicsParams } from './parameters.js';

const PARAM_FLOATS = 20;
const WORKGROUP_SIZE = 128;

export async function createSimulation(gpu, scene) {
  const { device } = gpu;
  const cloth = scene.cloth;
  const buffers = scene.clothBuffers;
  const spacing = cloth.size / (cloth.width - 1);
  const phys = buildPhysicsParams(spacing, scene.sphereRadius ?? 0.5);

  const shaderCode = await loadShader('./shaders/simulation/structural_shear_bend.wgsl');
  const shader = device.createShaderModule({ code: shaderCode });

  const paramsBuffer = device.createBuffer({
    size: PARAM_FLOATS * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
    ]
  });

  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shader, entryPoint: 'main' }
  });

  const bindGroups = [
    makeBindGroup(device, bindGroupLayout, paramsBuffer, buffers.posA, buffers.velA, buffers.posB, buffers.velB),
    makeBindGroup(device, bindGroupLayout, paramsBuffer, buffers.posB, buffers.velB, buffers.posA, buffers.velA)
  ];

  let current = 0;
  let paused = false;
  let time = 0;

  function writeParams() {
    const data = new Float32Array(PARAM_FLOATS);
    data.set([
      cloth.width, cloth.height, cloth.vertexCount, phys.dt,
      phys.gravity, phys.mass, phys.damping, phys.maxSpeed,
      phys.spacing, phys.kStruct, phys.kShear, phys.kBend,
      scene.sphereCenter?.[0] ?? 0, scene.sphereCenter?.[1] ?? 0, scene.sphereCenter?.[2] ?? 0, phys.sphereR,
      scene.platform?.y ?? -2.0, phys.muStatic, phys.muDynamic, time
    ]);
    device.queue.writeBuffer(paramsBuffer, 0, data);
  }

  function step() {
    if (paused) return;

    const workgroups = Math.ceil(cloth.vertexCount / WORKGROUP_SIZE);
    const encoder = device.createCommandEncoder();

    for (let s = 0; s < phys.substeps; s++) {
      writeParams();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[current]);
      pass.dispatchWorkgroups(workgroups);
      pass.end();
      current = 1 - current;
      time += phys.dt;
    }

    device.queue.submit([encoder.finish()]);
    scene.activeClothPositionBuffer = current === 0 ? buffers.posA : buffers.posB;
  }

  function reset() {
    const zeroVelocities = new Float32Array(cloth.vertexData.length);
    device.queue.writeBuffer(buffers.posA, 0, cloth.vertexData);
    device.queue.writeBuffer(buffers.posB, 0, cloth.vertexData);
    device.queue.writeBuffer(buffers.velA, 0, zeroVelocities);
    device.queue.writeBuffer(buffers.velB, 0, zeroVelocities);
    current = 0;
    time = 0;
    scene.activeClothPositionBuffer = buffers.posA;
  }

  function togglePause() {
    paused = !paused;
    return paused;
  }

  function setGravityScale(delta) {
    phys.gravity += delta;
  }

  function setFriction(delta) {
    phys.muStatic = clamp(phys.muStatic + delta, 0, 1.5);
    phys.muDynamic = clamp(phys.muDynamic + delta, 0, 1.5);
  }

  scene.activeClothPositionBuffer = buffers.posA;
  writeParams();

  return {
    step,
    reset,
    togglePause,
    setGravityScale,
    setFriction,
    getParams: () => ({ ...phys, paused, time })
  };
}

function makeBindGroup(device, layout, params, srcPos, srcVel, dstPos, dstVel) {
  return device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: params } },
      { binding: 1, resource: { buffer: srcPos } },
      { binding: 2, resource: { buffer: srcVel } },
      { binding: 3, resource: { buffer: dstPos } },
      { binding: 4, resource: { buffer: dstVel } }
    ]
  });
}

async function loadShader(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Impossible de charger ${url}: ${res.status}`);
  }
  return res.text();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
