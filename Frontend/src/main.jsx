import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Load all pure standard CSS stylesheets
import './index.css';
import './styles/landing.css';
import './styles/dashboard.css';
import './styles/automations.css';
import './styles/inbox.css';

/**
 * Application entry point — mounts the React tree into #root.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
