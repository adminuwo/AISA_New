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
// Also directly patches the #aisa-app-root container height.
const VisualViewportManager = () => {
  useEffect(() => {
    const root = document.documentElement;

    const setViewportVars = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const w = vv ? vv.width : window.innerWidth;

      // Set CSS variables (used by styled components via var(--real-vh))
      root.style.setProperty('--real-vh', `${h}px`);
      root.style.setProperty('--real-vw', `${w}px`);
      root.style.setProperty('--dvh', `${h * 0.01}px`);

      // Directly patch the main app container height for maximum reliability
      // This ensures it works on Android Chrome even without dvh/interactive-widget support
      const appRoot = document.getElementById('aisa-app-root');
      if (appRoot) {
        appRoot.style.height = `${h}px`;
        appRoot.style.maxHeight = `${h}px`;
      }
    };

    // Set immediately on mount
    setViewportVars();

    // Use a small delay after focus events (keyboard animation takes ~300ms on Android)
    let focusTimer = null;
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.contentEditable === 'true') {
        // Keyboard is opening — wait for it to settle then recalculate
        clearTimeout(focusTimer);
        focusTimer = setTimeout(setViewportVars, 350);
      }
    };
    const handleFocusOut = () => {
      // Keyboard is closing — recalculate after animation
      clearTimeout(focusTimer);
      focusTimer = setTimeout(setViewportVars, 350);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', setViewportVars);
      vv.addEventListener('scroll', setViewportVars);
    }
    window.addEventListener('resize', setViewportVars);
    window.addEventListener('orientationchange', setViewportVars);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      clearTimeout(focusTimer);
      if (vv) {
        vv.removeEventListener('resize', setViewportVars);
        vv.removeEventListener('scroll', setViewportVars);
      }
      window.removeEventListener('resize', setViewportVars);
      window.removeEventListener('orientationchange', setViewportVars);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
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
