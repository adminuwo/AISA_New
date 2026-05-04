import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Outlet, Navigate, BrowserRouter, useNavigate, useLocation, Link } from 'react-router-dom';

import Landing from './landingpage/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerificationForm from './pages/VerificationForm';
import Chat from './pages/Chat';
import Sidebar from './Components/SideBar/Sidebar.jsx';
import AiPersonalAssistantDashboard from './Tools/AI_Personal_Assistant/Dashboard';
import Pricing from './landingpage/Pricing';
import SocialAgentPage from './Tools/AI_Social_Media/SocialAgentPage.jsx';
import CreditUpsellPopup from './Components/CreditUpsellPopup';
import SharedChat from './pages/SharedChat';



import { AppRoute } from './types';
import { Menu, Bell, Sun, Moon, LogIn, User } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { useRecoilState, useRecoilValue } from 'recoil';
import { toggleState, getUserData, clearUser, activeModeData, activeLegalToolData, legalViewData } from './userStore/userData';
import { usePersonalization } from './context/PersonalizationContext';
import NotificationCenter from './Components/NotificationBar/NotificationCenter.jsx';
import ProfileSettingsDropdown from './Components/ProfileSettingsDropdown/ProfileSettingsDropdown.jsx';

import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import PrivacyPolicy from './landingpage/PrivacyPolicy.jsx';
import TermsOfService from './landingpage/TermsOfService.jsx';
import CookiePolicy from './landingpage/CookiePolicy.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
const AiBase = lazy(() => import('./Tools/AI_Base/AI_Base').catch(() => ({ default: () => <div className="flex h-full items-center justify-center text-subtext">AI Base Module not found.</div> })));

// Vendor Imports Removed
// import VendorLayout from './Components/Vendor/VendorLayout';
// import VendorOverview from './pages/Vendor/VendorOverview';
// ...

