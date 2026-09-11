export async function initGPU() {
  const canvas = document.getElementById('c');
  if (!canvas) {
    throw new Error('Canvas #c introuvable.');
  }

  if (!('gpu' in navigator)) {
    throw new Error(
      "WebGPU n'est pas disponible. Ouvre l'application avec un navigateur compatible comme Chrome ou Edge recent, depuis http://127.0.0.1:8000/."
    );
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error(
      "Aucun adaptateur WebGPU n'a ete trouve. Verifie que l'acceleration materielle est activee dans le navigateur."
    );
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Impossible de creer le contexte WebGPU du canvas.');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  function resizeCanvas() {
    canvas.width = Math.max(1, Math.floor(window.innerWidth * window.devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * window.devicePixelRatio));
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  context.configure({
    device,
    format,
    alphaMode: 'opaque'
  });

  return { device, context, format };
}
