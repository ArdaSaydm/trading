window.SV = window.SV || {};

SV.store = (() => {
  let cache = {}, server = false;
  const timers = {};

  async function init() {
    try {
      if (location.protocol.startsWith('http')) {
        const r = await fetch('/api/state', { cache: 'no-store' });
        if (r.ok) { cache = await r.json(); server = true; return; }
      }
    } catch (e) {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith('seviye')) cache[k] = JSON.parse(localStorage.getItem(k));
      }
    } catch (e) {}
  }

  function get(key, def) {
    return key in cache ? JSON.parse(JSON.stringify(cache[key])) : def;
  }

  function set(key, value) {
    cache[key] = JSON.parse(JSON.stringify(value));
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    if (!server) return;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      fetch('/api/state/' + encodeURIComponent(key), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cache[key])
      }).catch(() => {});
    }, 400);
  }

  return { init, get, set, isServer: () => server };
})();
