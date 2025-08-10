import { init } from './lifecycle.js';
import { setRerender } from './bus.js';
import { renderAll } from './render.js';

setRerender(()=>renderAll());
window.addEventListener('load', init);


