import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './store/AppContext';
import { applyAdminTheme } from './lib/adminTheme';
import './index.css';
import './admin-dark.css';
import './admin-light.css';
/* Shell chrome (sidebar / top bar / drawer). Last on purpose: it is the only
   stylesheet that styles the shell, and it must win over the legacy escaped
   Tailwind remaps in the two theme files above. */
import './admin-shell.css';

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
