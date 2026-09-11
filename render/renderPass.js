// render/renderPass.js

export function render(gpu, scene) {
  const device = gpu.device;
  const context = gpu.context;

  const writeUniforms = (buffer, color, mvp) => {
    const data = new Float32Array(20);
    data.set(color, 0);
    data.set(mvp, 4);
    device.queue.writeBuffer(buffer, 0, data);
  };

  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: 'clear',
      clearValue: [0.08, 0.08, 0.08, 1],
      storeOp: 'store'
    }]
  });

  const aspect = context.canvas.width / context.canvas.height;
  const width = context.canvas.width;
  const height = context.canvas.height;
  const mode = scene.viewMode ?? 'split';

  if (mode === 'front') {
    drawScene(pass, scene, writeUniforms, makeAxisMVP('xy', aspect), 0, 0, width, height);
  } else if (mode === 'top') {
    drawScene(pass, scene, writeUniforms, makeAxisMVP('xz', aspect), 0, 0, width, height);
  } else if (mode === 'iso') {
    drawScene(pass, scene, writeUniforms, makeIsoMVP(aspect, scene.camera), 0, 0, width, height);
  } else {
    const halfWidth = Math.floor(width * 0.5);
    drawScene(pass, scene, writeUniforms, makeIsoMVP(halfWidth / height, scene.camera), 0, 0, halfWidth, height);
    drawScene(pass, scene, writeUniforms, makeAxisMVP('xz', halfWidth / height), halfWidth, 0, width - halfWidth, height);
  }

  pass.end();
  device.queue.submit([encoder.finish()]);
}

function drawScene(pass, scene, writeUniforms, mvp, x, y, width, height) {
  pass.setViewport(x, y, width, height, 0, 1);
  pass.setScissorRect(x, y, width, height);

  // platform (draw first)
  writeUniforms(scene.platformUniformBuffer, [0.16, 0.45, 0.35, 1], mvp);
  pass.setPipeline(scene.renderPipelines.clothTri);
  pass.setBindGroup(0, scene.platformBindGroup);
  pass.setVertexBuffer(0, scene.platformBuffers.vertex);
  pass.setIndexBuffer(scene.platformBuffers.tri, 'uint32');
  pass.drawIndexed(scene.platformBuffers.triCount);

  writeUniforms(scene.platformUniformBuffer, [0.28, 0.74, 0.56, 1.0], mvp);
  pass.setPipeline(scene.renderPipelines.clothLine);
  pass.setBindGroup(0, scene.platformBindGroup);
  pass.setVertexBuffer(0, scene.platformBuffers.vertex);
  pass.setIndexBuffer(scene.platformBuffers.line, 'uint32');
  pass.drawIndexed(scene.platformBuffers.lineCount);

  // sphere
  if (scene.visibility?.sphereSurface !== false) {
    writeUniforms(scene.sphereUniformBuffer, [1.0, 0.88, 0.22, 0.42], mvp);
    pass.setPipeline(scene.renderPipelines.clothTri);
    pass.setBindGroup(0, scene.sphereBindGroup);
    pass.setVertexBuffer(0, scene.sphereBuffers.vertex);
    pass.setIndexBuffer(scene.sphereBuffers.triIndex, 'uint32');
    pass.drawIndexed(scene.sphere.triCount);
  }

  if (scene.visibility?.sphereWire !== false) {
    writeUniforms(scene.sphereUniformBuffer, [1.0, 0.94, 0.3, 1], mvp);
    pass.setPipeline(scene.renderPipelines.sphere);
    pass.setBindGroup(0, scene.sphereBindGroup);
    pass.setVertexBuffer(0, scene.sphereBuffers.vertex);
    pass.setIndexBuffer(scene.sphereBuffers.lineIndex, 'uint32');
    pass.drawIndexed(scene.sphere.lineCount);
  }

  // cloth
  const clothPositionBuffer = scene.activeClothPositionBuffer ?? scene.clothBuffers.posA;
  if (scene.visibility?.clothSurface !== false) {
    writeUniforms(scene.clothFillUniformBuffer, [0.45, 0.7, 1.0, 0.62], mvp);
    pass.setPipeline(scene.renderPipelines.clothTri);
    pass.setBindGroup(0, scene.clothFillBindGroup);
    pass.setVertexBuffer(0, clothPositionBuffer);
    pass.setIndexBuffer(scene.clothBuffers.tri, 'uint32');
    pass.drawIndexed(scene.clothBuffers.triCount);
  }

  if (scene.visibility?.clothWire !== false) {
    writeUniforms(scene.clothLineUniformBuffer, [1.0, 0.15, 0.15, 1], mvp);
    pass.setPipeline(scene.renderPipelines.clothLine);
    pass.setBindGroup(0, scene.clothLineBindGroup);
    pass.setVertexBuffer(0, clothPositionBuffer);
    pass.setIndexBuffer(scene.clothBuffers.line, 'uint32');
    pass.drawIndexed(scene.clothBuffers.lineCount);
  }
}

