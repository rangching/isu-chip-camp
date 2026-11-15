import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { useProgress } from './features/progress/store';
import { useCfg } from './lib/cfgStore';

if (import.meta.env.DEV) Object.assign(window, { __camp: { useProgress, useCfg } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
