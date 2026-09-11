export function createRenderBindGroups(device, layout, mvp, colors) {

  function make(color) {
    const buffer = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(buffer, 0, new Float32Array(color));
    device.queue.writeBuffer(buffer, 16, mvp);

    return device.createBindGroup({
      layout,
      entries: [{
        binding: 0,
        resource: { buffer }
      }]
    });
  }

  return {
    sphere: make(colors.sphere),
    clothFill: make(colors.clothFill),
    clothLine: make(colors.clothLine)
  };
}
