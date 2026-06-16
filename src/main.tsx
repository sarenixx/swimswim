import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AccessGate } from './app/AccessGate';
import { createAppRouter } from './app/router';
import './styles/tokens.css';
import './styles/app.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccessGate>
      <RouterProvider router={createAppRouter()} />
    </AccessGate>
  </React.StrictMode>
);
