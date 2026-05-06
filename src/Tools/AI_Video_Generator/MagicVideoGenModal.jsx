import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useIsDark } from '../../context/ThemeContext';
import { X, Upload, Wand2, Download, Video as VideoIcon, Loader2, History, ArrowLeft, RotateCw, ChevronDown, Check, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CustomVideoPlayer from './CustomVideoPlayer';
import PromptLibraryModal from '../../Components/PromptLibraryModal';

const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "http://localhost:8081/api";

const CinematicParticles = ({ count = 20 }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const actualCount = isMobile ? Math.floor(count / 2) : count;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen z-0">
      {[...Array(actualCount)].map((_, i) => {
        const size = Math.random() * 3 + 1;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-indigo-400/40"
            style={{ width: size, height: size, filter: 'blur(1px)' }}
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: 0,
              opacity: 0
            }}
            animate={{
              y: [`${Math.random() * 100}%`, `${Math.random() * 100 - 20}%`],
              scale: [0, 1, 1.5, 0],
              opacity: [0, 0.8, 0.4, 0]
            }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 3
            }}
          />
        );
      })}
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, disabled }) => {
    const isDark = useIsDark();
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div ref={selectRef} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between border rounded-xl px-4 py-2.5 text-left outline-none transition-all shadow-sm
                    ${isDark 
                        ? 'bg-[#0f1115] border-white/5 text-slate-300 hover:border-white/10' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}
                    ${isOpen ? (isDark ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-indigo-500/50 ring-4 ring-indigo-500/5') : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                disabled={disabled}
            >
                <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold truncate">{selectedOption?.label || value}</span>
                    {selectedOption?.description && (
                        <span className={`text-[9px] font-medium opacity-60 truncate`}>{selectedOption.description}</span>
                    )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className={`absolute z-50 w-full mt-1.5 py-1.5 border rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar max-h-[220px] backdrop-blur-xl
                            ${isDark ? 'bg-[#16191e]/95 border-white/10' : 'bg-white/95 border-slate-200'}
                        `}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    if (!option.disabled) {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }
                                }}
                                disabled={option.disabled}
                                className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors
                                    ${option.disabled 
                                        ? 'opacity-40 cursor-not-allowed text-slate-500' 
                                        : isDark 
                                            ? 'text-slate-300 hover:bg-white/5' 
                                            : 'text-slate-600 hover:bg-slate-50'}
                                    ${value === option.value ? 'bg-indigo-500/10 text-indigo-500' : ''}
                                `}
                            >
                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                    <span className={`text-[11px] font-bold truncate ${value === option.value ? 'text-indigo-500' : ''}`}>{option.label}</span>
                                    {option.description && (
                                        <span className={`text-[9px] font-medium opacity-60 truncate`}>{option.description}</span>
                                    )}
                                </div>
                                {value === option.value && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MagicVideoGenModal = ({ isOpen, onClose, onCreditDeduction }) => {
    const isDark = useIsDark();
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultVideoUrl, setResultVideoUrl] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [resolution, setResolution] = useState("1080p");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [modelId, setModelId] = useState("veo-3.1-fast-generate-001");
    const [historyVideos, setHistoryVideos] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const fileInputRef = useRef(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovering, setIsHovering] = useState(false);
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
        const rect = cardRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    const backgroundSpotlight = useMotionTemplate`radial-gradient(
      600px circle at ${mouseX}px ${mouseY}px,
      rgba(139, 92, 246, 0.15),
      transparent 80%
    )`;

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
            const res = await axios.get(`${baseURL}/video/history?type=imageToVideo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                setHistoryVideos(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
            toast.error("Failed to load history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    useEffect(() => {
        if (modelId.includes('fast') && resolution === '4k') {
            setResolution('1080p');
            toast('4K resolution requires Veo 3.1 Pro', { icon: 'ℹ️', style: { borderRadius: '10px', background: '#333', color: '#fff' }});
        }
    }, [modelId, resolution]);

    const getCreditCost = (modId = modelId, res = resolution) => {
        let multiplier = 525;
        if (modId === 'veo-3.1-fast-generate-001') {
            multiplier = res === '4k' ? 525 : 225;
        } else {
            multiplier = res === '4k' ? 900 : 600;
        }
        return multiplier * 5; 
    };
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const processFile = (file) => {
        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            toast.error("Please select a valid image (JPG, PNG)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResultVideoUrl(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleGenerate = async () => {
        if (!selectedImage) {
            toast.error("Please select an image first");
            return;
        }
        if (!prompt.trim()) {
            toast.error("Please describe what to animate");
            return;
        }

        setIsGenerating(true);
        setResultVideoUrl(null);

        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("prompt", prompt);
        formData.append("resolution", resolution);
        formData.append("aspectRatio", aspectRatio);
        formData.append("modelId", modelId);
        formData.append("isImageToVideo", "true");

        const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;

        try {
            const response = await axios.post(`${baseURL}/video/generate`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setResultVideoUrl(response.data.videoUrl);
                if (onCreditDeduction) onCreditDeduction(getCreditCost());
                toast.success("Video generated successfully!");
            }
        } catch (error) {
            console.error("Video Generation Error:", error);
            if (error.response?.data?.error === "Insufficient credits") {
                toast.error(`Insufficient credits (Need ${getCreditCost()} credits)`);
            } else {
                toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to generate video");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!resultVideoUrl) return;
        try {
            const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
            const response = await axios.post(`${baseURL}/video/download`, { videoUrl: resultVideoUrl }, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'video/mp4' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `aisa-animated-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Failed to download video");
        }
    };

    const handleReset = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setPrompt("");
        setResultVideoUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <div className="relative w-full max-w-5xl">
                    {/* Background Glows */}
                    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

                    <motion.div
                        ref={cardRef}
                        onMouseMove={handleMouseMove}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`relative w-full rounded-3xl overflow-hidden flex flex-col max-h-[90vh] z-[2] border ${isDark ? 'bg-[#0f1115]/95 border-white/10' : 'bg-white/95 border-slate-200'} shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] backdrop-blur-xl`}
                    >
                        {/* Header */}
                        <div className={`relative z-[10] px-8 py-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/5 bg-[#16191e]/50' : 'border-slate-100 bg-white/50'}`}>
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl blur-sm opacity-40 group-hover:opacity-75 transition-opacity" />
                                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <VideoIcon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {showHistory ? 'Creation Gallery' : 'Video Alchemist'}
                                    </h2>
                                    {!showHistory && (
                                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 mt-0.5">
                                            <Sparkles className="w-3 h-3" /> AISA™ Proprietary Engine
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {!showHistory ? (
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'}`}
                                    >
                                        <History className="w-4 h-4" /> History
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'}`}
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Lab
                                    </button>
                                )}
                                <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>
                        </div>

                        {showHistory ? (
                            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 md:py-10 custom-scrollbar relative z-[8]">
                                {isLoadingHistory ? (
                                    <div className="flex flex-col justify-center items-center h-64 gap-4">
                                        <div className="relative">
                                            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 relative z-10" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">Summoning creations...</p>
                                    </div>
                                ) : historyVideos.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                                        {historyVideos.map(video => (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={video._id} 
                                                className={`group rounded-2xl overflow-hidden border transition-all hover:shadow-[0_20px_40px_-12px_rgba(99,102,241,0.25)] ${isDark ? 'bg-[#16191e] border-white/5 hover:border-indigo-500/30' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                            >
                                                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                                    {video.videoUrl ? (
                                                        <video src={video.videoUrl} className="w-full h-full object-cover" muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => {e.target.pause(); e.target.currentTime = 0;}} playsInline />
                                                    ) : (
                                                        <VideoIcon className="w-10 h-10 text-slate-700" />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                        <div className="flex gap-2">
                                                            <a href={video.videoUrl} download target="_blank" rel="noreferrer" className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl text-white transition-all shadow-lg">
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-5">
                                                    <p className={`text-xs font-bold line-clamp-2 mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={video.prompt}>{video.prompt}</p>
                                                    <div className="flex justify-between items-center border-t pt-4 border-black/5">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {video.resolution || '1080p'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                                            <VideoIcon className="w-10 h-10 opacity-20" />
                                        </div>
                                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No masterpieces found</h3>
                                        <p className="text-sm font-medium text-slate-500">Your visual journey begins with a single frame.</p>
                                        <button onClick={() => setShowHistory(false)} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Start Creating</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar">
                                {/* Left Panel: Upload Area */}
                                <div className={`w-full md:flex-1 p-6 md:p-10 flex flex-col gap-6 md:gap-8 overflow-visible md:overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#0f1115]' : 'bg-[#f8f9ff]'}`}>
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Workspace Canvas
                                                </span>
                                            </div>
                                            {previewUrl && (
                                                <button 
                                                    onClick={handleReset}
                                                    className="group flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                                >
                                                    <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                                                    Reset Canvas
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            {(isGenerating || resultVideoUrl) ? (
                                                <div className={`relative w-full h-full min-h-[300px] md:min-h-[440px] rounded-[24px] md:rounded-[32px] overflow-hidden border-2 flex items-center justify-center ${isDark ? 'bg-[#16191e] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-indigo-100 shadow-2xl shadow-indigo-500/5'} group`}>
                                                    {isGenerating ? (
                                                        <div className="flex flex-col items-center gap-6 text-center px-6 md:px-12 relative z-10">
                                                            <div className="relative">
                                                                <motion.div 
                                                                    animate={{ rotate: 360 }}
                                                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                                                    className="absolute -inset-8 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 rounded-full blur-2xl" 
                                                                />
                                                                <Loader2 className="w-10 md:w-12 h-10 md:h-12 animate-spin text-indigo-600 relative z-10" />
                                                            </div>
                                                            <div>
                                                                <h3 className={`text-lg md:text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Weaving magic...</h3>
                                                                <p className="text-xs md:text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed">Our AI alchemists are transforming your image into motion.</p>
                                                            </div>
                                                            <div className="w-48 md:w-64 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                                                                <motion.div 
                                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                                                                    initial={{ width: "0%" }}
                                                                    animate={{ width: "100%" }}
                                                                    transition={{ duration: 40, ease: "linear" }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <motion.div 
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="w-full h-full bg-black group"
                                                        >
                                                            <CustomVideoPlayer src={resultVideoUrl} compact={false} />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            ) : (
                                                <motion.div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    whileHover={{ scale: 1.005 }}
                                                    className={`group relative flex-1 min-h-[300px] md:min-h-[440px] rounded-[24px] md:rounded-[32px] border-2 border-dashed transition-all duration-500 cursor-pointer flex flex-col items-center justify-center p-8 md:p-16 text-center overflow-hidden
                                                        ${isDragging 
                                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-[inset_0_0_60px_rgba(99,102,241,0.15)]' 
                                                            : isDark 
                                                                ? 'border-white/10 bg-white/[0.03] hover:border-indigo-500/40 hover:bg-white/[0.05]' 
                                                                : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 shadow-xl shadow-indigo-500/[0.03]'
                                                        }`}
                                                >
                                                    {previewUrl ? (
                                                        <div className="absolute inset-4 rounded-[20px] md:rounded-[24px] overflow-hidden shadow-2xl">
                                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-md">
                                                                <motion.div 
                                                                    initial={{ y: 20, opacity: 0 }}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    animate={{ y: 0, opacity: 1 }}
                                                                    className="bg-white text-indigo-900 px-6 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2"
                                                                >
                                                                    <Upload className="w-4 h-4" /> Change Image
                                                                </motion.div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h1v1H1V1z' fill='%236366f1' fill-opacity='1'/%3E%3C/svg%3E")` }} />
                                                            
                                                            <div className={`relative w-16 md:w-20 h-16 md:h-20 rounded-[20px] md:rounded-[28px] flex items-center justify-center mb-6 md:mb-8 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-2xl
                                                                ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-indigo-500/10'}`}>
                                                                <Upload className="w-8 md:w-10 h-8 md:h-10" />
                                                            </div>
                                                            <h3 className={`text-xl md:text-2xl font-black mb-3 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Upload Masterpiece</h3>
                                                            <p className="text-xs md:text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed mb-8 md:mb-10">
                                                                Drag and drop the first frame of your cinematic creation here.
                                                            </p>
                                                            <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${isDark ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-white text-indigo-500 border-indigo-50 shadow-indigo-500/5'}`}>
                                                                JPG · PNG · MAX 5MB
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Panel: Controls */}
                                <div className={`w-full md:w-[360px] border-t md:border-t-0 md:border-l flex flex-col shrink-0 overflow-visible md:overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 bg-[#0f1115]' : 'border-slate-100 bg-[#f8f9ff]'}`}>
                                    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 md:gap-8">
                                        
                                        {/* Generation Card */}
                                        <div className={`rounded-3xl p-5 md:p-6 border transition-all duration-500 flex flex-col gap-5 md:gap-6 shadow-2xl ${isDark ? 'bg-[#16191e] border-white/5 shadow-black/20' : 'bg-white border-indigo-100 shadow-indigo-500/10'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                    <Wand2 className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    Lab Parameters
                                                </span>
                                            </div>

                                            {/* Model Select */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Synthesis Core</label>
                                                <CustomSelect 
                                                    value={modelId} 
                                                    onChange={setModelId} 
                                                    disabled={isGenerating}
                                                    options={[
                                                        { 
                                                            value: "veo-3.1-fast-generate-001", 
                                                            label: "AISA™ Motion Flash",
                                                            description: "Optimized for speed and fluid movement."
                                                        },
                                                        { 
                                                            value: "veo-3.1-generate-001", 
                                                            label: "AISA™ Motion Pro",
                                                            description: "High-fidelity motion with rich scene detail."
                                                        }
                                                    ]} 
                                                />
                                            </div>

                                            {/* Resolution & Aspect Ratio Row */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-2 text-left">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Resolution</label>
                                                    <CustomSelect 
                                                        value={resolution} 
                                                        onChange={setResolution} 
                                                        disabled={isGenerating}
                                                        options={[
                                                            { value: "720p", label: "720p" },
                                                            { value: "1080p", label: "1080p" },
                                                            { value: "4k", label: "4K Pro", disabled: modelId.includes('fast') }
                                                        ]} 
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2 text-left">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Ratio</label>
                                                    <CustomSelect 
                                                        value={aspectRatio} 
                                                        onChange={setAspectRatio} 
                                                        disabled={isGenerating}
                                                        options={[
                                                            { value: "16:9", label: "16:9" },
                                                            { value: "9:16", label: "9:16" },
                                                            { value: "1:1", label: "1:1" }
                                                        ]} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prompt Area */}
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motion Script</label>
                                                <button 
                                                    onClick={() => setIsLibraryOpen(true)}
                                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <Sparkles className="w-3 h-3" /> Library
                                                </button>
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                                                <textarea
                                                    value={prompt}
                                                    onChange={e => setPrompt(e.target.value)}
                                                    disabled={!selectedImage || isGenerating}
                                                    placeholder="Describe the cinematic motion in detail..."
                                                    className={`relative w-full min-h-[140px] resize-none rounded-2xl p-5 text-xs font-bold leading-relaxed transition-all outline-none border-2
                                                        ${isDark 
                                                            ? 'bg-[#16191e] border-white/5 text-white placeholder:text-slate-600 focus:border-indigo-500/50' 
                                                            : 'bg-white border-indigo-100 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xl shadow-indigo-500/[0.02]'
                                                        } disabled:opacity-50`}
                                                />
                                            </div>
                                            <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${isDark ? 'bg-indigo-500/5 border-white/5 text-slate-400' : 'bg-indigo-50/50 border-indigo-100 text-slate-500'}`}>
                                                <span className="text-lg">💡</span>
                                                <p className="text-[10px] font-bold leading-relaxed">
                                                    Use descriptors like <span className="text-indigo-600">"cinematic drone"</span> or <span className="text-indigo-600">"slow motion"</span> for superior fidelity.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className={`px-6 md:px-8 py-4 border-t flex flex-col gap-4 ${isDark ? 'border-white/5 bg-[#16191e]/50' : 'border-slate-100 bg-white'}`}>
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Energy Requirement</span>
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{getCreditCost()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {resultVideoUrl && (
                                                <button
                                                    onClick={handleDownload}
                                                    className={`h-10.5 w-10.5 flex items-center justify-center rounded-xl transition-all border shadow-lg ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-indigo-100 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'}`}
                                                    title="Download MP4"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            )}
                                            
                                            <motion.button
                                                onClick={handleGenerate}
                                                whileHover={!(!selectedImage || !prompt.trim() || isGenerating) ? { scale: 1.02 } : {}}
                                                whileTap={!(!selectedImage || !prompt.trim() || isGenerating) ? { scale: 0.98 } : {}}
                                                disabled={!selectedImage || !prompt.trim() || isGenerating}
                                                className={`flex-1 relative h-10.5 rounded-xl font-black text-[10px] uppercase tracking-widest overflow-hidden transition-all duration-300 group
                                                    ${(!selectedImage || !prompt.trim() || isGenerating)
                                                        ? isDark ? 'bg-white/5 text-slate-600 border border-white/5' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-inner'
                                                        : 'text-white shadow-[0_12px_24px_-8px_rgba(99,102,241,0.5)]'
                                                    }`}
                                            >
                                                {(!(!selectedImage || !prompt.trim() || isGenerating)) && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-[length:200%_100%] animate-gradient group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-500" />
                                                )}
                                                <div className="relative z-10 flex items-center justify-center gap-3">
                                                    {isGenerating ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" /> Weaving...
                                                        </>
                                                    ) : resultVideoUrl ? (
                                                        <>
                                                            <RotateCw className="w-4 h-4" /> Regenerate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-4 h-4" /> Generate Video
                                                        </>
                                                    )}
                                                </div>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hidden input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg, image/png"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                    </motion.div>
                </div>
            </div>
            )}

            {/* Prompt Library Modal Integration */}
            <PromptLibraryModal 
                isOpen={isLibraryOpen}
                mode="i2v"
                referenceImage={previewUrl}
                onClose={() => setIsLibraryOpen(false)}
                onSelect={(selectedPrompt) => {
                    setPrompt(selectedPrompt);
                    setIsLibraryOpen(false);
                }}
            />
        </AnimatePresence>
    );
};

export default MagicVideoGenModal;