const SecurityAndGuidelines = lazy(() => import('./landingpage/SecurityAndGuidelines'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// ------------------------------
// Home Redirect Component
// ------------------------------
// Redirects logged-in users to chat on direct access,
// but allows them to view landing page when clicking logo from within app
const HomeRedirect = () => {
  const user = getUserData();
  const hasToken = user?.token;
  const location = useLocation();

  // Check if user came from clicking the logo (internal navigation)
  const isInternalNavigation = location.state?.fromLogo === true;

  // If user is logged in
  if (hasToken) {
    // Allow viewing landing page if they clicked the logo from within the app
    if (isInternalNavigation) {
      return <Landing />;
    }
    // Otherwise (direct URL access), redirect to chat
    return <Navigate to="/dashboard/chat" replace />;
  }

  // Non-authenticated users always see the landing page
  return <Landing />;
};

// ------------------------------
// Guest Route Component
// ------------------------------
// Protects login/signup pages - redirects authenticated users to chat
const GuestRoute = ({ children }) => {
  const user = getUserData();
  const hasToken = user?.token;

  // If user is already logged in, redirect to chat
  if (hasToken) {
    return <Navigate to="/dashboard/chat" replace />;
  }

  // Otherwise, allow access to login/signup page
  return children;
};

const AuthenticatRoute = ({ children }) => {
  return children;
}

// ------------------------------
// Dashboard Layout (Auth pages)
// ------------------------------

const MobileNotificationBell = ({ onClick }) => {
  const { notifications } = usePersonalization();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/20 text-primary"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white dark:border-black animate-bounce">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

const DashboardLayout = () => {
  const [tglState, setTglState] = useRecoilState(toggleState);
  const isSidebarOpen = tglState.sidebarOpen;
  const setIsSidebarOpen = (val) => setTglState(prev => ({ ...prev, sidebarOpen: val }));

  const location = useLocation();
  const isFullScreen = false;

  const user = getUserData() || { name: 'Guest' };
  const token = getUserData()?.token;
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const currentMode = useRecoilValue(activeModeData);
  const selectedLegalTool = useRecoilValue(activeLegalToolData);
  const legalView = useRecoilValue(legalViewData);
  const isMobile = window.innerWidth <= 768;
  // ─── Route-based Navbar Visibility Logic ───
  // Rule: Navbar is HIDDEN ONLY for 'My Case' and 'Legal Precedents'.
  // It should be VISIBLE for all other features (Draft Maker, Evidence Analyst, etc.)
  const searchParams = new URLSearchParams(location.search);
  const toolParam = searchParams.get('tool');
  const isMyCase = location.pathname === '/dashboard/cases' || toolParam === 'legal_my_case';
  const isPrecedents = toolParam === 'legal_precedents' || toolParam === 'legal_case_law_research';

  const shouldHideMobileNavbar = isMobile && (isMyCase || isPrecedents);

  // ─── Scroll Direction Logic for Auto-Hide Navbar ───
  const [isVisible, setIsVisible] = useState(true); // visible by default as per requirement
  const lastScrollYRef = useRef(0); // useRef avoids stale closure in the scroll handler
  const scrollThreshold = 15; // px

  useEffect(() => {
    const handleScroll = (e) => {
      // Only apply on mobile as per user requirement (<= 768px)
      if (window.innerWidth > 768) return;

      // Get scroll position from any scrollable element
      const target = e.target;
      const currentScrollY =
        target === document || target === document.documentElement
          ? window.scrollY
          : (target.scrollTop ?? 0);

      // Always show header when at the very top
      if (currentScrollY < 10) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollYRef.current;

      if (Math.abs(diff) > scrollThreshold) {
        setIsVisible(diff < 0); // true = scrolling up → show; false = scrolling down → hide
        lastScrollYRef.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
  }, []); // Bind once

  useEffect(() => {
    setIsVisible(true);
    lastScrollYRef.current = 0;
  }, [location.pathname]);

  // Sync CSS variable so child pages (Chat) can transition their top-padding in lockstep
  useEffect(() => {
    // Only applies below lg (1024px) — desktop uses lg:pt-6 via Tailwind class
    if (window.innerWidth < 1024) {
      document.documentElement.style.setProperty(
        '--mobile-nav-h',
        (!shouldHideMobileNavbar && isVisible) ? '64px' : '0px'
      );
    }
  }, [shouldHideMobileNavbar, isVisible]);

  return (
    <div className="fixed inset-0 flex bg-transparent text-maintext overflow-hidden aisa-scalable-text">
      {/* ─── Animated Atmospheric Background ─── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-white dark:opacity-0 transition-opacity duration-500" />
        {/* Dark mode deep black space */}
        <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(59,130,246,0.06) 0%, transparent 55%), #000000' }} />
        {/* Dark mode neural background */}
        {/* Neural background removed as per user request */}
        {/* Light mode orbs */}
        <motion.div
          animate={{ y: [0, 30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-transparent dark:bg-violet-600/6 blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, -40, 0], x: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-transparent dark:bg-blue-600/6 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-transparent dark:bg-orange-500/3 blur-[100px]"
        />
      </div>

      {!tglState.focusMode && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenSettings={() => setIsProfileMenuOpen(true)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full relative">

        {/* Unified Mobile Header (Hides when sidebar is open or on specific mobile views) */}
        {!isFullScreen && !isSidebarOpen && !tglState.focusMode && !shouldHideMobileNavbar && (
          <motion.div
            initial={false}
            animate={{
              y: isVisible ? 0 : '-100%',
              opacity: isVisible ? 1 : 0
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
            className="lg:hidden flex items-center justify-between px-6 py-3 bg-white/70 dark:bg-black/40 backdrop-blur-xl border-b border-white/10 dark:border-white/5 shrink-0 z-[1001] fixed top-0 left-0 right-0 shadow-lg shadow-black/5"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30 text-primary"
            >
              <Menu className="w-6 h-6 stroke-[2.5]" />
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30 text-primary"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {token ? (
                <div className="relative profile-menu-container">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30 text-primary overflow-hidden"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt="P" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {/* The mobile header used to render ProfileSettingsDropdown here, but it's been moved to the root to support desktop Sidebar trigger */}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate('/login')}
                  className="px-4 h-10 flex items-center justify-center bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Login
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        {/* Outlet for pages */}
        <main
          className={`flex-1 ${(location.pathname.includes('/chat') || location.pathname.includes('/cases')) ? 'overflow-hidden' : 'overflow-y-auto'} relative w-full scroll-smooth p-0 scrollbar-hide transition-all duration-300 ease-in-out`}
          style={{ paddingTop: 'var(--mobile-nav-h)' }}
        >
          <Outlet />
        </main>
      </div>
      <AnimatePresence>
        {isProfileMenuOpen && (
          <ProfileSettingsDropdown
            onClose={() => setIsProfileMenuOpen(false)}
            onLogout={() => {
              clearUser();
              navigate('/login');
              setIsProfileMenuOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ------------------------------
// Placeholder Page
// ------------------------------

const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center h-full text-subtext flex-col">
    <h2 className="text-2xl font-bold mb-2 text-maintext">{title}</h2>
    <p>Coming soon...</p>
  </div>
);

// ------------------------------
// App Router
// ------------------------------

import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from './landingpage/CookieConsentBanner';

const NavigateProvider = () => {
  const [tglState] = useRecoilState(toggleState);

  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 2500, // Reduced from default to meet user request for 2-3 sec auto-close
        }}
      />
      <CreditUpsellPopup />
      <CookieConsentBanner />
      <Routes>
        {/* Public Routes */}
        <Route path={AppRoute.LANDING} element={<Landing />} />
        <Route path={AppRoute.LOGIN} element={<GuestRoute><Login /></GuestRoute>} />
        <Route path={AppRoute.SIGNUP} element={<GuestRoute><Signup /></GuestRoute>} />

        <Route path={AppRoute.E_Verification} element={<VerificationForm />} />
        <Route path={AppRoute.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={AppRoute.RESET_PASSWORD} element={<ResetPassword />} />

        <Route path={AppRoute.PRIVACY_POLICY} element={<Landing />} />
        <Route path={AppRoute.TERMS_OF_SERVICE} element={<Landing />} />
        <Route path="/terms-of-service" element={<Navigate to={AppRoute.TERMS_OF_SERVICE} replace />} />
        <Route path={AppRoute.COOKIE_POLICY} element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/share/:shareId" element={<SharedChat />} />

        {/* Dashboard (Protected) */}
        <Route
          path={AppRoute.DASHBOARD}
          element={<DashboardLayout />}
        >
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat/:sessionId?" element={<Chat />} />
          <Route path="cases" element={<Chat />} />
          <Route path="social-agent" element={<ProtectedRoute><SocialAgentPage /></ProtectedRoute>} />
          <Route path="ai-personal-assistant" element={<ProtectedRoute><AiPersonalAssistantDashboard /></ProtectedRoute>} />
          <Route path="ai-base" element={<ProtectedRoute><Suspense fallback={<div className="flex h-full items-center justify-center">Loading AI Base...</div>}><AiBase /></Suspense></ProtectedRoute>} />

          <Route path="admin" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="security" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
              <SecurityAndGuidelines />
            </Suspense>
          } />
        </Route>


        {/* Vendor Dashboard Routes (Public for MVP/Testing) */}


        {/* Catch All */}
        <Route path="*" element={<Navigate to={AppRoute.LANDING} replace />} />
      </Routes>
    </>
  );
};

export default NavigateProvider;