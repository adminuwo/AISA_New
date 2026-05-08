import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Key, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { API, apis, AppRoute } from '../types';
import { setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { logo } from '../constants';
import { chatStorageService } from '../services/chatStorageService';

import loginBg from './login_bg.gif';


const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const setUserRecoil = useSetRecoilState(userDataAtom);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [socialVerifying, setSocialVerifying] = useState(null);

  // Auto-accept cookies on login — user has agreed to platform use by signing in
  const autoAcceptCookies = () => {
    if (!localStorage.getItem('aisa_cookie_consent')) {
      localStorage.setItem('aisa_cookie_consent', JSON.stringify({
        accepted: true,
        analytics: true,
        preferences: true,
        functional: true,
        essential: true,
        timestamp: new Date().toISOString()
      }));
    }
  };

  // Handle Social Auth Callback from Backend
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isSocialAuth = params.get('social_auth');
    const token = params.get('token');
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('userEmail');
    const provider = params.get('provider');
    const picture = params.get('picture');

    // sso_token is now handled globally in Navigation.Provider.jsx via SSOInterceptor

    if (isSocialAuth && token && userId) {
      toast.success(`Successfully authenticated as ${userName}!`);

      const userData = {
        id: userId,
        name: userName,
        email: userEmail,
        token: token,
        role: "user",
        plan: "Basic",
        provider: provider || "local",
        avatar: picture || ""
      };

      // Real state update & storage
      setUserData(userData);
      setUserRecoil({ user: userData });
      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);
      localStorage.setItem("provider", provider || "local");
      autoAcceptCookies();

      const from = location.state?.from || AppRoute.DASHBOARD;
      navigate(from, { replace: true });
      console.log("[LOGIN] Social auth success, initiating merge...");
      chatStorageService.mergeGuestChats();
    }
  }, [location, navigate, setUserRecoil]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setError(false);

    try {
      const payload = { email, password };
      const res = await axios.post(apis.logIn, payload);

      toast.success(t('successLogin'));
      const from = location.state?.from || AppRoute.DASHBOARD;

      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);
      autoAcceptCookies();

      navigate(from, { replace: true });
      console.log("[LOGIN] Standard login success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      setError(true);
      const errorMessage = err.response?.data?.error || err.message || t('serverError');
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true);
    setError(false);
    setMessage(null);

    try {
      // Get user info from Google using the access token
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });

      const { email, name, picture } = userInfoRes.data;

      // Send to our backend
      const res = await axios.post(apis.googleLogin, {
        credential: tokenResponse.access_token,
        email,
        name,
        picture
      });

      toast.success('Logged in with Google!');
      const from = location.state?.from || AppRoute.DASHBOARD;

      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);
      autoAcceptCookies();

      navigate(from, { replace: true });
      console.log("[LOGIN] Google login success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      setError(true);
      const errorMessage = err.response?.data?.error || 'Google login failed';
      setMessage(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError(true);
      setMessage('Google login was cancelled or failed');
    },
  });


  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#f8fafc] dark:bg-[#020617] aisa-scalable-text p-4 md:p-8">
      {/* Background Blobs - STATIC */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden text-black dark:text-white">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-primary/20 dark:bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/20 dark:bg-primary/10 blur-[100px] rounded-full" />
      </div>

      {/* Content Container - Vertically Centered */}
      <div className="relative w-full max-w-[400px] flex flex-col items-center z-50 transform -translate-y-2">

        {/* Canonical Logo - Scaled for all devices */}
        <div className="w-full flex justify-center mb-4 shrink-0">
          <img
            src={logo}
            alt="AISA™ Logo"
            className="w-[80px] sm:w-[100px] h-auto object-contain brightness-110 drop-shadow-2xl"
          />
        </div>

        {/* Main Glass Card */}
        <div className="relative w-full overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-[64px] border border-white dark:border-white/10 p-5 sm:p-6 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] text-center group/card scale-[0.9] sm:scale-100 origin-top">
          {/* Glossy Reflection Effect */}
          <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 pointer-events-none" />

          <div className="text-center mb-4 relative">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1 tracking-tighter uppercase">{t('welcomeBack')}</h2>
            <p className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">{t('signInToContinue')}</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 justify-center"
              >
                <AlertCircle className="w-3 h-3" />
                {message}
              </motion.div>
            )}
          </AnimatePresence>



          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-slate-700 dark:text-white placeholder-slate-400/70 focus:outline-none transition-all font-medium text-lg backdrop-blur-md"
                required
              />
            </div>

            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-white/5 rounded-xl py-3 pl-12 pr-12 text-slate-700 dark:text-white placeholder-slate-400/70 focus:outline-none transition-all font-medium text-lg tracking-[0.3em] backdrop-blur-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-500 transition-colors z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary rounded-xl font-bold text-sm text-white shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "LOGIN"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Secure Social Login</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Google Login Button */}
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => googleLogin()}
              disabled={googleLoading}
              className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mb-1" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Google</span>
                </>
              )}
            </motion.button>

            {/* Apple Login Button */}
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { window.location.href = apis.appleLogin; }}
              className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md"
            >
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <svg className="w-6 h-6 mb-1 fill-current text-black dark:text-white" viewBox="0 0 170 170">
                <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
              </svg>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Apple ID</span>
            </motion.button>
          </div>

          <div className="mt-4">
            <Link to="/forgot-password" opacity={0.6} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest">
              Forgot Password?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 dark:border-slate-800/50 text-[10px] font-bold text-slate-400 tracking-wide uppercase">
            No account? <Link to="/signup" className="text-primary hover:underline ml-1 uppercase font-black">Create Now</Link>
          </div>
        </div>

        <Link to="/" className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-[9px] uppercase tracking-widest transition-all">
          <ArrowLeft className="w-3 h-3" />
          {t('backToHome')}
        </Link>
      </div>

      {/* High-Fidelity Social Auth Overlay */}
      <AnimatePresence>
        {socialVerifying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8fafc]/80 dark:bg-[#020617]/90 backdrop-blur-xl"
          >
            <div className="relative p-10 max-w-[320px] w-full text-center">
              {/* Animated Glow */}
              <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />

              <div className="relative space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl border border-white/20 flex items-center justify-center relative shadow-2xl overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    {socialVerifying.provider} AUTH
                  </h3>
                  <div className="h-1 w-20 bg-primary/20 mx-auto rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                    {socialVerifying.step}
                  </p>
                </div>

                <div className="pt-4">
                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">
                    Secure SSO Connection
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
