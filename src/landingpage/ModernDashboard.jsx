import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImagePlus,
  Video,
  PlayCircle,
  Wand2,
  Headphones,
  Search,
  Globe,
  FileText,
  Code,
  Scale,
  TrendingUp,
  Megaphone,
  ArrowRight,
  Sparkles,
  Brain,
  Briefcase,
  Star,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useIsDark } from '../context/ThemeContext';

/* ─── Inline styles for the tab navigation ─── */
const tabNavStyles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    gap: '12px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    padding: '0 12px',
  },
  tab: (isActive, isDark) => ({
    position: 'relative',
    padding: '4px 12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.06em',
    color: isActive
      ? 'var(--color-primary, #6366f1)'
      : isDark
        ? 'rgba(210,215,225,0.95)'
        : 'rgba(15,23,42,0.75)',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    transition: 'color 0.25s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  }),
  tabHover: (isDark) => ({
    color: isDark ? 'rgba(203,213,225,1)' : 'rgba(51,65,85,1)',
  }),
};

const ModernDashboard = ({ userName, onToolSelect, activeToolId, activeCategory = 'create', onCategoryChange }) => {
  const { t } = useLanguage();
  const isDark = useIsDark();
  const setActiveCategory = onCategoryChange;

  const categories = [
    {
      id: 'create',
      title: 'CREATE',
      subtitle: 'Creative AI media generation tools',
      icon: Sparkles,
      color: '#a78bfa',
      description: '🎨 Generate stunning visuals, cinematic videos, and natural audio with state-of-the-art AI models.',
      tools: [
        { id: 'image', label: t('generateImage') || 'Generate Image', desc: 'High-quality AI image generation.', icon: ImagePlus, color: '#a78bfa' },
        { id: 'video', label: t('generateVideo') || 'Generate Video', desc: 'Cinematic AI video creation.', icon: Video, color: '#fb923c' },
        { id: 'image_to_video', label: t('imageToVideo') || 'Image to Video', desc: 'Animate photos with fluid motion.', icon: PlayCircle, color: '#f97316' },
        { id: 'edit_image', label: t('editImage') || 'Edit Image', desc: 'AI-powered magic image editor.', icon: Wand2, color: '#f43f5e' },
        { id: 'audio', label: 'Generate Audio', desc: 'Natural text-to-speech engine.', icon: Headphones, color: '#34d399' },
      ]
    },
    {
      id: 'intelligence',
      title: 'INTELLIGENCE',
      subtitle: 'Research, coding, and productivity AI',
      icon: Brain,
      color: '#0ea5e9',
      description: '🧠 Harness the power of advanced research, real-time data access, and automated coding assistants.',
      tools: [
        { id: 'deep_search', label: t('deepSearch') || 'Deep Search', desc: 'In-depth analysis and reports.', icon: Search, color: '#0ea5e9' },
        { id: 'web_search', label: t('realTimeSearch') || 'Real-Time Search', desc: 'Fast and accurate web search.', icon: Globe, color: '#22d3ee' },
        { id: 'document', label: t('analyzeDocument') || 'Convert Document', desc: 'Analyze or convert documents.', icon: FileText, color: '#3b82f6' },
        { id: 'code', label: t('codeWriter') || 'Code Writer', desc: 'Generate and debug code easily.', icon: Code, color: '#6366f1' },
      ]
    },
    {
      id: 'business',
      title: 'BUSINESS',
      subtitle: 'Professional enterprise AI solutions',
      icon: Briefcase,
      color: '#818cf8',
      description: '💼 Streamline legal workflows, financial analysis, and social media orchestration with AI precision.',
      tools: [
        { id: 'legal', label: t('aiLegal') || 'AI Legal', desc: 'Professional AI legal research.', icon: Scale, color: '#818cf8', premium: true },
        { id: 'ai_cashflow', label: 'AI Cashflow™', desc: 'Live market analysis and reports.', icon: TrendingUp, color: '#10b981', premium: true },
        { id: 'aiad_agent', label: t('aiAds') || 'AI ADS', desc: 'Social Media Orchestration.', icon: Megaphone, color: '#eab308', premium: true },
      ]
    }
  ];

  const currentCategoryData = categories.find(c => c.id === activeCategory);

  /* Mobile-first 2-column grid, scales up on larger screens */
  const gridClass = `grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap sm:justify-center gap-3 sm:gap-x-4 sm:gap-y-6 mx-auto w-full max-w-2xl sm:max-w-7xl px-2 sm:px-4`;

  return (
    <div className="relative w-full max-w-6xl mx-auto px-2 sm:px-6 pt-4 sm:pt-12 pb-2 sm:pb-10 space-y-4 sm:space-y-4">
      {/* Background Decor Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      {/* Hero Section */}
      <div className="text-center px-4 pt-1">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-base sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 font-black">{userName || 'User'}</span>
            <motion.span
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400 fill-amber-400" />
            </motion.span>
          </h1>
        </motion.div>
      </div>

      {/* Dynamic Category Description - Hidden on mobile to save space */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory + '_desc'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="hidden sm:block max-w-3xl mx-auto text-center px-6"
          >
            <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg mx-auto">
              {currentCategoryData?.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tab Navigation ─── */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        isDark={isDark}
      />



      {/* Tool Grid Area */}
      <div className="min-h-[360px] sm:min-h-[280px] w-full pt-1 sm:pt-2">
        <AnimatePresence mode="wait">
          {activeCategory && (
            <motion.div
              key={activeCategory + '_tools'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className={gridClass}>
                {currentCategoryData?.tools.map((tool, index) => {
                  const tools = currentCategoryData.tools;
                  const isLastOdd = tools.length % 2 !== 0 && index === tools.length - 1;
                  return (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`sm:w-auto sm:h-auto ${isLastOdd ? 'col-span-2 flex justify-center sm:col-span-1 sm:block' : 'w-full'}`}
                      transition={{
                        duration: 0.35,
                        delay: index * 0.05,
                        ease: [0.23, 1, 0.32, 1]
                      }}
                    >
                      <DashboardCard
                        tool={tool}
                        onSelect={onToolSelect}
                        isActive={activeToolId === tool.id}
                        isDark={isDark}
                        isCentered={isLastOdd}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Premium Text Tab Navigation ─── */
const CategoryTabs = ({ categories, activeCategory, onCategoryChange, isDark }) => {
  const tabRefs = useRef({});
  const navRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const [hoveredTab, setHoveredTab] = useState(null);

  const updateUnderline = useCallback(() => {
    const activeRef = tabRefs.current[activeCategory];
    const navEl = navRef.current;
    if (activeRef && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const tabRect = activeRef.getBoundingClientRect();
      setUnderline({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      });
    }
  }, [activeCategory]);

  useEffect(() => {
    updateUnderline();
    window.addEventListener('resize', updateUnderline);
    return () => window.removeEventListener('resize', updateUnderline);
  }, [updateUnderline]);

  // Also update after a small delay on mount to account for fonts loading
  useEffect(() => {
    const timer = setTimeout(updateUnderline, 100);
    return () => clearTimeout(timer);
  }, [updateUnderline]);

  return (
    <div className="flex justify-center">
      <nav
        ref={navRef}
        style={tabNavStyles.wrapper}
        className="hide-scrollbar"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const isHovered = hoveredTab === cat.id;

          return (
            <button
              key={cat.id}
              ref={(el) => { tabRefs.current[cat.id] = el; }}
              onClick={() => onCategoryChange(cat.id)}
              onMouseEnter={() => setHoveredTab(cat.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...tabNavStyles.tab(isActive, isDark),
                ...(!isActive && isHovered ? tabNavStyles.tabHover(isDark) : {}),
              }}
            >
              {cat.title}
            </button>
          );
        })}

        {/* Animated underline indicator */}
        <motion.div
          layoutId="activeTabIndicator"
          animate={{
            left: underline.left,
            width: underline.width,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          style={{
            position: 'absolute',
            bottom: -2,
            height: '3px',
            borderRadius: '2px',
            background: 'var(--color-primary, #6366f1)',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
          }}
        />
      </nav>
    </div>
  );
};

const DashboardCard = ({ tool, onSelect, isActive, isDark, isCentered }) => {
  const { icon: Icon } = tool;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(tool.id)}
      className={`group relative cursor-pointer h-full ${isCentered ? 'w-[calc(50vw-20px)] sm:w-auto max-w-[185px]' : 'w-full sm:w-auto'}`}
    >
      {/* Animated Glow on Hover */}
      <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-r from-violet-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
      
      {/* Border Wrapper */}
      <div
        className={`h-full rounded-2xl sm:rounded-[24px] p-[1px] transition-all duration-500 ${isDark ? 'bg-white/10' : 'bg-slate-200/50'} group-hover:scale-[1.01]`}
        style={{
          background: isDark
            ? 'linear-gradient(145deg, rgba(167, 139, 250, 0.3), rgba(124, 58, 237, 0.05), rgba(99, 102, 241, 0.2))'
            : 'linear-gradient(145deg, rgba(255,255,255,0.8), rgba(224, 231, 255, 0.3), rgba(129, 140, 248, 0.1))',
        }}
      >
        <div
          className={`group relative flex flex-col items-center justify-center p-2 sm:p-5 rounded-[18px] sm:rounded-[32px] cursor-pointer transition-all duration-500 overflow-hidden h-full min-h-[90px] sm:min-h-[150px] w-full sm:w-[185px] lg:w-[200px] shrink-0 ${
            isActive
              ? 'bg-white dark:bg-white/10 shadow-xl ring-2 ring-violet-500/50'
              : 'bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 shadow-sm border border-white/50 dark:border-white/5'
          }`}
          style={{
            backgroundColor: isDark ? 'rgba(15, 12, 41, 0.8)' : 'rgba(255, 255, 255, 0.7)',
          }}
        >
          {/* Internal Glow */}
          <div
            className="absolute -right-2 -top-2 w-20 h-20 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-500"
            style={{ background: tool.color }}
          />

          {/* Premium Star Badge — top-right corner */}
          {tool.premium && (
            <motion.div
              whileHover={{ scale: 1.25, rotate: 15 }}
              className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
              }}
            >
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
            </motion.div>
          )}

          <div className="flex flex-col items-center text-center gap-1.5 sm:gap-3 w-full relative z-10">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500 bg-white/40 dark:bg-black/20 backdrop-blur-md relative"
              style={{
                border: isDark ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.1)',
              }}
            >
              <div
                className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                style={{ background: `radial-gradient(circle at center, ${tool.color}, transparent)` }}
              />
              <Icon className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" style={{ color: tool.color }} />
            </motion.div>
            
            <div className="flex flex-col items-center gap-0.5 min-w-0 px-1">
              <h4 className="font-extrabold text-[10px] sm:text-[13px] text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight line-clamp-2 text-center">
                {tool.label}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ModernDashboard;
