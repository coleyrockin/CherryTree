/**
 * True if the browser can create a WebGL context. The WebGLRenderingContext
 * guard lets a UA that defines neither constructor short-circuit before it ever
 * touches a canvas. Used both by the boot gate (to avoid importing the WebGL
 * module at all) and inside the module itself.
 */
export const canUseWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
};
