import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft, AlertCircle, Pencil, ArrowRight } from 'lucide-react';
import { AppRoute, apis } from '../types';
import axios from 'axios';
import { getUserData, setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const setUserRecoil = useSetRecoilState(userDataAtom);

    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);

    // Safety check for user data
    const user = getUserData();
    const email = user?.email || "";

    useEffect(() => {
        if (!email) {
            toast.error("User session not found. Please sign up again.");
            navigate(AppRoute.SIGNUP);
        }
    }, [email, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (verificationCode.length !== 6) {
            setError("Please enter a 6-digit code.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await axios.post(apis.emailVerificationApi, { code: verificationCode, email });
            const finalData = setUserData(res.data);
            setUserRecoil({ user: finalData });

            toast.success("Email verified successfully!");
            navigate(AppRoute.DASHBOARD, { state: location.state });
        } catch (err) {
            console.error("Verification Error:", err);
            setError(err.response?.data?.error || "Verification failed. Please check the code.");
            toast.error("Invalid verification code.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError("");

        try {
            await axios.post(apis.resendCode, { email });
            toast.success("Verification code resent successfully!");
        } catch (err) {
            console.error("Resend Error:", err);
            setError(err.response?.data?.error || "Failed to resend code.");
            toast.error("Failed to resend code.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden selection:bg-primary/20 bg-[#f8fafc] dark:bg-[#020617] aisa-scalable-text">
            {/* Background Blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-primary/20 dark:bg-primary/10 blur-[140px] rounded-full"
                />
                <motion.div
                    animate={{ x: [0, -80, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-primary/20 dark:bg-primary/10 blur-[140px] rounded-full"
                />
            </div>

            <div className="relative w-full max-w-[420px] px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative overflow-hidden bg-white/20 dark:bg-white/[0.02] backdrop-blur-3xl border border-white/40 dark:border-white/10 p-10 rounded-[3.5rem] shadow-2xl text-center ring-1 ring-white/20"
                >
                    {/* Header */}
                    <div className="mb-10">
                        <div className="inline-flex items-center justify-center p-5 bg-primary rounded-[2rem] mb-6 shadow-xl shadow-primary/20">
                            <Mail className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter uppercase leading-tight">Verify Your Email</h2>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
                                We've sent a 6-digit code to
                            </p>
                            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white/40 dark:bg-white/5 rounded-full border border-white/40 dark:border-white/10 mt-2">
                                <span className="text-base font-bold text-slate-700 dark:text-white">{email}</span>
                                <Link to="/signup" className="p-1 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors text-primary">
                                    <Pencil className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 justify-center backdrop-blur-md"
                            >
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleVerify} className="space-y-8" autoComplete="off">
                        <div className="relative">
                            <input
                                type="text"
                                name="otp"
                                autoComplete="one-time-code"
                                maxLength={6}
                                required
                                value={verificationCode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 6) setVerificationCode(val);
                                }}
                                placeholder="······"
                                className="w-full text-center text-5xl tracking-[0.4em] py-7 bg-white/30 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 rounded-[2rem] 
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                     transition-all text-slate-800 dark:text-white font-black placeholder:text-slate-400/50 placeholder:tracking-normal backdrop-blur-md shadow-inner"
                                autoFocus
                            />
                        </div>

                        <motion.button
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || verificationCode.length !== 6}
                            className="w-full py-5 bg-primary rounded-[2rem] font-black text-sm uppercase tracking-widest text-white shadow-xl shadow-primary/30 
                                 hover:shadow-primary/50 transition-all duration-300 
                                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Verify Email</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-white/10 dark:border-slate-800/50 text-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                            Didn't receive the code?
                        </p>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="text-primary hover:underline text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {resendLoading ? 'Sending...' : 'Request New Code'}
                        </button>
                    </div>
                </motion.div>

                {/* Back Link */}
                <Link
                    to={AppRoute.SIGNUP}
                    className="mt-10 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-black text-[10px] uppercase tracking-widest transition-all group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    Back to Signup
                </Link>
            </div>
        </div>
    );
}
