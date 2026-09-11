// buffers/clothBuffers.js

export function createClothBuffers(device, cloth) {
  const bufferUsage = GPUBufferUsage.VERTEX
    | GPUBufferUsage.STORAGE
    | GPUBufferUsage.COPY_DST;

  // positions ping-pong: the compute pass reads one buffer and writes the other.
  const posA = device.createBuffer({
    size: cloth.vertexData.byteLength,
    usage: bufferUsage
  });
  device.queue.writeBuffer(posA, 0, cloth.vertexData);

  const posB = device.createBuffer({
    size: cloth.vertexData.byteLength,
    usage: bufferUsage
  });
  device.queue.writeBuffer(posB, 0, cloth.vertexData);

  const zeroVelocities = new Float32Array(cloth.vertexData.length);

  const velA = device.createBuffer({
    size: cloth.vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(velA, 0, zeroVelocities);

  const velB = device.createBuffer({
    size: cloth.vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(velB, 0, zeroVelocities);

  // indices
  const tri = device.createBuffer({
    size: cloth.triData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(tri, 0, cloth.triData);

  const line = device.createBuffer({
    size: cloth.lineData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(line, 0, cloth.lineData);

  return {
    pos: posA,
    posA,
    posB,
    velA,
    velB,
    tri,
    line,
    triCount: cloth.triData.length,
    lineCount: cloth.lineData.length,
  };
}
