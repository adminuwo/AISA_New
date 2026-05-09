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
    gap: '6px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    padding: '0 12px',
  },
  tab: (isActive, isDark) => ({
    position: 'relative',
    padding: '6px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
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
        { id: 'image', label: t('generateImage') || 'Generate Image', desc: 'Create high-quality AI images from text prompts.', icon: ImagePlus, color: '#a78bfa' },
        { id: 'video', label: t('generateVideo') || 'Generate Video', desc: 'Transform text into cinematic AI videos.', icon: Video, color: '#fb923c' },
        { id: 'image_to_video', label: t('imageToVideo') || 'Image to Video', desc: 'Animate photos with fluid motion.', icon: PlayCircle, color: '#f97316' },
        { id: 'edit_image', label: t('editImage') || 'Edit Image', desc: 'Sophisticated AI magic editor.', icon: Wand2, color: '#f43f5e' },
        { id: 'audio', label: t('convertToAudio') || 'Convert to Audio', desc: 'Turn text into natural-sounding audio.', icon: Headphones, color: '#34d399' },
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
        { id: 'deep_search', label: t('deepSearch') || 'Deep Search', desc: 'In-depth analysis and mining reports.', icon: Search, color: '#0ea5e9' },
        { id: 'web_search', label: t('realTimeSearch') || 'Real-Time Search', desc: 'Fast and accurate web search.', icon: Globe, color: '#22d3ee' },
        { id: 'document', label: t('analyzeDocument') || 'Convert Document', desc: 'Analyze or convert your documents.', icon: FileText, color: '#3b82f6' },
        { id: 'code', label: t('codeWriter') || 'Code Writer', desc: 'Generate, explain, and debug code.', icon: Code, color: '#6366f1' },
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
        { id: 'legal', label: t('aiLegal') || 'AI Legal', desc: 'Professional AI legal tools and research.', icon: Scale, color: '#818cf8', premium: true },
        { id: 'ai_cashflow', label: t('aiCashFlow') || 'AI CashFlow', desc: 'Live market analysis and financial reports.', icon: TrendingUp, color: '#10b981', premium: true },
        { id: 'aiad_agent', label: t('aiAds') || 'AI ADS', desc: 'Social Media Orchestration.', icon: Megaphone, color: '#eab308', premium: true },
      ]
    }
  ];

  const currentCategoryData = categories.find(c => c.id === activeCategory);

  /* Grid columns: always 2 on mobile, 3 on desktop (or 2 for intelligence) */
  /* Grid columns: always 2 on mobile, custom on desktop */
  /* Flex-based layout to allow centering of odd-numbered cards (e.g., 2+1 on mobile) */
  const gridClass = `flex flex-wrap justify-center gap-3 sm:gap-6 mx-auto ${
    activeCategory === 'intelligence' ? 'max-w-2xl' : 
    activeCategory === 'create' ? 'max-w-4xl' : 'max-w-3xl'
  }`;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 space-y-3">
      {/* Hero Section */}
      <div className="text-center space-y-2 px-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-primary">{userName || 'User'}</span> 👋
          </h1>
        </motion.div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        isDark={isDark}
      />

      {/* Dynamic Category Description */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory + '_desc'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="max-w-4xl mx-auto text-center px-4 mt-4 mb-8 sm:mt-6 sm:mb-10"
          >
            <p className="text-[13px] sm:text-[15px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {currentCategoryData?.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Tool Area — CSS Grid for equal sizing */}
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
              {currentCategoryData?.tools.map((tool, index) => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`
                    w-[calc(50%-8px)] 
                    ${activeCategory === 'intelligence' ? 'sm:w-[calc(50%-12px)]' : 'sm:w-[calc(33.33%-16px)]'}
                  `}
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
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
          layout
          animate={{
            left: underline.left,
            width: underline.width,
          }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 32,
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            height: '2px',
            borderRadius: '1px',
            background: 'var(--color-primary, #6366f1)',
          }}
        />
      </nav>
    </div>
  );
};

const DashboardCard = ({ tool, onSelect, isActive, isDark }) => {
  const { icon: Icon } = tool;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(tool.id)}
      className={`
        group relative cursor-pointer p-2.5 sm:p-4 rounded-xl sm:rounded-[18px] border transition-all duration-300
        ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
        bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm hover:shadow-lg hover:bg-slate-50 dark:hover:bg-white/10
      `}
    >
      <div className="flex flex-col gap-1.5 sm:gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isDark ? `${tool.color}15` : `${tool.color}10`,
                border: `1px solid ${tool.color}20`
              }}
            >
              <Icon className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" style={{ color: tool.color }} />
            </div>
            {/* Title next to icon on mobile */}
            <h4 className="sm:hidden font-bold text-[11px] text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {tool.label}
            </h4>
          </div>
          {tool.premium && (
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 text-primary rounded-full shrink-0">
              Pro
            </span>
          )}
        </div>

        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          {/* Title below icon on desktop only */}
          <h4 className="hidden sm:block font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug break-words">
            {tool.label}
          </h4>
          <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium break-words">
            {tool.desc}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-primary font-bold text-[9px] sm:text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 mt-auto">
          Launch <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
};

export default ModernDashboard;
