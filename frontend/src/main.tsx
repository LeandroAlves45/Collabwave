/* eslint-disable react-refresh/only-export-components */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div>
      <h1>CollabWave</h1>
      <p>Frontend shell - under construction</p>
    </div>
  );
}

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
