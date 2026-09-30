import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './styles.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider baseUrl={baseUrl}>
      <App />
    </AuthProvider>
  </StrictMode>,
);
