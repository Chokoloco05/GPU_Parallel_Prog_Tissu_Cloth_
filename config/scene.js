// config/scene.js

import { createSphere } from '../geometry/sphere.js';
import { createTissu } from '../geometry/tissu.js';

import { createSphereBuffers } from '../buffers/sphereBuffers.js';
import { createClothBuffers } from '../buffers/clothBuffers.js';

import { createRenderPipelines } from '../render/renderPipeline.js';

export async function createScene(gpu) {
  const { device, format } = gpu;

  const sphereRadius = 0.8;
  const sphere = createSphere(56, sphereRadius);
  // Dense unpinned cloth. The side length is chosen so the whole patch can
  // be supported by the sphere instead of immediately collapsing as side walls.
  const cloth  = createTissu(64, 4.0, 1.15);
  // Platform below the sphere (radius 0.5), centered at (0, -2.0, 0) and larger
  const platform = createPlatform(6.0, 6.0, -2.0);

  const sphereBuffers = createSphereBuffers(device, sphere);
  const clothBuffers  = createClothBuffers(device, cloth);
  const platformBuffers = createPlatformBuffers(device, platform);

  const renderPipelines = await createRenderPipelines(device, format);
  const visibility = {
    clothSurface: true,
    clothWire: true,
    sphereSurface: true,
    sphereWire: true,
    info: true
  };

  // Separate uniforms per object to avoid overwriting colors
  const sphereUniformBuffer = device.createBuffer({
    size: 20 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const clothFillUniformBuffer = device.createBuffer({
    size: 20 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const clothLineUniformBuffer = device.createBuffer({
    size: 20 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const platformUniformBuffer = device.createBuffer({
    size: 20 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const sphereBindGroup = device.createBindGroup({
    layout: renderPipelines.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: sphereUniformBuffer } }]
  });
  const clothFillBindGroup = device.createBindGroup({
    layout: renderPipelines.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: clothFillUniformBuffer } }]
  });
  const clothLineBindGroup = device.createBindGroup({
    layout: renderPipelines.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: clothLineUniformBuffer } }]
  });
  const platformBindGroup = device.createBindGroup({
    layout: renderPipelines.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: platformUniformBuffer } }]
  });

  // Simple axis helpers for XY and XZ views (separate lines per axis)
  const axisXY = {
    x: createAxisLine(device, [-1, 0, 0, 1], [1, 0, 0, 1]),
    y: createAxisLine(device, [0, -1, 0, 1], [0, 1, 0, 1])
  };

  const axisXZ = {
    x: createAxisLine(device, [-1, 0, 0, 1], [1, 0, 0, 1]),
    z: createAxisLine(device, [0, 0, -1, 1], [0, 0, 1, 1])
  };

  return {
    sphere,
    cloth,
    sphereRadius,
    platform,
    sphereBuffers,
    clothBuffers,
    platformBuffers,
    renderPipelines,
    sphereUniformBuffer,
    clothFillUniformBuffer,
    clothLineUniformBuffer,
    platformUniformBuffer,
    sphereBindGroup,
    clothFillBindGroup,
    clothLineBindGroup,
    platformBindGroup,
    axisXY,
    axisXZ,
    visibility,
    activeClothPositionBuffer: clothBuffers.posA,
    sphereCenter: [0, 0, 0]
  };
}

function createAxisLine(device, from, to) {
  const verts = new Float32Array([...from, ...to]);
  const vertex = device.createBuffer({
    size: verts.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vertex, 0, verts);

  const index = device.createBuffer({
    size: 2 * 4, // 2 indices
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(index, 0, new Uint32Array([0, 1]));

  return { vertex, index, count: 2 };
}

function createPlatform(width, depth, y) {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  return {
    width,
    depth,
    y,
    positions: [
      [-hw, y, -hd, 1],
      [ hw, y, -hd, 1],
      [ hw, y,  hd, 1],
      [-hw, y,  hd, 1]
    ],
    triIndices: [0, 1, 2, 0, 2, 3],
    lineIndices: [0, 1, 1, 2, 2, 3, 3, 0, 0, 2] // add one diagonal for clarity
  };
}

function createPlatformBuffers(device, platform) {
  const flatPos = new Float32Array(platform.positions.flat());
  const vertex = device.createBuffer({
    size: flatPos.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vertex, 0, flatPos);

  const tri = device.createBuffer({
    size: platform.triIndices.length * 4,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(tri, 0, new Uint32Array(platform.triIndices));

  const line = device.createBuffer({
    size: platform.lineIndices.length * 4,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(line, 0, new Uint32Array(platform.lineIndices));

  return {
    vertex,
    tri,
    line,
    triCount: platform.triIndices.length,
    lineCount: platform.lineIndices.length
  };
}
