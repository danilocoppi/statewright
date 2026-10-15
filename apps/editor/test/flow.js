// What React Flow needs from a browser that jsdom lacks (after reactflow.dev/learn/advanced-use/testing): element
// sizes from their inline styles, a ResizeObserver that measures at once, and DOMMatrixReadOnly for the zoom.
class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ target, contentRect: { width: target.offsetWidth, height: target.offsetHeight } }], this);
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnly {
  constructor(transform) {
    const scale = transform?.match(/scale\(([0-9.]+)\)/)?.[1];
    this.m22 = scale === undefined ? 1 : Number(scale);
  }
}

globalThis.ResizeObserver ??= ResizeObserver;
globalThis.DOMMatrixReadOnly ??= DOMMatrixReadOnly;
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 800 },
  offsetWidth: { configurable: true, get: () => 1200 }
});
SVGElement.prototype.getBBox ??= () => ({ x: 0, y: 0, width: 0, height: 0 });
