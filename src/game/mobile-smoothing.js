import {WebGLRenderTarget, HalfFloatType, UnsignedByteType, Vector2, Vector4} from 'three';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

// Standard Three pass order: linear HDR scene -> tone mapping/sRGB -> FXAA.
// Two owned targets provide edge smoothing without mobile multisample buffers.
export class MobileSmoothing {
  constructor(renderer) {
    this.sceneTarget = new WebGLRenderTarget(1, 1, {
      type: renderer.extensions?.has('EXT_color_buffer_float') ? HalfFloatType : UnsignedByteType,
      depthBuffer: true, stencilBuffer: false, samples: 0,
    });
    this.colorTarget = new WebGLRenderTarget(1, 1, {depthBuffer: false, stencilBuffer: false, samples: 0});
    this.output = new OutputPass();
    this.fxaa = new ShaderPass(FXAAShader);
    this.fxaa.renderToScreen = true;
    this.fxaa.material.toneMapped = false;
    this.size = new Vector2();
    this.viewport = new Vector4();
    this.scissor = new Vector4();
    this.disposed = false;
  }

  resize(renderer) {
    renderer.getDrawingBufferSize(this.size);
    const w = Math.max(1, this.size.x), h = Math.max(1, this.size.y);
    if (this.sceneTarget.width !== w || this.sceneTarget.height !== h) {
      this.sceneTarget.setSize(w, h);
      this.colorTarget.setSize(w, h);
    }
    this.fxaa.uniforms.resolution.value.set(1 / w, 1 / h);
  }

  render(renderer, scene, camera) {
    if (this.disposed) return;
    this.resize(renderer);
    const previous = renderer.getRenderTarget(), scissorTest = renderer.getScissorTest();
    renderer.getViewport(this.viewport);
    renderer.getScissor(this.scissor);
    try {
      renderer.setScissorTest(false);
      renderer.setRenderTarget(this.sceneTarget);
      renderer.render(scene, camera);
      this.output.render(renderer, this.colorTarget, this.sceneTarget);
      this.fxaa.render(renderer, null, this.colorTarget);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.setViewport(this.viewport);
      renderer.setScissor(this.scissor);
      renderer.setScissorTest(scissorTest);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.sceneTarget.dispose();
    this.colorTarget.dispose();
    this.output.dispose();
    this.fxaa.dispose();
  }
}
