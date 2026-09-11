export function createSphereBuffers(device, sphere) {

  const vertex = device.createBuffer({
    size: sphere.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vertex, 0, sphere.vertexData);

  const triIndex = device.createBuffer({
    size: sphere.triData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(triIndex, 0, sphere.triData);

  const lineIndex = device.createBuffer({
    size: sphere.lineData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(lineIndex, 0, sphere.lineData);

  return {
    vertex,     // GPUBuffer
    triIndex,
    lineIndex   // GPUBuffer
  };
}
