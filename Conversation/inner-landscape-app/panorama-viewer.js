// Shared equirectangular 360 panorama viewer, used by both record.html
// (reviewing arbitrary generation records) and study2.html (fixed P<n>
// study stimuli). Exposes window.createPanoramaViewer(canvas).
(() => {
  "use strict";

  // Minimal dependency-free equirectangular 360 panorama viewer: a fullscreen-quad
  // WebGL shader raycasts each pixel into a yaw/pitch/fov camera and samples the
  // source image directly, so it stays correct at any canvas size without needing
  // power-of-two texture wrapping tricks.
  function createPanoramaViewer(canvas) {
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.warn("WebGL is not available; panorama preview is disabled.");
      return null;
    }

    const vertexSource = `
      attribute vec2 aPos;
      varying vec2 vNdc;
      void main() {
        vNdc = aPos;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      varying vec2 vNdc;
      uniform sampler2D uTex;
      uniform float uYaw;
      uniform float uPitch;
      uniform float uTanHalfFov;
      uniform float uAspect;

      const float PI = 3.14159265359;

      void main() {
        vec3 dir = normalize(vec3(vNdc.x * uAspect * uTanHalfFov, vNdc.y * uTanHalfFov, -1.0));

        float cp = cos(uPitch);
        float sp = sin(uPitch);
        vec3 d1 = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);

        float cy = cos(uYaw);
        float sy = sin(uYaw);
        vec3 d2 = vec3(d1.x * cy + d1.z * sy, d1.y, -d1.x * sy + d1.z * cy);

        float lon = atan(d2.x, -d2.z);
        float lat = asin(clamp(d2.y, -1.0, 1.0));

        float u = lon / (2.0 * PI) + 0.5;
        float v = 0.5 - lat / PI;

        gl_FragColor = texture2D(uTex, vec2(fract(u), clamp(v, 0.0, 1.0)));
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Panorama shader compile error: ${info}`);
      }
      return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Panorama program link error:", gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      tex: gl.getUniformLocation(program, "uTex"),
      yaw: gl.getUniformLocation(program, "uYaw"),
      pitch: gl.getUniformLocation(program, "uPitch"),
      tanHalfFov: gl.getUniformLocation(program, "uTanHalfFov"),
      aspect: gl.getUniformLocation(program, "uAspect"),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([30, 30, 30, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const view = { yaw: 0, pitch: 0, fovDeg: 90 };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rafId = null;

    function resize() {
      const width = Math.max(1, Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)));
      const height = Math.max(1, Math.round(canvas.clientHeight * (window.devicePixelRatio || 1)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render() {
      resize();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.tex, 0);
      gl.uniform1f(uniforms.yaw, (view.yaw * Math.PI) / 180);
      gl.uniform1f(uniforms.pitch, (view.pitch * Math.PI) / 180);
      gl.uniform1f(uniforms.tanHalfFov, Math.tan(((view.fovDeg * Math.PI) / 180) / 2));
      gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    }

    function onPointerDown(event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      const fovRad = (view.fovDeg * Math.PI) / 180;
      view.yaw -= (dx / canvas.clientWidth) * fovRad * (180 / Math.PI);
      view.pitch += (dy / canvas.clientHeight) * fovRad * (180 / Math.PI);
      view.pitch = Math.max(-89, Math.min(89, view.pitch));
    }

    function onPointerUp(event) {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }

    function onWheel(event) {
      event.preventDefault();
      view.fovDeg = Math.max(30, Math.min(100, view.fovDeg + event.deltaY * 0.05));
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // ---- WebXR (immersive-vr): renders the same equirectangular texture
    // into each eye's XRWebGLLayer viewport. Headset lenses need an
    // asymmetric per-eye frustum, which the desktop yaw/pitch/fov shader
    // above can't express, so this uses a separate shader that unprojects
    // via each eye's actual projection/view matrices instead. There's no
    // stereo depth/parallax since the source is one mono panorama photo --
    // both eyes sample the same texture, same as any ordinary 360-photo VR
    // viewer (Cardboard/Quest photo apps work the same way).
    //
    // Runs on its own throwaway canvas + WebGL context created with
    // {xrCompatible: true} up front, rather than retrofitting the existing
    // desktop-viewer context via makeXRCompatible(). The retrofit path is
    // technically spec-legal but unreliable in practice on Chromium-based
    // headset browsers -- it's what threw InvalidStateError ("object is not,
    // or is no longer, usable") from the XRWebGLLayer constructor even after
    // requesting the session first. A fresh context avoids that whole class
    // of failure and matches every official WebXR sample's pattern.
    const xrFragmentSource = `
      precision highp float;
      varying vec2 vNdc;
      uniform sampler2D uTex;
      uniform mat4 uInvViewProj;
      const float PI = 3.14159265359;
      void main() {
        vec4 nearPoint = uInvViewProj * vec4(vNdc, -1.0, 1.0);
        vec4 farPoint = uInvViewProj * vec4(vNdc, 1.0, 1.0);
        vec3 nearWorld = nearPoint.xyz / nearPoint.w;
        vec3 farWorld = farPoint.xyz / farPoint.w;
        vec3 dir = normalize(farWorld - nearWorld);
        float lon = atan(dir.x, -dir.z);
        float lat = asin(clamp(dir.y, -1.0, 1.0));
        float u = lon / (2.0 * PI) + 0.5;
        float v = 0.5 - lat / PI;
        gl_FragColor = texture2D(uTex, vec2(fract(u), clamp(v, 0.0, 1.0)));
      }
    `;

    function compileShader(glCtx, type, source) {
      const shader = glCtx.createShader(type);
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        const info = glCtx.getShaderInfoLog(shader);
        glCtx.deleteShader(shader);
        throw new Error(`XR panorama shader compile error: ${info}`);
      }
      return shader;
    }

    function buildXrResources(xrGl) {
      const xrProgram = xrGl.createProgram();
      xrGl.attachShader(xrProgram, compileShader(xrGl, xrGl.VERTEX_SHADER, vertexSource));
      xrGl.attachShader(xrProgram, compileShader(xrGl, xrGl.FRAGMENT_SHADER, xrFragmentSource));
      xrGl.bindAttribLocation(xrProgram, 0, "aPos");
      xrGl.linkProgram(xrProgram);
      if (!xrGl.getProgramParameter(xrProgram, xrGl.LINK_STATUS)) {
        throw new Error(`XR panorama program link error: ${xrGl.getProgramInfoLog(xrProgram)}`);
      }

      const xrBuffer = xrGl.createBuffer();
      xrGl.bindBuffer(xrGl.ARRAY_BUFFER, xrBuffer);
      xrGl.bufferData(xrGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), xrGl.STATIC_DRAW);

      const xrTexture = xrGl.createTexture();
      xrGl.bindTexture(xrGl.TEXTURE_2D, xrTexture);
      xrGl.texImage2D(xrGl.TEXTURE_2D, 0, xrGl.RGBA, 1, 1, 0, xrGl.RGBA, xrGl.UNSIGNED_BYTE, new Uint8Array([30, 30, 30, 255]));
      xrGl.texParameteri(xrGl.TEXTURE_2D, xrGl.TEXTURE_WRAP_S, xrGl.CLAMP_TO_EDGE);
      xrGl.texParameteri(xrGl.TEXTURE_2D, xrGl.TEXTURE_WRAP_T, xrGl.CLAMP_TO_EDGE);
      xrGl.texParameteri(xrGl.TEXTURE_2D, xrGl.TEXTURE_MIN_FILTER, xrGl.LINEAR);
      xrGl.texParameteri(xrGl.TEXTURE_2D, xrGl.TEXTURE_MAG_FILTER, xrGl.LINEAR);
      if (lastImageEl && lastImageEl.complete) {
        xrGl.texImage2D(xrGl.TEXTURE_2D, 0, xrGl.RGBA, xrGl.RGBA, xrGl.UNSIGNED_BYTE, lastImageEl);
      }

      return {
        program: xrProgram,
        buffer: xrBuffer,
        texture: xrTexture,
        uniforms: {
          tex: xrGl.getUniformLocation(xrProgram, "uTex"),
          invViewProj: xrGl.getUniformLocation(xrProgram, "uInvViewProj"),
        },
      };
    }

    let lastImageEl = null;
    let xrSession = null;
    let xrRefSpace = null;
    let activeXrGl = null;
    let activeXrRes = null;
    let resumeDesktopOnXrEnd = false;

    // Column-major 4x4 multiply/invert -- no matrix library is loaded, and
    // WebXR's per-eye projection matrices are off-axis (asymmetric frustum
    // for the lens), so a generic inverse is needed rather than a closed-form
    // shortcut for a symmetric frustum.
    function mat4Multiply(a, b) {
      const out = new Float32Array(16);
      for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
          let sum = 0;
          for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
          out[col * 4 + row] = sum;
        }
      }
      return out;
    }

    function mat4Invert(m) {
      const inv = new Float32Array(16);
      inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
      inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
      inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
      inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
      inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
      inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
      inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
      inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
      inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
      inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
      inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
      inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
      inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
      inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
      inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
      inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
      const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
      if (det === 0) return null;
      const invDet = 1 / det;
      for (let i = 0; i < 16; i++) inv[i] *= invDet;
      return inv;
    }

    function onXrFrame(time, frame) {
      if (!xrSession) return;
      xrSession.requestAnimationFrame(onXrFrame);
      const pose = frame.getViewerPose(xrRefSpace);
      if (!pose) return;
      const xrGl = activeXrGl;
      const res = activeXrRes;
      const glLayer = xrSession.renderState.baseLayer;
      xrGl.bindFramebuffer(xrGl.FRAMEBUFFER, glLayer.framebuffer);
      xrGl.clearColor(0, 0, 0, 1);
      xrGl.clear(xrGl.COLOR_BUFFER_BIT);
      xrGl.useProgram(res.program);
      xrGl.bindBuffer(xrGl.ARRAY_BUFFER, res.buffer);
      xrGl.enableVertexAttribArray(0);
      xrGl.vertexAttribPointer(0, 2, xrGl.FLOAT, false, 0, 0);
      xrGl.activeTexture(xrGl.TEXTURE0);
      xrGl.bindTexture(xrGl.TEXTURE_2D, res.texture);
      xrGl.uniform1i(res.uniforms.tex, 0);
      for (const view of pose.views) {
        const viewport = glLayer.getViewport(view);
        xrGl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        const viewProj = mat4Multiply(view.projectionMatrix, view.transform.inverse.matrix);
        const invViewProj = mat4Invert(viewProj);
        if (!invViewProj) continue;
        xrGl.uniformMatrix4fv(res.uniforms.invViewProj, false, invViewProj);
        xrGl.drawArrays(xrGl.TRIANGLE_STRIP, 0, 4);
      }
    }

    function onXrSessionEnd() {
      xrSession = null;
      xrRefSpace = null;
      activeXrGl = null;
      activeXrRes = null;
      if (resumeDesktopOnXrEnd) render();
    }

    async function startXR() {
      if (!navigator.xr) throw new Error("This browser does not support WebXR.");
      if (xrSession) return;

      const xrCanvas = document.createElement("canvas");
      const xrGl = xrCanvas.getContext("webgl", { xrCompatible: true }) || xrCanvas.getContext("experimental-webgl", { xrCompatible: true });
      if (!xrGl) throw new Error("Could not create a WebGL context for VR rendering.");
      let xrRes;
      try {
        xrRes = buildXrResources(xrGl);
      } catch (error) {
        throw new Error(`Could not initialize VR rendering: ${error.message || error}`);
      }

      resumeDesktopOnXrEnd = rafId !== null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      let session;
      try {
        session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      } catch (error) {
        if (resumeDesktopOnXrEnd) render();
        throw new Error(`requestSession failed: ${error.message || error}`);
      }
      xrSession = session;
      activeXrGl = xrGl;
      activeXrRes = xrRes;
      session.addEventListener("end", onXrSessionEnd);
      try {
        if (xrGl.makeXRCompatible) await xrGl.makeXRCompatible();
        await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, xrGl) });
      } catch (error) {
        session.end().catch(() => {});
        throw new Error(`Could not create XRWebGLLayer: ${error.message || error}`);
      }
      try {
        xrRefSpace = await session.requestReferenceSpace("local-floor");
      } catch {
        try {
          xrRefSpace = await session.requestReferenceSpace("local");
        } catch (error) {
          session.end().catch(() => {});
          throw new Error(`requestReferenceSpace failed: ${error.message || error}`);
        }
      }
      session.requestAnimationFrame(onXrFrame);
    }

    function stopXR() {
      if (xrSession) xrSession.end().catch(() => {});
    }

    return {
      loadImage(url) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          lastImageEl = image;
        };
        image.src = url;
        view.yaw = 0;
        view.pitch = 0;
        view.fovDeg = 90;
      },
      start() {
        if (rafId === null) render();
      },
      stop() {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      supportsXR() {
        return !!navigator.xr;
      },
      startXR,
      stopXR,
    };
  }

  window.createPanoramaViewer = createPanoramaViewer;
})();
