import React, { useEffect, useState, useRef, Fragment } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import {
  User,
  LayoutGrid,
  MessageSquare,
  Bot,
  Calendar,
  Settings2,
  LogOut,
  Zap,
  X,
  Video,
  FileText,
  Headphones,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Shield,
  Sparkles,
  ChevronRight,
  Search,
  Trash2,
  Edit2,
  Check,
  Square,
  FolderPlus,
  Folder,
  FolderOpen,
  Share2,
  Briefcase,
  Gavel,
  PlusCircle,
  Database,
  Info,
  Home,
  CreditCard,
  IndianRupee,
  Scale,
  History,
  RefreshCcw
} from 'lucide-react';
import { apis, AppRoute, API } from '../../types';
import ShareModal from '../ShareModal';
import { faqs, logo } from '../../constants';
import NotificationBar from '../NotificationBar/NotificationBar.jsx';
import { useRecoilState } from 'recoil';
import { clearUser, getUserData, setUserData, toggleState, userData, sessionsData, activeProjectIdData, activeModeData, activeLegalToolData, activeProjectsData } from '../../userStore/userData';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme, useIsDark } from '../../context/ThemeContext';
import { usePersonalization } from '../../context/PersonalizationContext';
import { Menu, Transition, Dialog } from '@headlessui/react';


import { chatStorageService } from '../../services/chatStorageService';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfileSettingsDropdown from '../ProfileSettingsDropdown/ProfileSettingsDropdown.jsx';
import { getSubscriptionDetails } from '../../services/pricingService';
import { apiService } from '../../services/apiService';
import DeleteConfirmModal from '../DeleteConfirmModal.jsx';
import { useGenerationStore, selectGeneratingChatIds } from '../../userStore/useGenerationStore';
import { useShallow } from 'zustand/react/shallow';
import useCreditStore from '../../userStore/useCreditStore';
import SidebarTools from './SidebarTools';


