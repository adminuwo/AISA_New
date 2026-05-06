import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImagePlus,
  Video,
  PlayCircle,
  Wand2,
  Search,
  Globe,
  FileText,
  Code,
  Headphones,
  TrendingUp,
  Megaphone,
  ArrowRight,
  Sparkles,
  Brain,
  Briefcase
} from 'lucide-react';
import LegalLogo from '../Tools/AI_Legal/components/LegalLogo.jsx';
import { useIsDark } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const FuturisticToolCards = ({ onToolSelect, activeToolId, activeTab, onTabChange }) => {
  const { t } = useLanguage();
  const isDark = useIsDark();

  const ALL_TOOLS = [
    { id: 'image', category: 'Create', icon: ImagePlus, label: t('generateImage'), desc: t('createVisualsFromText') },
    { id: 'video', category: 'Create', icon: Video, label: t('generateVideo'), desc: t('textToCinematicVideo') },
    { id: 'image_to_video', category: 'Create', icon: PlayCircle, label: t('imageToVideo'), desc: t('imageToVideoMagic') },
    { id: 'edit_image', category: 'Create', icon: Wand2, label: t('editImage'), desc: t('magicImageEditor') },
    { id: 'audio', category: 'Create', icon: Headphones, label: t('convertToAudio'), desc: t('textDocsToVoice') },

    { id: 'deep_search', category: 'Intelligence', icon: Search, label: t('deepSearch'), desc: t('researchComplexTopics') },
    { id: 'web_search', category: 'Intelligence', icon: Globe, label: t('realTimeSearch'), desc: t('liveWebDataAccess') },
    { id: 'document', category: 'Intelligence', icon: FileText, label: t('analyzeDocument'), desc: t('chatWithPdfsDocs') },
    { id: 'code', category: 'Intelligence', icon: Code, label: t('codeWriter'), desc: t('writeDebugCode') },

    { id: 'legal', category: 'Business', icon: Brain, label: t('aiLegal'), desc: t('specializedAiLegalTools') },
    { id: 'ai_cashflow', category: 'Business', icon: TrendingUp, label: t('aiCashFlow'), desc: t('liveAnalysisReports') },
    { id: 'aiad_agent', category: 'Business', icon: Megaphone, label: 'AI ADS™', desc: 'Social Media Orchestration' },
  ];

  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter(tool => tool.category === activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'Create', icon: Sparkles },
    { id: 'Intelligence', icon: Brain },
    { id: 'Business', icon: Briefcase }
  ];

  const brandGradientPill = 'bg-gradient-to-br from-[#7c3aed] to-[#6366f1]';
  const brandShadowPill = 'shadow-lg shadow-indigo-500/25';
  const lightBg = isDark ? 'bg-indigo-500/10' : 'bg-indigo-50';
  const iconColor = isDark ? 'text-indigo-400' : 'text-indigo-600';
  const accentColor = '#7c3aed';

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-0 sm:py-2 flex flex-col items-center justify-center min-h-[40vh] space-y-4 sm:space-y-6">

      {/* 1. Pill-Style Tabs Navigation - Matching AISA/MALL Toggle */}
      <div className="flex justify-center w-full sticky top-0 z-20 pb-4">
        <div className={`relative flex items-center p-1 rounded-full overflow-x-auto no-scrollbar scroll-smooth flex-nowrap max-w-full ${isDark ? 'bg-zinc-900/80 border border-white/5' : 'bg-slate-100 border border-slate-200 shadow-inner'}`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative px-4 sm:px-8 py-2 sm:py-2.5 rounded-full flex items-center gap-2 text-[10px] sm:text-[11px] font-bold tracking-tight transition-all duration-300 whitespace-nowrap flex-shrink-0 group ${isActive
                    ? 'text-white'
                    : `text-slate-500 hover:text-slate-900 dark:hover:text-zinc-300`
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className={`absolute inset-0 rounded-full ${brandGradientPill} ${brandShadowPill}`}
                    transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                <span className="relative z-10">{tab.id}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. Professional Tool Grid - SaaS Clean Style with Centered Rows */}
      <div className="w-full relative min-h-[280px] sm:min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4"
          >
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isIntelligence = activeTab === 'Intelligence';
              return (
                <motion.div
                  key={tool.id}
                  whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToolSelect(tool.id)}
                  className={`group relative p-4 sm:p-5 rounded-[14px] border cursor-pointer transition-all duration-200 overflow-hidden w-full sm:w-[calc(50%-12px)] ${isIntelligence ? 'md:w-[calc(45%-12px)]' : 'md:w-[calc(33.33%-12px)]'} max-w-[320px] sm:max-w-none ${isDark
                      ? 'bg-[#18181b] border-white/5 hover:border-indigo-500/50 hover:bg-[#1c1c20]'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'
                    }`}
                >
                  <div className="flex flex-col h-full gap-3 sm:gap-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center transition-all duration-300 ${tool.id === 'legal' && !isDark ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-inner' : lightBg}`}>
                          {tool.id === 'legal' ? (
                            <LegalLogo size={28} color={isDark ? '#818cf8' : accentColor} showText={true} />
                          ) : (
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                          )}
                        </div>
                        {/* Heading next to icon on mobile */}
                        <h4 className={`sm:hidden text-[14px] font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{tool.label}</h4>
                      </div>
                      <div className={`p-1.5 rounded-lg opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-2 sm:group-hover:translate-x-0 ${isDark ? 'bg-white/5 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <ArrowRight size={14} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Heading below icon on desktop */}
                      <h4 className={`hidden sm:block text-[13px] sm:text-[15px] font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{tool.label}</h4>
                      <p className={`text-[10px] sm:text-[12px] leading-relaxed line-clamp-2 font-medium ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {tool.desc}
                      </p>
                    </div>
                  </div>

                  {/* Unified Branding Glow */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 blur-[40px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none bg-indigo-500" />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default FuturisticToolCards;
