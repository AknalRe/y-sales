import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/css/tailwind.css';
import '@/assets/css/global.scss';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