const Sidebar = ({ isOpen, onClose, onOpenSettings }) => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isDark = useIsDark();
  const { addNotification } = usePersonalization();

  const getFlagUrl = (code) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

  const navigate = useNavigate();
  const [notifiyTgl, setNotifyTgl] = useRecoilState(toggleState);
  const [currentUserData, setUserRecoil] = useRecoilState(userData);
  const user = currentUserData.user || getUserData() || { name: "Loading...", email: "...", role: "user" };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // New States
  const [isNavigating, setIsNavigating] = useState(false);
  const [isConnectorsOpen, setIsConnectorsOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  
  // Use Global Credit Store
  const { 
    currentCredits, 
    recentTransactions, 
    syncCredits, 
    fetchHistory,
    isLoading: isCreditsLoading 
  } = useCreditStore();


  const [sessions, setSessions] = useRecoilState(sessionsData);
  const { sessionId } = useParams();
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || 'new');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [planName, setPlanName] = useState("Free Plan");

  // --- Project State ---
  const [projects, setProjects] = useRecoilState(activeProjectsData);
  const [currentProjectId, setCurrentProjectId] = useRecoilState(activeProjectIdData);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [renameProjectName, setRenameProjectName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
  const [isCasesExpanded, setIsCasesExpanded] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentShareId, setCurrentShareId] = useState('');
  const [sessionToShare, setSessionToShare] = useState(null);
  const [currentMode, setMode] = useRecoilState(activeModeData);
  const [expandedHistoryGroups, setExpandedHistoryGroups] = useState({});

  // ── Live generation status ──────────────────────────────────────
  // Subscribe to the global generation store so generating chats show live dots
  const generatingChatIds = useGenerationStore(useShallow(selectGeneratingChatIds));

  const toggleHistoryGroup = (groupKey) => {
    setExpandedHistoryGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };
  const [, setLegalTool] = useRecoilState(activeLegalToolData);

  // Magic Glow State
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const sidebarRef = useRef(null);

  const handleSidebarMouseMove = (e) => {
    if (!sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  };

  // Check if current user is admin
  const token = getUserData()?.token;
  const userEmail = user?.email || getUserData()?.email;
  const isAdmin = token && userEmail === 'admin@uwo24.com';

  const issueCategories = t('issueCategories') || {};
  const issueOptions = [
    issueCategories.generalInquiry || "General Inquiry",
    issueCategories.paymentIssue || "Payment Issue",
    issueCategories.refundRequest || "Refund Request",
    issueCategories.technicalSupport || "Technical Support",
    issueCategories.accountAccess || "Account Access",
    issueCategories.other || "Other"
  ];

  const handleLogout = () => {
    localStorage.clear();
    setUserRecoil({ user: null }); // Clear Recoil state to ensure UI reacts immediately
    navigate(AppRoute.LANDING);
  };

  useEffect(() => {
    if (token) {
      axios.get(apis.user, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then((res) => {
        if (res.data) {
          const mergedData = setUserData(res.data);
          setUserRecoil({ user: mergedData });
        }
      }).catch((err) => {
        console.error(err);
        if (err.status == 401) clearUser();
      });
    }

    if (token) {
      getSubscriptionDetails().then(data => {
        if (data.founderStatus) {
          setPlanName("Founder");
        } else if (data.subscription?.planId?.planName) {
          setPlanName(data.subscription.planId.planName);
        } else {
          setPlanName("Free Plan");
        }
      }).catch(err => console.log(err));
    }
  }, [token]);

  useEffect(() => {
    if (isCreditsOpen && token) {
      fetchHistory();
    }
  }, [isCreditsOpen, token]);

  // Sync credits initially and set up periodic sync
  useEffect(() => {
    if (token) {
      syncCredits();
      const interval = setInterval(syncCredits, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [token]);

  // Fetch projects for logged-in users
  useEffect(() => {
    if (token) {
      apiService.getProjects().then(data => {
        const projectsData = Array.isArray(data) ? data : [];
        setProjects(projectsData);

        // Check for hearing reminders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        projectsData.forEach(p => {
          if (p.isLegalCase && p.hearings) {
            p.hearings.forEach(h => {
              if (h.status !== 'Upcoming') return;
              const hDate = new Date(h.date);
              hDate.setHours(0, 0, 0, 0);

              if (hDate.getTime() === today.getTime()) {
                addNotification({
                  title: `Hearing Today: ${p.name}`,
                  desc: `Scheduled for ${h.time || 'today'} at ${h.courtName || 'Court'}.`,
                  type: 'alert'
                });
              } else if (hDate.getTime() === tomorrow.getTime()) {
                addNotification({
                  title: `Upcoming Hearing Tomorrow`,
                  desc: `Case: ${p.name}. Location: ${h.location || h.courtName || 'Scheduled Court'}.`,
                  type: 'info'
                });
              }
            });
          }
        });
      }).catch(err => console.error("Failed to fetch projects:", err));
    }
  }, [token]);

  // Fetch chat sessions — re-fetch when projectId or searchQuery changes
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // If searching, we fetch all sessions to allow "any chat" search as requested
        // otherwise, we only fetch for the current project
        const data = await chatStorageService.getSessions(searchQuery ? null : currentProjectId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };

    if (searchQuery) {
      const timer = setTimeout(fetchSessions, 400); // 400ms debounce
      return () => clearTimeout(timer);
    } else {
      fetchSessions();
    }

    // Listen for merge completion to refetch database sessions
    const handleMergeComplete = () => {
      console.log("[SIDEBAR] Merge complete event received, refetching sessions...");
      fetchSessions();
    };
    window.addEventListener('chat-merge-complete', handleMergeComplete);
    return () => window.removeEventListener('chat-merge-complete', handleMergeComplete);
  }, [token, sessionId, setSessions, currentProjectId, searchQuery]);

  // Auto-expand projects if search matches a project name
  useEffect(() => {
    if (searchQuery && projects.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
      setIsProjectsExpanded(true);
    }
  }, [searchQuery, projects]);

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary/20 text-primary border-b border-primary/50 rounded-sm px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    setCurrentSessionId(sessionId || 'new');
  }, [sessionId]);

  // Persist currentProjectId to localStorage
  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('currentProjectId', currentProjectId);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  }, [currentProjectId]);

  const handleCreateProject = async (isLegal = false) => {
    if (!newProjectName.trim()) {
      setIsCreatingProject(false);
      setIsCreatingCase(false);
      return;
    }

    try {
      const newCase = await apiService.createProject({
        name: newProjectName.trim(),
        isLegalCase: isLegal
      });
      setProjects(prev => [newCase, ...prev]);
      setCurrentProjectId(newCase._id);

      if (isLegal) {
        setIsCasesExpanded(true);
      } else {
        setIsProjectsExpanded(true);
      }

      setIsCreatingProject(false);
      setIsCreatingCase(false);
      setNewProjectName('');
      toast.success(isLegal ? t('caseCreated') : t('projectCreated'));
      navigate('/dashboard/chat/new');
    } catch (err) {
      console.error("Failed to create:", err);
      toast.error(isLegal ? t('failedToCreateCase') : t('failedToCreateProject'));
    }
  };

  const handleNewChat = () => {
    // Reset to global context immediately
    setCurrentProjectId('default');
    setMode('NORMAL_CHAT');
    setLegalTool(null);

    // Navigate to fresh chat with forceGlobal flag to ensure deep context reset in Chat component
    navigate('/dashboard/chat/new', { state: { forceGlobal: true } });
    if (onClose) onClose();
  };


  const handleDeleteSession = async (e, sessionIdToDelete) => {
    e.stopPropagation();
    try {
      await chatStorageService.deleteSession(sessionIdToDelete);
      // Clean up global generation state for this chat
      useGenerationStore.getState().clearGeneration(sessionIdToDelete);
      
      const updatedSessions = await chatStorageService.getSessions(currentProjectId);
      setSessions(updatedSessions);
      if (currentSessionId === sessionIdToDelete) {
        navigate('/dashboard/chat/new');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.sessionId);
    setNewTitle(session.title || "New Chat");
  };

  const handleRename = async (e, sessionId) => {
    e.stopPropagation();
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    const oldSessions = Array.isArray(sessions) ? [...sessions] : [];
    const renamedTitle = newTitle.trim();

    setSessions(prev => (Array.isArray(prev) ? prev : []).map(s =>
      s.sessionId === sessionId
        ? { ...s, title: renamedTitle, lastModified: Date.now() }
        : s
    ).sort((a, b) => b.lastModified - a.lastModified));

    try {
      const success = await chatStorageService.updateSessionTitle(sessionId, renamedTitle);
      if (success) {
        toast.success(t('chatRenamed'));
      } else {
        throw new Error("Failed to sync rename to server");
      }
    } catch (err) {
      console.error("Rename failed:", err);
      toast.error(t('couldNotRenameChat'));
      setSessions(oldSessions);
    } finally {
      setEditingSessionId(null);
    }
  };

  const handleShareSession = async (e, session) => {
    e.stopPropagation();
    const shareToast = toast.loading("Generating share link...");
    try {
      const response = await chatStorageService.shareSession(session.sessionId);
      if (response.success) {
        setCurrentShareId(response.shareId);
        setSessionToShare(session);
        setIsShareModalOpen(true);
        toast.dismiss(shareToast);
      } else {
        throw new Error("Failed to generate share link");
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Could not generate share link. Please try again.", { id: shareToast });
    }
  };

  // --- Project Handlers ---
  const handleRenameProject = async (e, projectId) => {
    e.stopPropagation();
    if (!renameProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }

    try {
      const updated = await apiService.renameProject(projectId, renameProjectName.trim());
      setProjects(prev => prev.map(p => p._id === projectId ? { ...p, name: updated.name } : p));
      const isCase = projects.find(p => p._id === projectId)?.isLegalCase;
      toast.success(isCase ? t('caseRenamedSuccessfully') : t('projectRenamedSuccessfully'));
    } catch (error) {
      console.error("Failed to rename project:", error);
      const isCase = projects.find(p => p._id === projectId)?.isLegalCase;
      toast.error(isCase ? t('failedToRenameCase') : t('failedToRenameProject'));
    } finally {
      setEditingProjectId(null);
    }
  };

  const handleDeleteProject = (e, projectId) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    const isCase = projects.find(p => p._id === projectToDelete)?.isLegalCase;
    try {
      await apiService.deleteProject(projectToDelete);
      setProjects(prev => prev.filter(p => p._id !== projectToDelete));
      if (currentProjectId === projectToDelete) {
        handleSwitchProject(null);
      }
      toast.success(isCase ? t('caseDeletedSuccessfully') : t('projectDeletedSuccessfully'));
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error(isCase ? t('failedToDeleteCase') : t('failedToDeleteProject'));
    } finally {
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleSwitchProject = (projectId) => {
    setCurrentProjectId(projectId);
    const p = projects.find(proj => proj._id === projectId);
    if (p?.isLegalCase) {
      navigate(`/dashboard/case/${projectId}`);
    } else {
      navigate('/dashboard/chat/new');
    }
    if (onClose) onClose();
  };

  const currentProject = projects.find(p => p._id === currentProjectId);




  return (
    <>
      <AnimatePresence>
        {notifiyTgl.notify && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className='fixed w-full z-10 flex justify-center items-center mt-5 ml-6'
          >
            <NotificationBar msg={"Successfully Owned"} />
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`fixed inset-0 z-[1990] backdrop-blur-[6px] lg:hidden animate-in fade-in duration-300
            ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}
        />
      )}

      <div
        ref={sidebarRef}
        onMouseMove={handleSidebarMouseMove}
        className={`
          fixed inset-y-0 left-0 z-[2000] w-[280px] sm:w-72 lg:w-[280px] 
          sidebar-glass flex flex-col transition-all duration-500 ease-in-out 
          lg:relative lg:translate-x-0 
          bg-white dark:bg-[#0f172a] lg:bg-transparent
          shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]
          lg:shadow-none overflow-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >

        {/* Animated Background Glow Spots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20 transition-opacity duration-500">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/30 blur-[100px] animate-float-slow" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-primary/30 blur-[100px] animate-float-slow" style={{ animationDelay: '-5s' }} />
        </div>
        {/* Brand & Top Actions */}
        <div className="p-5 pb-2 mb-2 flex flex-col gap-4 relative z-10 border-b border-white/5 lg:border-none">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-nowrap">
              <Link to="/" state={{ fromLogo: true }} className="group/logo flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                  <img
                    src={logo}
                    alt="AISA™"
                    className="h-8 w-auto relative z-10 transition-transform duration-500 group-hover/logo:scale-110"
                  />
                </div>
                <span className="text-lg font-black tracking-tighter whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: '"Times New Roman", Times, serif' }}>
                  AISA<span style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>TM</span>
                </span>
              </Link>

              {/* AISA/MALL Toggle - Now side-by-side */}
              <div className="flex items-center relative z-10 bg-black/5 border border-[#9333ea]/30 rounded-full p-0.5 w-fit h-7">
                <motion.div
                  className="absolute top-0.5 bottom-0.5 left-0.5 w-[46px] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.1)] z-0"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #60a5fa 100%)' }}
                  initial={false}
                  animate={{
                    x: isNavigating ? 46 : 0
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
                <button
                  onClick={() => {
                    setIsNavigating(false);
                    navigate('/dashboard/chat/new');
                    if (onClose) onClose();
                  }}
                  className={`relative z-10 w-[46px] flex justify-center items-center text-[9px] font-bold transition-colors ${!isNavigating ? 'text-white' : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-[#8B5CF6]')}`}
                >
                  AISA
                </button>
                <button
                  onClick={async () => {
                    const targetUrl = (window._env_ && window._env_.VITE_AI_MALL) || import.meta.env.VITE_AI_MALL;
                    if (!targetUrl) return;
                    const sessionToken = getUserData()?.token || localStorage.getItem('token');
                    if (!sessionToken) { window.location.href = targetUrl; return; }
                    setIsNavigating(true);
                    try {
                      const { data } = await axios.post(apis.ssoGenerate, {}, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
                      const base = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                      window.location.href = `${base}/dashboard/marketplace?sso_token=${encodeURIComponent(data.sso_token)}&from=aisa`;
                    } catch (err) {
                      setIsNavigating(false);
                      window.location.href = targetUrl;
                    }
                  }}
                  className={`relative z-10 w-[46px] flex justify-center items-center text-[9px] font-bold transition-colors ${isNavigating ? 'text-white' : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-[#8B5CF6]')}`}
                >
                  MALL
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`lg:hidden p-2 rounded-xl transition-all border shadow-sm active:scale-95
                ${isDark
                  ? 'text-subtext hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  : 'text-slate-500 hover:text-primary bg-slate-100 hover:bg-slate-200 border-slate-200'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Chat History Section */}
        <div className="flex-1 flex flex-col overflow-hidden">


          <AnimatePresence>
            {isCreatingProject && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsCreatingProject(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <FolderPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-maintext">{t('newProject')}</h3>
                      <p className="text-xs text-subtext">{t('organizeChatsByProject')}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder={t('projectName')}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setIsCreatingProject(false);
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-subtext/50 text-maintext"
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setIsCreatingProject(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-subtext hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => handleCreateProject(false)}
                      disabled={!newProjectName.trim()}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t('create')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Search Bar */}
          <div className="px-5 pt-2 relative z-10">
            <div className="relative group/search">
              <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-focus-within/search:opacity-100 transition-opacity pointer-events-none" />
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-subtext/60' : 'text-slate-500'} group-focus-within/search:text-primary group-focus-within/search:scale-110 transition-all duration-300`} />
              <input
                type="text"
                placeholder={t('findASession')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full backdrop-blur-3xl border focus:ring-[6px] rounded-[20px] py-3 pl-11 pr-4 text-sm outline-none transition-all font-semibold shadow-sm 
                  ${isDark
                    ? 'bg-black/40 border-white/10 focus:border-primary/50 focus:bg-black/60 focus:ring-primary/10 placeholder:text-subtext/40 text-white'
                    : 'bg-white/80 border-slate-200 focus:border-primary/40 focus:bg-white focus:ring-primary/10 placeholder:text-slate-500 text-slate-900 shadow-inner'}`}
              />
            </div>
          </div>



          <div className="px-5 pt-3 pb-2 relative z-10">
            <button
              onClick={handleNewChat}
              className="w-full relative overflow-hidden group p-[1px] rounded-[16px] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] bg-[#a78bfa] shadow-[0_10px_25px_rgba(167,139,250,0.25),0_0_15px_rgba(96,165,250,0.15)]"
            >
              {/* Main Gradient Background - Lighter Version */}
              <div 
                className="absolute inset-0 transition-opacity duration-500 bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#60a5fa]" 
                style={{ backgroundSize: '100% 100%' }}
              />
              
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-70 pointer-events-none" />
              
              {/* Inner Content */}
              <div className="relative flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-sm rounded-[15px] group-hover:bg-white/10 transition-all duration-500">
                <Plus className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-700" strokeWidth={3} />
                <span className="font-black text-[13px] tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">{t('newChat')}</span>
              </div>
              
              {/* Hover Glow Edge */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] translate-x-[-100%] group-hover:translate-x-[100%] transform" style={{ transitionDuration: '1.2s' }} />
            </button>
          </div>


          {/* Personal Space & Projects Section */}
          {token && (
            <div className="flex flex-col">



              {/* Projects Section Header */}
              <div
                onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                className="px-5 pt-4 pb-2 flex items-center justify-between cursor-pointer group/header select-none relative z-10"
              >
                <div className="flex items-center gap-2">
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] group-hover/header:text-primary transition-colors 
                    ${isDark ? 'text-subtext/60' : 'text-slate-900'}`}>PROJECTS</h3>
                  <div className={`h-[1px] w-8 transition-all group-hover/header:w-12 group-hover/header:bg-primary/30 
                    ${isDark ? 'bg-subtext/20' : 'bg-slate-300'}`}></div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-subtext/40 transition-transform duration-300 ${isProjectsExpanded ? '' : '-rotate-90'}`} />
              </div>

              <AnimatePresence>
                {isProjectsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "circOut" }}
                    className="space-y-1 relative z-10"
                  >
                    {/* Create New Project Button */}
                    <button
                      onClick={() => setIsCreatingProject(true)}
                      className={`mx-3 px-3 py-2 rounded-lg flex items-center gap-2.5 cursor-pointer transition-all w-[calc(100%-24px)] mb-1 group/create ${theme === 'dark' ? 'hover:bg-primary/10 text-primary' : 'hover:bg-primary/5 text-primary'}`}
                    >
                      <span className="text-[13px] font-bold">Create New Project</span>
                    </button>
                    {/* Regular Projects List */}
                    {projects.filter(p => !p.isLegalCase).map((p, idx) => (
                      <div key={p._id} className="relative group/proj flex items-center mx-3">
                        {editingProjectId === p._id ? (
                          <div className="flex w-full items-center gap-2 px-3 py-1.5">
                            <input
                              autoFocus
                              value={renameProjectName}
                              onChange={e => setRenameProjectName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(e, p._id); if (e.key === 'Escape') setEditingProjectId(null); }}
                              className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-xs text-maintext py-1"
                            />
                            <button onClick={(e) => handleRenameProject(e, p._id)} className="text-primary"><Check className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSwitchProject(p._id)}
                              className={`flex-1 flex items-center min-w-0 gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${currentProjectId === p._id ? 'bg-primary/10 text-primary font-bold' : 'text-subtext hover:bg-white/10 hover:text-maintext'}`}
                            >
                              <Folder className="w-4 h-4 shrink-0" />
                              <span className="truncate text-[13px]">{p.name}</span>
                            </button>
                            <div className="absolute right-1 opacity-0 group-hover/proj:opacity-100 flex items-center gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(p._id); setRenameProjectName(p.name); }} className="p-1 hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={(e) => handleDeleteProject(e, p._id)} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* CASES Nested Folder Item */}
                    <div
                      onClick={(e) => { e.stopPropagation(); setIsCasesExpanded(!isCasesExpanded); }}
                      className={`mx-3 px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-all ${isDark ? 'hover:bg-white/5 text-subtext/80' : 'hover:bg-slate-100 text-slate-900 border border-transparent shadow-sm'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FolderOpen className={`w-4 h-4 text-primary transition-transform duration-300 ${isCasesExpanded ? 'scale-110' : ''}`} />
                        <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isDark ? 'text-subtext/90' : 'text-slate-900'}`}>CASES</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isCasesExpanded ? '' : '-rotate-90'} ${isDark ? 'text-subtext/40' : 'text-slate-400'}`} />
                    </div>

                    <AnimatePresence>
                      {isCasesExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pl-6 space-y-1 overflow-hidden"
                        >
                          {/* Create New Case Button */}
                          <button
                            onClick={() => setIsCreatingCase(true)}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 cursor-pointer transition-all w-full mb-1 group/createCase ${theme === 'dark' ? 'hover:bg-primary/10 text-primary' : 'hover:bg-primary/5 text-primary'}`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span className="text-[12px] font-bold">Create New Case</span>
                          </button>

                          {isCreatingCase && (
                            <div className="px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 mb-2 mr-3">
                              <input
                                autoFocus
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateProject(true);
                                  if (e.key === 'Escape') {
                                    setIsCreatingCase(false);
                                    setNewProjectName('');
                                  }
                                }}
                                onBlur={() => {
                                  if (!newProjectName.trim()) setIsCreatingCase(false);
                                }}
                                placeholder="Case name..."
                                className="w-full bg-transparent border-0 outline-none text-[12px] text-maintext py-1"
                              />
                            </div>
                          )}

                          {projects
                            .filter(p => p.isLegalCase && (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((p, idx) => (
                              <motion.div
                                key={p._id}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative group/proj flex items-center"
                              >
                                {editingProjectId === p._id ? (
                                  <div className="flex w-full items-center gap-2 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      autoFocus
                                      value={renameProjectName}
                                      onChange={e => setRenameProjectName(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(e, p._id); if (e.key === 'Escape') setEditingProjectId(null); }}
                                      className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-xs text-maintext py-1"
                                    />
                                    <button onClick={(e) => handleRenameProject(e, p._id)} className="text-primary hover:opacity-80 shrink-0"><Check className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }} className="text-subtext hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleSwitchProject(p._id)}
                                      className={`flex-1 flex items-center min-w-0 gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${currentProjectId === p._id
                                        ? 'bg-primary/10 text-primary font-bold shadow-sm'
                                        : 'text-subtext hover:bg-white/20 dark:hover:bg-white/10 hover:text-maintext'}`}
                                    >
                                      <Folder className={`w-4 h-4 shrink-0 transition-transform duration-300 ${currentProjectId === p._id ? 'scale-110 text-primary ring-4 ring-primary/10 rounded-full' : 'group-hover/proj:scale-110'}`} />
                                      <div className="flex flex-col items-start min-w-0 pr-4">
                                        <span className="truncate font-bold text-[13px] text-left">{highlightMatch(p.name, searchQuery)}</span>
                                        {(() => {
                                          const today = new Date(); today.setHours(0, 0, 0, 0);
                                          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                                          const hasToday = p.hearings?.some(h => new Date(h.date).toDateString() === today.toDateString() && h.status === 'Upcoming');
                                          if (hasToday) return <span className="text-[8px] font-black uppercase text-red-500 animate-pulse">🔴 Hearing Today</span>;
                                          const hasTomorrow = p.hearings?.some(h => new Date(h.date).toDateString() === tomorrow.toDateString() && h.status === 'Upcoming');
                                          if (hasTomorrow) return <span className="text-[8px] font-black uppercase text-amber-500">🟠 Tomorrow</span>;
                                          return null;
                                        })()}
                                      </div>
                                    </button>
                                    <div className="absolute right-2 opacity-0 group-hover/proj:opacity-100 flex items-center gap-1 transition-all duration-300 translate-x-2 group-hover/proj:translate-x-0">
                                      <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(p._id); setRenameProjectName(p.name); }} className="p-1.5 text-subtext hover:text-primary transition-all bg-white/10 rounded-lg border border-white/5 shadow-sm">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={(e) => handleDeleteProject(e, p._id)} className="p-1.5 text-subtext hover:text-red-500 transition-all bg-white/10 rounded-lg border border-white/5 shadow-sm">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto px-5 space-y-1 relative z-10 custom-scrollbar mt-2">
            {(() => {
              const hasHistory = Array.isArray(sessions) && sessions.length > 0;

              return (
                <>
                  <div className="px-1 py-4 flex items-center justify-between">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-subtext/40' : 'text-slate-500'}`}>
                      {token ? t('activityLog') : 'Guest History'}
                    </h3>
                    <div className={`h-[1px] flex-1 ml-4 ${isDark ? 'bg-gradient-to-r from-subtext/10 to-transparent' : 'bg-gradient-to-r from-slate-300 to-transparent'}`}></div>
                  </div>

                  {!hasHistory && !token && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-50 px-6 text-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-[10px] text-subtext">{t('loginToSaveHistory')}</p>
                    </div>
                  )}

                  {!hasHistory && token && (
                    <div className="px-4 text-xs text-subtext italic">{t('noRecentChats') || 'No recent chats'}</div>
                  )}

                  {hasHistory && (
                    (() => {
                      const filteredSessions = sessions.filter(session =>
                        session.title?.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (filteredSessions.length === 0) return null;

                      const groupedSessions = filteredSessions.reduce((acc, session) => {
                        const date = new Date(session.lastModified || session.updatedAt || session.createdAt || new Date());
                        date.setHours(0, 0, 0, 0);

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);

                        let groupKey = '';
                        if (date.getTime() === today.getTime()) {
                          groupKey = 'Today';
                        } else if (date.getTime() === yesterday.getTime()) {
                          groupKey = 'Yesterday';
                        } else {
                          groupKey = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        }

                        if (!acc[groupKey]) acc[groupKey] = [];
                        acc[groupKey].push(session);
                        return acc;
                      }, {});

                      const sortedGroupKeys = Object.keys(groupedSessions).sort((a, b) => {
                        if (a === 'Today') return -1;
                        if (b === 'Today') return 1;
                        if (a === 'Yesterday') return -1;
                        if (b === 'Yesterday') return 1;
                        return new Date(b) - new Date(a);
                      });

                      return sortedGroupKeys.map(groupKey => (
                        <div key={groupKey} className="mb-3">
                          {groupKey !== 'Today' && (
                            <button
                              onClick={() => toggleHistoryGroup(groupKey)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 mb-1 group transition-colors rounded-lg ${isDark ? 'text-subtext/60 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest">{groupKey}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedHistoryGroups[groupKey] ? 'rotate-180' : ''}`} />
                            </button>
                          )}

                          <AnimatePresence initial={false}>
                            {(groupKey === 'Today' || expandedHistoryGroups[groupKey]) && (
                              <motion.div
                                initial={groupKey === 'Today' ? false : { height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden flex flex-col"
                              >
                                {groupedSessions[groupKey].map((session, idx) => (
                                  <motion.div
                                    key={session.sessionId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.02, duration: 0.3 }}
                                    className="group relative"
                                  >
                                    {editingSessionId === session.sessionId ? (
                                      <div className="flex items-center gap-3 px-4 py-4 bg-white/5 rounded-2xl border border-primary/40 shadow-2xl mx-2">
                                        <input
                                          autoFocus
                                          type="text"
                                          value={newTitle}
                                          onChange={(e) => setNewTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(e, session.sessionId);
                                            if (e.key === 'Escape') setEditingSessionId(null);
                                          }}
                                          className="bg-transparent text-[14px] font-bold text-maintext w-full outline-none"
                                        />
                                        <button
                                          onClick={(e) => handleRename(e, session.sessionId)}
                                          className="text-primary hover:scale-125 transition-transform shrink-0"
                                        >
                                          <Check className="w-5 h-5" strokeWidth={3} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="sidebar-chat-container relative">
                                        <NavLink
                                          to={`/dashboard/chat/${session.sessionId}`}
                                          onClick={onClose}
                                          className={({ isActive }) => `sidebar-chat-item group/item transition-all duration-500 mx-2 cursor-pointer
                                        ${isActive
                                              ? (isDark ? 'bg-white/[0.08] text-white border border-white/10 shadow-2xl backdrop-blur-3xl' : 'bg-white text-primary border border-primary/20 shadow-lg shadow-primary/10 backdrop-blur-3xl ring-4 ring-primary/5')
                                              : (isDark ? 'text-subtext/60 hover:bg-white/[0.04] hover:text-white border border-transparent' : 'text-slate-700 hover:bg-white hover:text-slate-900 border border-transparent hover:shadow-md hover:scale-[1.01]')
                                            }
                                      `}
                                        >
                                          {currentSessionId === session.sessionId && (
                                            <motion.div
                                              layoutId="activeIndicator"
                                              className="absolute left-1 top-4 bottom-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                            />
                                          )}
                                          <div className="sidebar-chat-title-group text-left flex-1 min-w-0">
                                            <div className="sidebar-chat-title flex items-center gap-1.5">
                                              {/* ── Icon Selection ── */}
                                              {session.activeTool?.startsWith('legal_') ? (() => {
                                                const tool = session.activeTool.toLowerCase();
                                                if (tool.includes('precedent') || tool.includes('gavel')) return <Gavel className="w-3.5 h-3.5 text-purple-500 shrink-0" strokeWidth={2.5} />;
                                                if (tool.includes('draft') || tool.includes('agreement')) return <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" strokeWidth={2.5} />;
                                                if (tool.includes('evidence')) return <Search className="w-3.5 h-3.5 text-purple-500 shrink-0" strokeWidth={2.5} />;
                                                if (tool.includes('case')) return <Briefcase className="w-3.5 h-3.5 text-purple-500 shrink-0" strokeWidth={2.5} />;
                                                return <Scale className="w-3.5 h-3.5 text-purple-500 shrink-0" strokeWidth={2.5} />;
                                              })() : (
                                                <MessageSquare className="w-3.5 h-3.5 text-primary/50 shrink-0" strokeWidth={2} />
                                              )}
                                              
                                              {/* ── Live Generation Indicator ── */}
                                              {generatingChatIds.includes(session.sessionId) && (
                                                <span
                                                  title="Generating response..."
                                                  className="flex items-center gap-[3px] shrink-0"
                                                >
                                                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                                                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                                                </span>
                                              )}
                                              <span className="truncate">
                                                {highlightMatch(session.title || "Untitled Intelligence", searchQuery)}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                              {/* ── AI LEGAL Badge ── */}
                                              {session.activeTool?.startsWith('legal_') && (
                                                <div className="flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-purple-500/10 border border-purple-500/20">
                                                  <span className="text-[8px] font-black text-purple-500 uppercase tracking-tighter">AI LEGAL</span>
                                                  <span className="text-[8px] font-bold text-purple-400/70 truncate max-w-[80px]">
                                                    {session.activeTool.replace('legal_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                  </span>
                                                </div>
                                              )}

                                              {/* ── Project Badge ── */}
                                              {session.projectId && (
                                                <div className="flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-primary/10 border border-primary/20">
                                                  <Folder className="w-2.5 h-2.5 text-primary" />
                                                  <span className="text-[9px] font-bold text-primary truncate max-w-[60px]">
                                                    {projects.find(p => p._id === session.projectId)?.name || "Personal"}
                                                  </span>
                                                </div>
                                              )}

                                              {/* ── Timestamp Removed ── */}
                                            </div>
                                          </div>

                                          <div className="sidebar-chat-actions">
                                            {generatingChatIds.includes(session.sessionId) ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  useGenerationStore.getState().abortGeneration(session.sessionId);
                                                }}
                                                className="sidebar-chat-action-btn stop-btn text-red-500 hover:text-red-600 bg-red-500/10 rounded-lg p-1 animate-pulse"
                                                title="Stop Generation"
                                              >
                                                <Square className="w-2.5 h-2.5 fill-current" />
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); startRename(e, session); }}
                                                className="sidebar-chat-action-btn"
                                                title="Rename Chat"
                                              >
                                                <Edit2 />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteSession(e, session.sessionId); }}
                                              className="sidebar-chat-action-btn delete"
                                              title="Delete Chat"
                                            >
                                              <X />
                                            </button>
                                          </div>
                                        </NavLink>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ));
                    })()
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Bottom Utils */}
        <div className="p-4 border-t border-white/5 relative z-20 space-y-3">




          <div className="px-2 py-4 border-t border-white/5 relative z-20">
            {isAdmin && (
              <button
                onClick={() => { navigate('/dashboard/admin'); onClose(); }}
                className="w-full h-10 flex items-center justify-center gap-2 mb-5 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-all text-[10px] font-black uppercase tracking-widest border border-primary/20 active:scale-95"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t('admin')}</span>
              </button>
            )}

            <div className={`grid ${token ? 'grid-cols-3' : 'grid-cols-2'} gap-1 px-1`}>
              {token ? (
                <>
                  <button
                    onClick={() => setIsConnectorsOpen(true)}
                    className="flex flex-col items-center gap-2 transition-all active:scale-95 group/fbtn"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/10 transition-all hover:bg-primary/30 hover:scale-110 active:scale-90 shadow-sm">
                      <LayoutGrid className="w-4 h-4 text-primary transition-colors" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-black text-primary/70 uppercase tracking-tight group-hover/fbtn:text-primary transition-colors">Connectors</span>
                  </button>

                  <button
                    onClick={() => setIsCreditsOpen(true)}
                    className="flex flex-col items-center gap-2 transition-all active:scale-95 group/fbtn"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/10 transition-all hover:bg-primary/30 hover:scale-110 active:scale-90 shadow-sm">
                      <CreditCard className="w-4 h-4 text-primary transition-colors" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-black text-primary/70 uppercase tracking-tight group-hover/fbtn:text-primary transition-colors">Credits</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex flex-col items-center gap-2 transition-all active:scale-95 group/fbtn"
                >
                  <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/10 transition-all hover:bg-primary/30 hover:scale-110 active:scale-90 shadow-sm">
                    <IndianRupee className="w-4 h-4 text-primary transition-colors" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-black text-primary/70 uppercase tracking-tight group-hover/fbtn:text-primary transition-colors">Pricing</span>
                </button>
              )}

              <button
                onClick={onOpenSettings}
                className="flex flex-col items-center gap-2 transition-all active:scale-95 group/fbtn"
              >
                <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/10 transition-all hover:bg-primary/30 hover:scale-110 active:scale-90 shadow-sm">
                  <Settings2 className="w-4 h-4 text-primary transition-colors" strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-primary/70 uppercase tracking-tight group-hover/fbtn:text-primary transition-colors">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteProject}
        title={projects.find(p => p._id === projectToDelete)?.isLegalCase ? t('deleteCaseTitle') : t('deleteProjectTitle')}
        description={projects.find(p => p._id === projectToDelete)?.isLegalCase ? t('deleteCaseDesc') : t('deleteProjectDesc')}
        confirmText={projects.find(p => p._id === projectToDelete)?.isLegalCase ? t('deleteCaseLabel') : t('deleteProjectLabel')}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareId={currentShareId}
        sessionTitle={sessionToShare?.title || "Shared Chat"}
      />

      {/* Credits Modal */}
      <Transition appear show={isCreditsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[2000]" onClose={() => setIsCreditsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-8 text-left align-middle shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-maintext">Credits & Usage</h3>
                    <button onClick={() => setIsCreditsOpen(false)} className="text-subtext hover:text-maintext p-1 rounded-lg hover:bg-black/5 transition-all"><X size={20} /></button>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t('currentPlan')}</h4>
                      <h2 className="text-3xl font-black mb-4">{planName}</h2>
                      <div className="flex items-center justify-between bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div>
                          <p className="text-[10px] font-bold text-subtext uppercase tracking-wider">{t('availableCredits')}</p>
                          <p className="text-2xl font-black text-primary">{currentCredits}</p>
                        </div>
                        <button onClick={() => { window.location.href = '/pricing'; }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg">Buy More</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('recentCreditUsage')}</h4>
                        {isCreditsLoading && <RefreshCcw size={12} className="text-primary animate-spin" />}
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {recentTransactions.length > 0 ? recentTransactions.map(log => (
                          <div key={log._id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-white/5 hover:bg-white/10 rounded-xl border border-border/50 transition-all group/log">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/log:scale-110 ${log.credits < 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {log.category === 'AI Legal' ? <Scale size={18} /> : <Zap size={18} />}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-maintext truncate max-w-[150px] uppercase tracking-tight">{log.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-subtext font-bold uppercase opacity-60">{log.category || 'System'}</span>
                                    <span className="text-[9px] text-subtext opacity-40">•</span>
                                    <p className="text-[9px] text-subtext opacity-60 font-medium">{new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${log.credits < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {log.credits > 0 ? '+' : ''}{log.credits}
                              </p>
                            </div>
                          </div>
                        )) : (
                          <div className="flex flex-col items-center justify-center py-12 opacity-30">
                            <History size={32} className="mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">No history yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Connectors Modal */}
      <Transition appear show={isConnectorsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[2000]" onClose={() => setIsConnectorsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-8 text-left align-middle shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-maintext">Apps & Connectors</h3>
                    <button onClick={() => setIsConnectorsOpen(false)} className="text-subtext hover:text-maintext p-1 rounded-lg hover:bg-black/5 transition-all"><X size={20} /></button>
                  </div>
                  <div className="space-y-6">
                    {(() => {
                      const gmailApp = user?.personalizations?.apps?.find(a => a.name === 'Gmail');
                      return (
                        <div className={`p-5 rounded-2xl border transition-all ${gmailApp ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#1E2438] border border-border flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-8 h-8">
                                  <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
                                  <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
                                  <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
                                  <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0 C4.924,8,3,9.924,3,12.298z" />
                                  <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-bold text-sm">Gmail</h4>
                                <p className="text-[10px] text-subtext">{gmailApp ? (gmailApp.tokens?.email_address || 'Connected') : 'Connect your Gmail'}</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (gmailApp) {
                                  // Disconnect
                                  const tid = toast.loading("Disconnecting...");
                                  try {
                                    await axios.delete(`${API}/connectors/gmail/disconnect`, { headers: { Authorization: `Bearer ${token}` } });
                                    const updatedUser = { ...user, personalizations: { ...user.personalizations, apps: user.personalizations.apps.filter(a => a.name !== 'Gmail') } };
                                    setUserRecoil({ user: updatedUser });
                                    toast.success("Disconnected!", { id: tid });
                                  } catch (e) { toast.error("Failed", { id: tid }); }
                                } else {
                                  // Connect
                                  try {
                                    const res = await axios.get(`${API}/connectors/gmail/auth`, { headers: { Authorization: `Bearer ${token}` } });
                                    if (res.data.url) window.location.href = res.data.url;
                                  } catch (e) { toast.error("Failed to initiate"); }
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${gmailApp ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary text-white hover:opacity-90'}`}
                            >
                              {gmailApp ? 'Disconnect' : 'Connect'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="rounded-2xl border border-dashed border-primary/20 p-5 text-center opacity-60">
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">More coming soon</p>
                      <p className="text-[9px] text-subtext mt-1">Drive · Notion · Slack · Calendar</p>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

    </>
  );
};

export default Sidebar;