const IDENTITY_MAT4 = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

// Build a simple orthographic projection mapping x/y to clip x/y.
function makeAxisMVP(mode, aspect) {
  const s = 0.72; // reduce scale to leave margins
  if (mode === 'xy') {
    // x -> clip.x, y -> clip.y
    return new Float32Array([
      s / aspect, 0, 0, 0,
      0, s, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }
  if (mode === 'xz') {
    // x -> clip.x, z -> clip.y
    return new Float32Array([
      s / aspect, 0, 0, 0, // col0 (x)
      0, 0, 0, 0,          // col1 (y ignored)
      0,-s, 0, 0,          // col2 (z to y, flipped to look from below)
      0, 0, 0, 1           // col3
    ]);
  }
  // yz: y -> clip.x, z -> clip.y
  return new Float32Array([
    0, s / aspect, 0, 0,
    0, 0, 0, 0,
    0, s, 1, 0,
    0, 0, 0, 1
  ]);
}

function makeIsoMVP(aspect, camera = {}) {
  const s = camera.zoom ?? 0.68;
  const yaw = camera.yaw ?? -0.65;
  const pitch = camera.pitch ?? -0.75;
  const scale = new Float32Array([
    s / aspect, 0, 0, 0,
    0, s, 0, 0,
    0, 0, 1, 0,
    0, -0.08, 0, 1
  ]);
  return mul(scale, mul(rotX(pitch), rotY(yaw)));
}

// XY view: collapse y to show cloth thickness as a line
function makeXYLineMVP(aspect, thicknessRatio) {
  const sx = 0.6;
  const sy = Math.max(0.0001, sx * thicknessRatio); // small but visible thickness
  return new Float32Array([
    sx / aspect, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

function translate(x, y, z) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
}

function rotX(rad) {
  const c = Math.cos(rad); const s = Math.sin(rad);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0,-s, c, 0,
    0, 0, 0, 1
  ]);
}

function rotY(rad) {
  const c = Math.cos(rad); const s = Math.sin(rad);
  return new Float32Array([
    c, 0,-s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
}

// Column-major matrix multiply: out = a * b
function mul(a, b) {
  const out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2],  a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6],  a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12],a31 = a[13],a32 = a[14], a33 = a[15];

  const b00 = b[0], b01 = b[1], b02 = b[2],  b03 = b[3];
  const b10 = b[4], b11 = b[5], b12 = b[6],  b13 = b[7];
  const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
  const b30 = b[12],b31 = b[13],b32 = b[14], b33 = b[15];

  out[0] = a00*b00 + a10*b01 + a20*b02 + a30*b03;
  out[1] = a01*b00 + a11*b01 + a21*b02 + a31*b03;
  out[2] = a02*b00 + a12*b01 + a22*b02 + a32*b03;
  out[3] = a03*b00 + a13*b01 + a23*b02 + a33*b03;

  out[4] = a00*b10 + a10*b11 + a20*b12 + a30*b13;
  out[5] = a01*b10 + a11*b11 + a21*b12 + a31*b13;
  out[6] = a02*b10 + a12*b11 + a22*b12 + a32*b13;
  out[7] = a03*b10 + a13*b11 + a23*b12 + a33*b13;

  out[8] = a00*b20 + a10*b21 + a20*b22 + a30*b23;
  out[9] = a01*b20 + a11*b21 + a21*b22 + a31*b23;
  out[10]= a02*b20 + a12*b21 + a22*b22 + a32*b23;
  out[11]= a03*b20 + a13*b21 + a23*b22 + a33*b23;

  out[12]= a00*b30 + a10*b31 + a20*b32 + a30*b33;
  out[13]= a01*b30 + a11*b31 + a21*b32 + a31*b33;
  out[14]= a02*b30 + a12*b31 + a22*b32 + a32*b33;
  out[15]= a03*b30 + a13*b31 + a23*b32 + a33*b33;
  return out;
}
