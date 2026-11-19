import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Auto-recover from stale dynamic chunk imports following production deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error (stale deployment chunk detected). Auto-reloading page...', event);
  const reloadKey = 'vite_preload_last_reload';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 8000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

