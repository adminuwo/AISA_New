import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dashboard-dark.css'
// import './dashboard-dark.css'
import App from './App.jsx'
import { ToastProvider } from './Components/Toast/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';

import ErrorBoundary from './Components/ErrorBoundary';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || import.meta.env.AISA_GOOGLE_CLIENT_ID
  || (typeof window !== 'undefined' && window._env_?.AISA_GOOGLE_CLIENT_ID)
  || 'dummy_client_id_to_prevent_crash';

// ─── Visual Viewport Manager ───
// Fixes mobile keyboard push-up by tracking the real visible height
// and exposing it as --real-vh for use in CSS.
const VisualViewportManager = () => {
  useEffect(() => {
    const setViewportVars = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const w = vv ? vv.width : window.innerWidth;
      // --real-vh: actual visible height (shrinks when keyboard opens)
      document.documentElement.style.setProperty('--real-vh', `${h}px`);
      document.documentElement.style.setProperty('--real-vw', `${w}px`);
      // --dvh: 1% of real height, mirrors dvh unit for older browsers
      document.documentElement.style.setProperty('--dvh', `${h * 0.01}px`);
    };

    // Set immediately
    setViewportVars();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', setViewportVars);
      vv.addEventListener('scroll', setViewportVars);
    }
    window.addEventListener('resize', setViewportVars);
    window.addEventListener('orientationchange', setViewportVars);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', setViewportVars);
        vv.removeEventListener('scroll', setViewportVars);
      }
      window.removeEventListener('resize', setViewportVars);
      window.removeEventListener('orientationchange', setViewportVars);
    };
  }, []);

  return null;
};

import { MotionConfig } from 'framer-motion';

const AppTree = (
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <MotionConfig transition={{ ease: [0.22, 1, 0.36, 1] }} reducedMotion="user">
          <VisualViewportManager />
          <ToastProvider>
            <PersonalizationProvider>
              <ThemeProvider>
                <LanguageProvider>
                  <App />
                </LanguageProvider>
              </ThemeProvider>
            </PersonalizationProvider>
          </ToastProvider>
        </MotionConfig>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

// is-scrolling optimization removed — it triggered CSS repaints on ALL backdrop-blur elements
// causing severe full-screen flicker on scroll. Glassmorphism is now always GPU-rendered.

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    {AppTree}
  </GoogleOAuthProvider>
);
