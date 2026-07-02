import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup, useMotionTemplate, useMotionValue } from 'framer-motion';
import { X, Layout, Monitor, Smartphone, Check, Zap, Shield, Rocket, Sparkles, Wand2, Brain } from 'lucide-react';
import PromptLibraryModal from '../../Components/PromptLibraryModal';
import { logo } from '../../constants';
import { useIsDark } from '../../context/ThemeContext';

// Simplified active state background for Aspect Ratio
const ActiveFill = () => (
    <div className="absolute inset-0 bg-primary z-0 pointer-events-none" />
);

const MagicToolSettingsCard = ({ isOpen, onClose, toolType, config, onChange, pricing, onContentSelect, referenceImage }) => {
    const [hoveredModel, setHoveredModel] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const isDark = useIsDark();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            const activeModals = document.querySelectorAll('.modal-open-indicator');
            if (activeModals.length <= 1) {
                document.body.style.overflow = '';
            }
        };
    }, [isOpen]);
    
    // Spotlight Effect logic
    let mouseX = useMotionValue(0);
    let mouseY = useMotionValue(0);
    function handleMouseMove({ currentTarget, clientX, clientY }) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    const spotlightBackground = useMotionTemplate`
        radial-gradient(
            350px circle at ${mouseX}px ${mouseY}px,
            rgba(0,0,0,0.12),
            transparent 80%
        )
    `;

    // Pricing lookup mapping
    const pricingKey = (toolType === 'edit') ? 'image' : 
                      (['deepsearch', 'websearch', 'coding', 'chat'].includes(toolType)) ? 'chat' : 
                      toolType;

    const toolPricingBase = pricing[pricingKey] || { models: [], editModels: [] };
    const toolPricing = { models: toolType === 'edit' ? (toolPricingBase.editModels || []) : (toolPricingBase.models || []) };
    
    const aspectRatios = toolType === 'video' ? [
        { id: '16:9', label: '16:9', icon: Monitor, w: 14, h: 8 },
        { id: '9:16', label: '9:16', icon: Smartphone, w: 8, h: 14 },
        { id: '1:1', label: '1:1', icon: Layout, w: 1, h: 1 },
    ] : [
        { id: '1:1', label: '1:1', icon: Layout, w: 1, h: 1 },
        { id: '16:9', label: '16:9', icon: Monitor, w: 14, h: 8 },
        { id: '9:16', label: '9:16', icon: Smartphone, w: 8, h: 14 },
        { id: '4:5', label: '4:5', icon: Layout, w: 4, h: 5 },
    ];

    const isVisualTool = ['image', 'video', 'edit'].includes(toolType);
    const getToolTitle = () => {
        switch(toolType) {
            case 'video': return 'Video Settings';
            case 'edit': return 'Image Editing';
            case 'deepsearch': return 'Deep Search Settings';
            case 'websearch': return 'Web Search Settings';
            case 'coding': return 'Code Builder Settings';
            case 'chat': return 'Chat Settings';
            default: return 'Image Generation';
        }
    };

    const modelHoverColors = ["bg-blue-50/90", "bg-indigo-50/90", "bg-violet-50/90", "bg-purple-50/90"];

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[6px] sm:backdrop-blur-[8px] overflow-y-auto lg:!left-[280px] modal-open-indicator"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    {/* Main animated container */}
                    <motion.div
                        onMouseMove={handleMouseMove}
                        onHoverStart={() => setIsHovered(true)}
                        onHoverEnd={() => setIsHovered(false)}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ 
                            opacity: 1, 
                            scale: isHovered ? 1.005 : [1, 1.01, 1], 
                            y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-[320px] sm:max-w-[340px] rounded-[28px] shadow-2xl bg-white/95 dark:bg-zinc-900/95 border border-white/20 my-auto"
                    >

                    {/* Main Content Layer */}
                    <div className="relative z-10 w-full h-full rounded-[27px] flex flex-col overflow-hidden">
                        
                        {/* Soft Noise Texture */}
                        <div className="absolute inset-0 z-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

                        {/* ── Header ── */}
                        <div className="relative z-20 px-5 sm:px-6 pt-6 pb-4 border-b border-black/[0.04] bg-white/40">
                            <div className="absolute top-0 right-8 w-[150px] h-full bg-gradient-to-l from-white/30 to-transparent pointer-events-none blur-xl" />

                            <div className="flex items-center justify-between relative">
                                <div className="flex items-center gap-3.5">
                                        <div 
                                            className="w-[34px] sm:w-[38px] h-[34px] sm:h-[38px] relative z-10 rounded-[10px] sm:rounded-xl bg-gradient-to-br from-primary via-[#4F46E5] to-[#3B82F6] flex items-center justify-center shadow-lg border border-white/30"
                                        >
                                            <Wand2 className="w-[16px] sm:w-[18px] h-[16px] sm:h-[18px] text-white" />
                                        </div>
                                    <div>
                                        <h3 className="text-[15px] sm:text-[16px] font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 shadow-sm">
                                            {getToolTitle()}
                                        </h3>
                                        <p className="text-[8.5px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-1 opacity-90">
                                            <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                                            Advanced Engine
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 relative z-10">
                                    {(toolType === 'image' || toolType === 'edit' || toolType === 'video') && (
                                        <motion.button
                                            whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setIsLibraryOpen(true)}
                                            className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-1.5 text-primary transition-all hover:shadow-lg hover:shadow-primary/10"
                                            title="Prompt Library"
                                        >
                                            <img src={logo} alt="AISA" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Prompt Library</span>
                                        </motion.button>
                                    )}
                                    <motion.button 
                                        whileHover={{ scale: 1.1, backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose} 
                                        className="w-7 h-7 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:shadow-md transition-all shadow-sm border border-white/50 dark:border-white/10 relative z-10"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* ── Body ── */}
                        <div className="relative z-20 px-5 sm:px-6 py-5 space-y-5 sm:space-y-6 max-h-[45dvh] overflow-y-auto scrollbar-hide scroll-smooth will-change-transform">
                            
                            {/* Segmented Aspect Control — hidden for edit mode and chat tools */}
                            {config.aspectRatio !== undefined && isVisualTool && toolType !== 'edit' && (
                                <div>
                                    {toolType === 'video' && (
                                        <div className="flex items-center gap-2 mb-3 ml-1">
                                            <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
                                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800/80 dark:text-white/80 drop-shadow-sm">Aspect Ratio</p>
                                        </div>
                                    )}

                                    <div className={`relative grid ${toolType === 'video' ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 bg-white/50 dark:bg-white/5 p-1.5 rounded-[16px] border border-white/60 dark:border-white/10 shadow-[inset_0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl`}>
                                        <LayoutGroup id="aspectSwitch">
                                            {aspectRatios.map((ar) => {
                                                const isActive = config.aspectRatio === ar.id;
                                                return (
                                                    <motion.button
                                                        key={ar.id}
                                                        onClick={() => onChange('aspectRatio', ar.id)}
                                                        whileHover={!isActive ? { scale: 1.05 } : {}}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="relative h-12 rounded-[10px] flex flex-col items-center justify-center transition-colors outline-none overflow-hidden group shadow-sm"
                                                    >
                                                        {isActive ? (
                                                            <ActiveFill />
                                                        ) : (
                                                            <div className="absolute inset-0 bg-white/60 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[10px]" />
                                                        )}

                                                        <div className={`relative z-10 flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100 opacity-70 group-hover:opacity-100'}`}>
                                                            <div className="flex items-center justify-center mb-1 drop-shadow-sm">
                                                                <div 
                                                                    className={`border-[1.5px] rounded-[2px] transition-colors ${isActive ? 'border-white' : 'border-slate-500 group-hover:border-slate-800'}`}
                                                                    style={{ 
                                                                        width: ar.w > ar.h ? 12 : ar.w === ar.h ? 9 : 6,
                                                                        height: ar.h > ar.w ? 12 : ar.h === ar.w ? 9 : 6,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className={`text-[9.5px] font-black tracking-tighter ${isActive ? 'text-white' : 'text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{ar.label}</span>
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </LayoutGroup>
                                    </div>
                                </div>
                            )}

                            {/* Synthesis Core Items */}
                            {config.modelId !== undefined && (
                                <div className="space-y-3.5">
                                    <div className="flex items-center gap-2 mb-3 ml-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800/80 dark:text-white/80 drop-shadow-sm">Synthesis Core</p>
                                    </div>
                                    <div className="space-y-3 relative">
                                        <AnimatePresence>
                                            {toolPricing.models.map((model, idx) => {
                                                const isActive = config.modelId === model.id;
                                                const isThisHovered = hoveredModel === model.id;
                                                const hoverBaseColor = modelHoverColors[idx % modelHoverColors.length];

                                                return (
                                                    <motion.div
                                                        key={model.id || model.name || idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                                                        className="relative"
                                                    >
                                                        {isActive && (
                                                            <motion.div 
                                                                layoutId="activeModelRing"
                                                                className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-r from-primary via-[#8b5cf6] to-[#0ea5e9] opacity-[0.35] blur-[5px] z-0"
                                                            />
                                                        )}

                                                        <button
                                                            onClick={() => onChange('modelId', model.id)}
                                                            className={`w-full relative p-[14px] rounded-[18px] text-left transition-all duration-300 z-10 overflow-hidden ${
                                                                isActive 
                                                                ? 'bg-white dark:bg-zinc-800 shadow-lg border-2 border-primary/40' 
                                                                : `bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/5 hover:${hoverBaseColor} shadow-sm backdrop-blur-md`
                                                            }`}
                                                        >

                                                            <div className="flex items-center gap-3.5 relative z-10 w-full">
                                                                <motion.div 
                                                                    animate={{ scale: isActive ? 1.1 : 1 }}
                                                                    className={`w-[36px] h-[36px] rounded-[12px] flex items-center justify-center transition-all duration-500 shadow-inner shrink-0 ${isActive ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-[0_8px_20px_rgba(var(--primary-rgb),0.4)] border border-primary/50' : 'bg-white dark:bg-zinc-700 text-slate-400 dark:text-zinc-400 group-hover:text-primary'}`}
                                                                >
                                                                    {model.speed === 'Fast' ? <Rocket size={18} className={isActive ? 'drop-shadow-md' : ''} /> : <Zap size={18} className={isActive ? 'drop-shadow-md' : ''} />}
                                                                </motion.div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className={`text-[14px] font-black truncate pr-2 transition-colors ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-zinc-300' : 'text-slate-700')}`}>{model.name}</span>
                                                                        
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            {isActive && (
                                                                                <motion.div
                                                                                    initial={{ scale: 0, rotate: -90 }}
                                                                                    animate={{ scale: 1, rotate: 0 }}
                                                                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                                                    className="bg-primary/10 rounded-full p-0.5"
                                                                                >
                                                                                    <Check size={12} className="text-primary" strokeWidth={4} />
                                                                                </motion.div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <p className={`text-[10.5px] font-medium leading-snug transition-colors line-clamp-2 ${isActive ? (isDark ? 'text-zinc-400' : 'text-slate-500') : (isDark ? 'text-zinc-500' : 'text-slate-400 group-hover:text-slate-600')}`}>{model.description}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Footer */}
                        <div className="p-4 relative z-20 border-t border-black/[0.04] bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md">
                            <button 
                                onClick={onClose}
                                className="relative w-full flex items-center justify-center py-2.5 rounded-[12px] bg-primary text-white font-bold shadow-lg hover:opacity-90 transition-opacity"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    <span className="text-[11.5px] font-black uppercase tracking-[0.2em]">Activate Core</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
            )}
            
            {/* Prompt Library Modal Integration */}
            <PromptLibraryModal 
                isOpen={isLibraryOpen}
                mode={toolType === 'edit' ? 'edit' : toolType === 'video' ? 'video' : 'generate'}
                referenceImage={referenceImage}
                onClose={() => setIsLibraryOpen(false)}
                onSelect={(prompt) => {
                    if (onContentSelect) {
                        onContentSelect(prompt);
                    }
                    setIsLibraryOpen(false);
                    onClose(); // Close the settings card too for seamless UX
                }}
            />

            <style jsx>{`
                @keyframes shine {
                    100% { background-position: -200% 0, 0 0; }
                }
            `}</style>
        </AnimatePresence>
    );
};

export default MagicToolSettingsCard;
