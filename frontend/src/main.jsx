import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './store/AppContext';
import { applyAdminTheme } from './lib/adminTheme';
import './index.css';
import './admin-dark.css';

/* Apply the admin theme BEFORE first paint so the panel opens in dark mode
   instantly (no light flash). AdminLogin + every admin screen is covered. */
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
