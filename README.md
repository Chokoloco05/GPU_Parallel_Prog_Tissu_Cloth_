# Tissu Cloth

Cloth simulation with rendering and computation powered by WebGPU.

## Launch

On Windows, run the following from this folder:

```powershell
.\launch_app.bat
```

To stop the server: Ctrl + C

The script starts a local server at:

```text
http://127.0.0.1:8000/
```

Keep the server window open while using the application, then open the URL in Chrome or Edge.

Do not open `index.html` directly: the application must be served by a local server.

## WebGPU Requirements

- Use a recent version of Chrome or Edge.
- Enable graphics acceleration in your browser.
- If WebGPU is not detected, check `chrome://gpu` or `edge://gpu`.
- If needed, enable `chrome://flags/#enable-unsafe-webgpu` or `edge://flags/#enable-unsafe-webgpu`.

## Controls

### Camera

| Control | Action |
| --- | --- |
| Left-click + drag | Rotate the camera |
| Mouse wheel | Zoom in / out |
| `V` | Switch views: `split`, `front`, `top`, `iso` |

### Display

| Control | Action |
| --- | --- |
| `1` | Show / hide the cloth surface |
| `2` | Show / hide the cloth wireframe |
| `3` | Show / hide the sphere surface |
| `4` | Show / hide the sphere wireframe |
| `I` | Show / hide simulation information |

### Simulation

| Control | Action |
| --- | --- |
| `P` | Pause / resume |
| `R` or `0` | Reset the simulation |
| `[` | Decrease friction |
| `]` | Increase friction |
| `-` | Increase the effect of gravity |
| `=` | Decrease the effect of gravity |
