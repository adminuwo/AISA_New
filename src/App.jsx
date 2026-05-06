import './App.css'
import NavigationProvider from './Navigation.Provider'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import React, { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { clearUser, setUserData, userData } from './userStore/userData'

// ─── AISA backend base URL ───────────────────────────────────────────────────
const AISA_API =
  (window._env_ && window._env_.VITE_AISA_BACKEND_API) ||
  import.meta.env.VITE_AISA_BACKEND_API ||
  'http://localhost:8081/api';

// ─── Global Axios interceptor: handle session revocation ─────────────────────
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response.data?.code === 'SESSION_REVOKED') {
      toast.error('Security Alert: You have been logged out remotely.');
      clearUser();
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    }
    return Promise.reject(error);
  }
);

/**
 * SSOHandler
 *
 * Detects ?sso_token=...&from=... on the URL (set by the AIMALL sidebar toggle).
 * Calls the AISA backend /api/auth/sso/handoff to exchange the short-lived SSO
 * token for a full AISA session JWT.
 *
 * Security:
 *  - The sso_token is only valid for 60 seconds (set by the source backend).
 *  - It uses audience claim "sso-handoff" so it cannot be replayed as a session token.
 *  - The sensitive token is stripped from the URL immediately before the API call.
 */
function SSOHandler() {
  const setUserRecoil = useSetRecoilState(userData);

  // Read params synchronously BEFORE React Router can strip them
  const ssoTokenRef = React.useRef(new URLSearchParams(window.location.search).get('sso_token'));
  const fromRef = React.useRef(new URLSearchParams(window.location.search).get('from'));

  useEffect(() => {
    const ssoToken = ssoTokenRef.current;
    const from = fromRef.current;

    if (!ssoToken) return;

    // Strip the token from the URL immediately (security hygiene)
    window.history.replaceState({}, '', window.location.pathname);

    const toastId = 'sso-auth';
    toast.loading('Signing you in…', { id: toastId });

    axios
      .post(`${AISA_API}/auth/sso/handoff`, {
        sso_token: ssoToken,
        from: from || 'unknown',
      })
      .then((res) => {
        if (res.data.token && res.data.user) {
          // Persist session using the same mechanism as regular login
          const savedUser = setUserData({ ...res.data.user, token: res.data.token });
          localStorage.setItem('token', res.data.token);
          setUserRecoil({ user: savedUser });

          toast.success(`Welcome, ${res.data.user.name}!`, { id: toastId });
          setTimeout(() => {
            window.location.href = '/dashboard/chat';
          }, 800);
        } else {
          throw new Error('Incomplete SSO response from server');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || 'SSO login failed';
        console.error('[SSO] Handoff failed:', msg);
        toast.error(msg, { id: toastId });

        // Send user back to AIMALL after failure so they aren't stranded
        setTimeout(() => {
          const fallback =
            (window._env_ && window._env_.VITE_AI_MALL) ||
            import.meta.env.VITE_AI_MALL ||
            'http://localhost:5173';
          window.location.href = fallback;
        }, 2500);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function App() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: 'ease-out-quint' });
  }, []);

  return (
    <RecoilRoot>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{ duration: 3000 }}
      />
      <SSOHandler />
      <NavigationProvider />
    </RecoilRoot>
  );
}

export default App;
