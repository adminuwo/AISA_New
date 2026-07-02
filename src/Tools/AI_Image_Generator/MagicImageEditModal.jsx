import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Wand2, Download, Image as ImageIcon, Loader2, ArrowRight, RotateCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "http://localhost:8080/api";

const MagicImageEditModal = ({ isOpen, onClose, onCreditDeduction }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImage, setResultImage] = useState(null);
    const fileInputRef = useRef(null);

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

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error("Please select a valid image (JPG, PNG, WEBP)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResultImage(null);
    };

    const handleGenerate = async () => {
        if (!selectedImage) {
            toast.error("Please select an image first");
            return;
        }
        if (!prompt.trim()) {
            toast.error("Please describe what to edit");
            return;
        }

        setIsGenerating(true);
        setResultImage(null);

        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("prompt", prompt);

        const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;

        try {
            const response = await axios.post(`${baseURL}/edit-image`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setResultImage(response.data.data);
                if (onCreditDeduction) onCreditDeduction(20);
                toast.success("Image edited successfully!");
            }
        } catch (error) {
            console.error("Image Edit Error:", error);
            if (error.response?.data?.error === "Insufficient credits") {
                toast.error("Insufficient credits (Need 20 credits)");
            } else {
                toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to edit image");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!resultImage) return;
        try {
            const response = await fetch(resultImage);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `aisa-edited-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Failed to download image");
        }
    };

    const handleReset = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setPrompt("");
        setResultImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[6px] sm:backdrop-blur-[8px] overflow-y-auto lg:!left-[280px] modal-open-indicator">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
                    >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-xl z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Wand2 className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-maintext">AI Image Editor</h2>
                                <p className="text-xs text-subtext font-medium">Google Vertex AI Magic ⚡ AI Image Editor</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-subtext hover:bg-black/5 dark:hover:bg-white/5 hover:text-maintext transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar flex flex-col gap-6">

                        {/* Image Preview Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Source Image */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold text-subtext uppercase tracking-wider">Source Image</span>
                                {previewUrl ? (
                                    <div className="relative group w-full aspect-square bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden border border-border">
                                        <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-4 py-2 bg-white/90 text-black rounded-full font-semibold text-sm transform scale-95 group-hover:scale-100 transition-all shadow-lg"
                                            >
                                                <Upload className="w-4 h-4" /> Change Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full aspect-square bg-black/5 dark:bg-white/5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-subtext hover:text-amber-500 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="text-sm font-semibold text-maintext">Upload Image</p>
                                            <p className="text-xs mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Result Image */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold text-subtext uppercase tracking-wider">Edited Result</span>
                                <div className={`relative w-full aspect-square rounded-2xl overflow-hidden border ${isGenerating ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-border'} flex items-center justify-center bg-black/5 dark:bg-white/5`}>
                                    {isGenerating ? (
                                        <div className="flex flex-col items-center gap-4 text-amber-500 animate-in fade-in duration-500">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            <p className="text-sm font-semibold animate-pulse">Vertex AI is editing...</p>
                                        </div>
                                    ) : resultImage ? (
                                        <img src={resultImage} alt="Edited Result" className="w-full h-full object-contain animate-in zoom-in-95 duration-500" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-subtext/50">
                                            <ImageIcon className="w-8 h-8" />
                                            <p className="text-xs font-semibold">Ready for magic</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Input Field */}
                        <div className="flex flex-col gap-2 shrink-0">
                            <label className="text-xs font-bold text-subtext uppercase tracking-wider">Editing Prompt</label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    disabled={!selectedImage || isGenerating}
                                    placeholder="e.g. Turn the background into a snowy mountain"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl py-3.5 pl-4 pr-12 text-sm text-maintext outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !isGenerating && selectedImage && prompt.trim()) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-[11px] text-subtext ml-1">Be descriptive. Use phrases like "replace the sky with...", "make it look like an anime", "add sunglasses".</p>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-[#1a1a1a] flex items-center justify-between shrink-0">
                        <button
                            onClick={handleReset}
                            className="text-sm font-semibold text-subtext hover:text-maintext transition-colors"
                        >
                            Reset
                        </button>

                        <div className="flex items-center gap-3">
                            {resultImage && (
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-maintext rounded-xl font-semibold text-sm transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </button>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={!selectedImage || !prompt.trim() || isGenerating}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all ${(!selectedImage || !prompt.trim() || isGenerating)
                                    ? 'bg-amber-500/50 text-white/70 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                                    </>
                                ) : resultImage ? (
                                    <>
                                        <RotateCw className="w-4 h-4" /> Regenerate
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" /> Edit Image
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Hidden input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    );
};

export default MagicImageEditModal;
