export const bus = new EventTarget();

let rerender = () => {};
export function setRerender(fn){ rerender = fn; }
export function triggerRender(){ try { rerender(); } catch { /* noop */ } }


