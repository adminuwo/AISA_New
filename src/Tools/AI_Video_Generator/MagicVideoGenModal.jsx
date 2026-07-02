import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useIsDark } from '../../context/ThemeContext';
import { X, Upload, Wand2, Download, Video as VideoIcon, Loader2, History, ArrowLeft, RotateCw, ChevronDown, Check, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CustomVideoPlayer from './CustomVideoPlayer';
import PromptLibraryModal from '../../Components/PromptLibraryModal';

const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "http://localhost:8080/api";

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
                className={`w-full flex items-center justify-between bg-white/60 border ${isOpen ? 'border-primary ring-1 ring-primary/30' : 'border-white/70'} rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/40 hover:bg-white/80'}`}
                disabled={disabled}
            >
                <span className="truncate">{selectedOption?.label || value}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 py-2 bg-white/95 border border-black/8 rounded-xl shadow-[0_10px_30px_-10px_rgba(99,102,241,0.2)] overflow-y-auto custom-scrollbar max-h-[135px] backdrop-blur-2xl"
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
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${option.disabled ? 'opacity-40 cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-primary/5 cursor-pointer'} ${value === option.value ? 'bg-primary/10 text-primary font-bold' : ''}`}
                            >
                                <span className="truncate block pr-4">{option.label}</span>
                                {value === option.value && <Check className="w-4 h-4 shrink-0" />}
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

    return (
        <AnimatePresence>
            {isOpen && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-2 sm:p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[6px] sm:backdrop-blur-[8px] overflow-y-auto lg:!left-[280px] modal-open-indicator">
                <div className="relative w-full max-w-3xl my-auto">

                    <motion.div
                        animate={{
                            background: [
                                "radial-gradient(ellipse at 50% 0%,   rgba(99,102,241,0.55) 0%, transparent 65%)",
                                "radial-gradient(ellipse at 100% 50%, rgba(59,130,246,0.55) 0%, transparent 65%)",
                                "radial-gradient(ellipse at 50% 100%,rgba(139,92,246,0.55) 0%, transparent 65%)",
                                "radial-gradient(ellipse at 0% 50%,   rgba(79,70,229,0.50)  0%, transparent 65%)",
                                "radial-gradient(ellipse at 50% 0%,   rgba(99,102,241,0.55) 0%, transparent 65%)"
                            ]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-[14px] rounded-[46px] pointer-events-none z-0 blur-[22px]"
                    />

                    <motion.div
                        animate={{
                            background: [
                                "linear-gradient(0deg,   #6366f1, #4f46e5, #3b82f6, #8b5cf6)",
                                "linear-gradient(90deg,  #3b82f6, #6366f1, #7c3aed, #4338ca)",
                                "linear-gradient(180deg, #8b5cf6, #3b82f6, #4f46e5, #6366f1)",
                                "linear-gradient(270deg, #4338ca, #7c3aed, #6366f1, #2563eb)",
                                "linear-gradient(360deg, #6366f1, #4f46e5, #3b82f6, #8b5cf6)"
                            ]
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-[1.5px] rounded-[33px] pointer-events-none z-[1] opacity-75"
                    />

                <motion.div
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    initial={{ opacity: 0, scale: 0.9, y: 40, rotateX: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative w-full rounded-[24px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] z-[2]"
                    style={{ 
                        transformStyle: "preserve-3d",
                        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 20px 50px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
                    }}
                >
                    <div className={`absolute inset-0 backdrop-blur-[60px] z-0 rounded-[32px] ${isDark ? 'bg-zinc-900/90' : 'bg-white/80'}`} />

                    <motion.div
                        animate={{
                            backgroundColor: ["#3730a3","#4338ca","#6366f1","#4f46e5","#3730a3"],
                            x: ["0%","35%","0%"], y: ["0%","20%","0%"], scale:[1,1.25,1]
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-[20%] -left-[15%] w-[70%] h-[75%] rounded-full opacity-[0.45] mix-blend-multiply pointer-events-none z-[1] blur-[80px]"
                    />
                    <motion.div
                        animate={{
                            backgroundColor: ["#4c1d95","#6d28d9","#7c3aed","#8b5cf6","#4c1d95"],
                            x: ["0%","-30%","0%"], y: ["0%","25%","0%"], scale:[1,1.3,1]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                        className="absolute -bottom-[25%] -right-[20%] w-[70%] h-[80%] rounded-full opacity-[0.40] mix-blend-multiply pointer-events-none z-[1] blur-[80px]"
                    />
                    <motion.div
                        animate={{
                            backgroundColor: ["#1e3a8a","#2563eb","#3b82f6","#1d4ed8","#1e3a8a"],
                            x: ["0%","20%","0%"], y: ["0%","-20%","0%"], scale:[1,1.15,1]
                        }}
                        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 7 }}
                        className="absolute top-[25%] right-[5%] w-[50%] h-[55%] rounded-full opacity-[0.30] mix-blend-multiply pointer-events-none z-[1] blur-[70px]"
                    />

                    <motion.div
                        className="pointer-events-none hidden md:block absolute inset-0 z-[6] rounded-[32px] mix-blend-soft-light"
                        style={{ background: isHovering && (typeof window !== 'undefined' && window.innerWidth >= 768) ? backgroundSpotlight : 'transparent' }}
                    />
                    <div className="absolute inset-0 z-[2] opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
                    <div className={`absolute inset-0 rounded-[32px] border ${isDark ? 'border-white/10' : 'border-white/55'} z-[3] pointer-events-none`} />

                    <div className={`relative z-[8] px-3 sm:px-6 py-3 sm:py-5 border-b border-black/[0.05] flex items-center justify-between backdrop-blur-md shrink-0 ${isDark ? 'bg-zinc-900/40' : 'bg-white/35'}`}>
                        <div className="absolute top-0 right-10 w-[200px] h-full bg-gradient-to-l from-white/30 to-transparent pointer-events-none blur-xl" />
                        <div className="flex items-center gap-3.5 relative">
                            <div className="relative">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-70" />
                                <motion.div whileHover={{ rotate: 180, scale: 1.08 }} className="w-[38px] h-[38px] relative z-10 rounded-[12px] bg-gradient-to-br from-primary via-[#4F46E5] to-[#3B82F6] flex items-center justify-center shadow-[0_6px_15px_rgba(99,102,241,0.35)] border border-white/30">
                                    <Wand2 className="w-5 h-5 text-white" />
                                </motion.div>
                            </div>
                            <div>
                                <h2 className="text-[13px] sm:text-[16px] font-black text-slate-900 dark:text-white tracking-tight leading-none mb-0.5 sm:mb-1">
                                    {showHistory ? 'Your Video History' : 'Image to Video Magic'}
                                </h2>
                                <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                                    {showHistory ? 'Previously generated videos' : 'Google Vertex AI Veo ⚡ Video Generation'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 relative">
                            {!showHistory ? (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-lg transition-colors"
                                >
                                    <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">History</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to Generator
                                </button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.7)", rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="w-7 h-7 rounded-full bg-white/50 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all shadow-sm border border-white/50"
                            >
                                <X size={15} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                    </div>

                    {showHistory ? (
                        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative z-[8]">
                            {isLoadingHistory ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : historyVideos.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {historyVideos.map(video => (
                                        <div key={video._id} className="bg-white/60 rounded-xl overflow-hidden border border-white/70 shadow-sm flex flex-col group">
                                            <div className="relative aspect-video bg-white/40 flex items-center justify-center overflow-hidden">
                                                {video.videoUrl ? (
                                                    <video src={video.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline preload="metadata" />
                                                ) : (
                                                    <VideoIcon className="w-8 h-8 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <p className="text-xs font-medium text-slate-700 line-clamp-2" title={video.prompt}>{video.prompt}</p>
                                                <div className="flex justify-between items-center mt-3">
                                                    <span className="text-[10px] text-slate-400">{new Date(video.createdAt).toLocaleDateString()}</span>
                                                    <a href={video.videoUrl} download target="_blank" rel="noreferrer" className="text-primary hover:opacity-80 transition-opacity p-1 bg-primary/10 rounded-md">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <VideoIcon className="w-10 h-10 mb-2 opacity-50" />
                                    <p>No generated videos yet.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 custom-scrollbar flex flex-col gap-3 sm:gap-4 relative z-[8]">

                            <div className={`grid grid-cols-1 ${isGenerating || resultVideoUrl ? 'md:grid-cols-2' : ''} gap-3 sm:gap-4`}>
                                <div className={`flex flex-col gap-2 ${!isGenerating && !resultVideoUrl ? 'max-w-[260px] sm:max-w-[280px] mx-auto w-full' : ''}`}>
                                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.25em] self-start ml-1">Source Image</span>
                                    {previewUrl ? (
                                        <div className="relative group w-full aspect-square bg-white/40 rounded-[20px] overflow-hidden border border-white/70 shadow-sm">
                                            <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/90 text-slate-800 rounded-full font-semibold text-sm transform scale-95 group-hover:scale-100 transition-all shadow-lg"
                                                >
                                                    <Upload className="w-4 h-4" /> Change Frame
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`w-full aspect-video sm:aspect-square bg-white/40 border-2 border-dashed ${isDragging ? 'border-primary bg-primary/10' : 'border-white/70 hover:border-primary/40'} rounded-[16px] sm:rounded-[20px] flex flex-col items-center justify-center gap-2 sm:gap-3 cursor-pointer hover:bg-white/60 transition-all text-slate-600 group shadow-sm`}
                                        >
                                            <div className={`w-12 h-12 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-white/70'} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-white/80`}>
                                                <Upload className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-slate-500'}`} />
                                            </div>
                                            <div className="text-center px-4">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {isDragging ? 'Drop Image Here' : 'Click or Drag Image'}
                                                </p>
                                                <p className="text-xs mt-1 text-slate-400">First frame of the video</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {(isGenerating || resultVideoUrl) && (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.25em] self-start ml-1">Video Result</span>
                                        <div className={`relative w-full aspect-square rounded-[20px] overflow-hidden border ${isGenerating ? 'border-primary/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/70'} flex items-center justify-center bg-white/40 shadow-sm ${isDark ? 'from-zinc-800 to-zinc-900 border-white/10' : 'from-white to-slate-100'}`}>
                                            {isGenerating ? (
                                                <div className="flex flex-col items-center gap-4 text-primary animate-in fade-in duration-500">
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                    <p className="text-sm font-semibold animate-pulse text-center px-4 text-slate-700">Veo is animating...<br /><span className="text-xs font-medium opacity-75">This usually takes ~30 seconds</span></p>
                                                </div>
                                            ) : resultVideoUrl ? (
                                                <div className="w-full h-full animate-in zoom-in-95 duration-500 flex items-center justify-center bg-black">
                                                    <CustomVideoPlayer src={resultVideoUrl} compact={true} />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 shrink-0">
                                <div className="flex flex-col gap-2 w-full sm:w-auto flex-1 text-left">
                                    <div className="flex items-center gap-2 ml-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.4)]" />
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-700">Quality Core</label>
                                    </div>
                                    <CustomSelect 
                                        value={modelId} 
                                        onChange={setModelId} 
                                        disabled={isGenerating}
                                        options={[
                                            { value: "veo-3.1-fast-generate-001", label: 'Veo 3.1 Fast' },
                                            { value: "veo-3.1-generate-001", label: 'Veo 3.1 Pro' }
                                        ]} 
                                    />
                                </div>
                                <div className="flex flex-col gap-2 w-full sm:w-auto flex-1 text-left">
                                    <div className="flex items-center gap-2 ml-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.4)]" />
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-700">Resolution</label>
                                    </div>
                                    <CustomSelect 
                                        value={resolution} 
                                        onChange={setResolution} 
                                        disabled={isGenerating}
                                        options={[
                                            { value: "720p", label: '720p' },
                                            { value: "1080p", label: '1080p' },
                                            { value: "4k", label: `4K ${modelId.includes('fast') ? '(Pro Only)' : ''}`, disabled: modelId.includes('fast') }
                                        ]} 
                                    />
                                </div>
                                <div className="flex flex-col gap-2 w-full sm:w-auto flex-1 text-left">
                                    <div className="flex items-center gap-2 ml-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.4)]" />
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-700">Video Ratio</label>
                                    </div>
                                    <CustomSelect 
                                        value={aspectRatio} 
                                        onChange={setAspectRatio} 
                                        disabled={isGenerating}
                                        options={[
                                            { value: "16:9", label: "16:9 (Landscape)" },
                                            { value: "9:16", label: "9:16 (Portrait)" },
                                            { value: "1:1", label: "1:1 (Square)" },
                                            { value: "4:3", label: "4:3 (Classic)" },
                                            { value: "3:4", label: "3:4 (Vertical)" }
                                        ]} 
                                    />
                                </div>
                            </div>
                            
                            {/* Input Field */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-800 shadow-[0_0_6px_rgba(0,0,0,0.4)]" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-700">Animation Prompt</label>
                                </div>
                                <div className="relative flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={prompt}
                                            onChange={e => setPrompt(e.target.value)}
                                            disabled={!selectedImage || isGenerating}
                                            placeholder="e.g. A cluster of vibrant wildflowers swaying gently in a sun-drenched meadow"
                                            className="w-full bg-white/60 border border-white/70 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !isGenerating && selectedImage && prompt.trim()) {
                                                    e.preventDefault();
                                                    handleGenerate();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsLibraryOpen(true)}
                                        disabled={!selectedImage || isGenerating}
                                        className="h-[50px] px-4 rounded-2xl bg-white/60 border border-white/70 hover:bg-white/90 text-slate-500 hover:text-primary transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        title="Open Prompt Library"
                                    >
                                        <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Prompt Library</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 ml-1">Be descriptive. Use phrases like "swaying gently", "camera pans left", "zooms in slowly".</p>
                            </div>

                        </div>
                    )}

                    {/* Footer Actions */}
                    {!showHistory && (
                        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-black/[0.05] bg-white/35 backdrop-blur-md flex flex-row items-center justify-between gap-2 shrink-0 relative z-[8]">
                            <button
                                onClick={handleReset}
                                className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                            >
                                Reset
                            </button>

                            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
                                {resultVideoUrl && (
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/70 hover:bg-white/90 text-slate-700 rounded-xl font-semibold text-xs sm:text-sm transition-all border border-white/80 shadow-sm"
                                    >
                                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Download
                                    </button>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={!selectedImage || !prompt.trim() || isGenerating}
                                    className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm overflow-hidden transition-all duration-300 ${(!selectedImage || !prompt.trim() || isGenerating)
                                        ? 'bg-white/50 text-slate-400 cursor-not-allowed border border-white/60 shadow-sm'
                                        : 'text-white border border-transparent shadow-[0_8px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_30px_rgba(99,102,241,0.5)] transform hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                >
                                    {(!(!selectedImage || !prompt.trim() || isGenerating)) && (
                                        <motion.div 
                                          className="absolute inset-0 z-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto]"
                                          animate={{ backgroundPosition: ['0% center', '200% center'] }}
                                          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-white" /> <span className="hidden sm:inline">Generating...</span><span className="sm:hidden">...</span>
                                            </>
                                        ) : resultVideoUrl ? (
                                            <>
                                                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Regenerate
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Generate Video
                                            </>
                                        )}
                                    </div>
                                </button>
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
