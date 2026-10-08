'use strict';
// Loaded before any game script. Lab data never reaches the user's browser storage.
window.CHARACTER_LAB = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('character-lab') === '1';
if (window.CHARACTER_LAB) {
  const memory = () => { const data = new Map(); return {
    get length(){return data.size;}, key:i=>[...data.keys()][i]??null,
    getItem:k=>data.get(String(k))??null, setItem:(k,v)=>data.set(String(k),String(v)),
    removeItem:k=>data.delete(String(k)), clear:()=>data.clear()
  }; };
  try {
    Object.defineProperty(window,'localStorage',{value:memory()});
    Object.defineProperty(window,'sessionStorage',{value:memory()});
  } catch (e) { throw new Error('Character Lab storage isolation failed: '+e.message); }
  window.ONLINE_CONFIG = {};
}
