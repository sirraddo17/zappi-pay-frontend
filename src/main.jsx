import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { wakeServer } from './api';
import './index.css';

// Open the connection to the server (DNS + secure handshake) while the
// page is still loading, so the first real request doesn't pay for it.
try {
  const origin = new URL(import.meta.env.VITE_API_URL || 'http://localhost:4000').origin;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
} catch {
  // ignore
}

// Start waking the (free-tier) backend the moment the app opens.
wakeServer();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
