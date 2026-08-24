import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './store/AppContext';
import { applyAdminTheme } from './lib/adminTheme';
import './index.css';
import './admin-dark.css';
import './admin-light.css';
import './admin-v2.css';
import './admin-v2-override.css';
import './admin-v3.css';

/* Apply the admin theme BEFORE first paint so the panel opens in the
   canonical white theme without a flash. Storefront is never classed. */
applyAdminTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
