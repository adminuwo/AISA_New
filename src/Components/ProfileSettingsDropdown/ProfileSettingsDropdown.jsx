import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Bell, Sparkles, LayoutGrid,
    Database, Shield, Lock, User,
    X, ChevronDown, Play, Globe, Camera, Scale, DollarSign, AlertCircle, UserX, Eye, UserCheck,
    LogOut, Monitor, MonitorOff, Mic, Check, HelpCircle, Smartphone, Tablet,
    ChevronLeft, ChevronRight, Trash2, ShieldCheck, Mail, Volume2, Plus, MessageSquare, Send, Clock,
    Palette, Type, RefreshCcw, Languages, Crown, History, Calendar, CreditCard, Download, Search, Zap, FileText, Info
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { jsPDF } from "jspdf";
import { usePersonalization } from '../../context/PersonalizationContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserData, getAccounts, removeAccount, setUserData, updateUser, userData } from '../../userStore/userData';
import { useRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API, apis } from '../../types';
import CustomSelect from '../CustomSelect/CustomSelect';
import MultiScheduleReminder from './MultiScheduleReminder';
import Cropper from 'react-easy-crop';
import { getCroppedImgBlob } from '../../utils/canvasUtils';
import { logo, faqs } from '../../constants';
import { TermsOfServiceContent } from '../../landingpage/PolicyModals/TermsOfServiceModal';
import { PrivacyPolicyContent } from '../../landingpage/PolicyModals/PrivacyPolicyModal';

const ProfileSettingsDropdown = ({ onClose, onLogout }) => {
    const fileInputRef = useRef(null);
    const [currentUserData, setUserRecoil] = useRecoilState(userData);
    const user = currentUserData.user || getUserData() || {};
    const {
        personalizations,
        updatePersonalization,
        resetPersonalizations,
        notifications,
        deleteNotification,
        clearAllNotifications,
        chatSessions,
        refreshChatSessions
    } = usePersonalization();
    const { theme, setTheme, accentColor, setAccentColor, ACCENT_COLORS } = useTheme();
    const { language, setLanguage, region, setRegion, regions, t } = useLanguage();
    const [activeTab, setActiveTab] = useState('personalization');
    const [view, setView] = useState('sidebar'); // 'sidebar' or 'detail' for mobile
    const [accounts, setAccounts] = useState(getAccounts());
    const [nicknameInput, setNicknameInput] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [creditLogs, setCreditLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [expandedDate, setExpandedDate] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Reset Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [planName, setPlanName] = useState("Free Plan");
    const [isFaqOpen, setIsFaqOpen] = useState(false); // Legacy for now, though we'll embed

    // FAQ States
    const [selectedFaqCategory, setSelectedFaqCategory] = useState(0);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');
    const [faqSubTab, setFaqSubTab] = useState('faq');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [issueType, setIssueType] = useState('General Inquiry');
    const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);
    const [issueText, setIssueText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [aspect, setAspect] = useState(1 / 1); // Default to square
    const [uploadingCroppedImage, setUploadingCroppedImage] = useState(false);

    const groupedSessions = useMemo(() => {
        const groups = {};
        if (!chatSessions) return groups;
        chatSessions.forEach(session => {
            const d = new Date(session.lastModified);
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(session);
        });
        return groups;
    }, [chatSessions]);

    useEffect(() => {
        setNicknameInput(personalizations.account?.nickname || user?.name || '');
    }, [personalizations.account?.nickname, user?.name]);

    useEffect(() => {
        if (user?.token) {
            // Fetch Plan & Transactions
            fetchTransactions();

            // Sync user profile
            axios.get(apis.user, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            }).then(res => {
                if (res.data) {
                    const mergedData = setUserData(res.data);
                    setUserRecoil(prev => ({ ...prev, user: mergedData }));
                }
            }).catch(err => console.error("Profile sync failed", err));

            // Fetch Subscription Details
            axios.get(`${API}/subscription`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            }).then(res => {
                if (res.data.success && res.data.subscription?.planId?.planName) {
                    setPlanName(res.data.subscription.planId.planName);
                } else if (res.data.founderStatus) {
                    setPlanName("Founder Plan");
                }
            }).catch(err => console.error("Subscription check failed", err));
        }
    }, [user?.token]);

    useEffect(() => {
        if (activeTab === 'credits' && user?.token) {
            fetchCreditLogs();
        }
        if (activeTab === 'account' && user?.token) {
            fetchSessions();
        }
    }, [activeTab, user?.token]);

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await axios.get(apis.sessions, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            setSessions(res.data);
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            const res = await axios.delete(`${apis.sessions}/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.data.success) {
                toast.success("Session revoked successfully");
                fetchSessions();
            }
        } catch (error) {
            toast.error("Failed to revoke session");
        }
    };

    const fetchCreditLogs = async () => {
        try {
            setLoadingHistory(true);
            const res = await axios.get(`${API}/subscription/credit-history`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.data.success) {
                setCreditLogs(res.data.logs);
            }
        } catch (error) {
            console.error("Failed to fetch credit logs", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await axios.get(apis.getPaymentHistory, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            setTransactions(res.data.filter(tx => tx.amount > 0));
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        }
    };

    const handleAccountLogout = (email) => {
        removeAccount(email);
        const updated = getAccounts();
        setAccounts(updated);
        if (updated.length === 0) {
            onLogout();
            onClose();
        } else if (user?.email === email) {
            window.location.reload();
        }
    };

    const handleSwitchAccount = (acc) => {
        setUserData(acc);
        window.location.reload();
    };

    const handleSaveNickname = async () => {
        if (nicknameInput) {
            updatePersonalization('account', { nickname: nicknameInput });
            try {
                if (user?.token) {
                    const res = await axios.put(apis.profile, { name: nicknameInput }, {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    });

                    if (res.data) {
                        // Update local state and storage
                        const updatedUser = setUserData(res.data);
                        setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                    }
                }
                toast.success(t('profileUpdatedSuccess') || 'Profile updated successfully');
            } catch (error) {
                console.error("Profile update failed", error);
                toast.error(error.response?.data?.error || 'Failed to update profile on server');
            }
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSaveCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setUploadingCroppedImage(true);
        const loadingToast = toast.loading("Saving and uploading...");

        try {
            const croppedBlob = await getCroppedImgBlob(imageToCrop, croppedAreaPixels, rotation);
            const truncatedName = (user?.name || 'avatar').substring(0, 10).replace(/\s+/g, '-');
            const file = new File([croppedBlob], `${truncatedName}-avatar.jpg`, { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post(apis.uploadAvatar, formData, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success && res.data.avatar) {
                const updatedUser = { ...user, avatar: res.data.avatar };
                setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                setUserData(updatedUser);
                toast.success("Profile photo updated!");
                setShowCropper(false);
                setImageToCrop(null);
            }
        } catch (error) {
            console.error("Selection/Upload failed", error);
            toast.error(error.response?.data?.error || "Upload failed. Please try again.");
        } finally {
            toast.dismiss(loadingToast);
            setUploadingCroppedImage(false);
        }
    };

    const handleRemoveAvatar = async () => {
        const loadingToast = toast.loading("Removing profile photo...");
        try {
            const res = await axios.delete(apis.removeAvatar, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });

            if (res.data.success) {
                const updatedUser = { ...user, avatar: "" };
                setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                setUserData(updatedUser);
                toast.dismiss(loadingToast);
                toast.success("Profile photo removed!");
            }
        } catch (error) {
            console.error("Removal failed", error);
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.error || "Removal failed. Please try again.");
        }
    };

    const handleSendOtp = async () => {
        setResetLoading(true);
        try {
            await axios.post(apis.forgotPassword, { email: user?.email });
            toast.success('OTP sent to your email');
            setResetStep(2);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send OTP');
        } finally {
            setResetLoading(false);
        }
    };

    const handleConnectGmail = async () => {
        try {
            const res = await axios.get(`${API}/connectors/gmail/auth`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.data && res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            toast.error("Failed to initiate connection. Please try again.");
        }
    };

    const handleDisconnectGmail = async () => {
        const loadingToast = toast.loading("Disconnecting Gmail...");
        try {
            await axios.delete(`${API}/connectors/gmail/disconnect`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            // Properly deep-copy to avoid mutating the original reference
            const updatedApps = (user?.personalizations?.apps || []).filter(a => a.name !== 'Gmail');
            const updatedUser = {
                ...user,
                personalizations: {
                    ...user?.personalizations,
                    apps: updatedApps
                }
            };

            // Fire toast BEFORE state update to avoid re-render race
            toast.dismiss(loadingToast);
            toast.success("Gmail disconnected successfully!");

            // Sync both Recoil and localStorage
            setUserRecoil(prev => ({ ...prev, user: updatedUser }));
            setUserData(updatedUser);

        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Failed to disconnect. Please try again.");
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await axios.delete(apis.deleteAccount, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            toast.success('Account deleted successfully');
            setShowDeleteModal(false);
            onLogout();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete account');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteChatSession = async (sessionId) => {
        if (!confirm(t('confirmDeleteChat') || "Are you sure you want to delete this chat session?")) return;

        try {
            await axios.delete(`${API}/chat/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            toast.success(t('chatDeleted') || 'Chat deleted');
            refreshChatSessions(); // Refresh list via context
        } catch (error) {
            toast.error(t('deleteChatFailed') || 'Failed to delete chat');
        }
    };

    const handleClearAllHistory = async () => {
        if (!confirm(t('confirmClearAllHistory') || "Are you sure you want to delete ALL chat history? This cannot be undone.")) return;

        const loading = toast.loading(t('clearingHistory') || "Clearing history...");
        try {
            // Delete sessions one by one or via a bulk endpoint if available. 
            // In ChatSession.js, DELETE /api/chat/:sessionId is for one.
            // Let's see if we can do bulk. For now, individual is safer if no bulk exists.
            await Promise.all(chatSessions.map(s =>
                axios.delete(`${API}/chat/${s.sessionId}`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                })
            ));

            toast.dismiss(loading);
            toast.success(t('historyCleared') || 'All history cleared');
            refreshChatSessions();
        } catch (error) {
            toast.dismiss(loading);
            toast.error(t('clearHistoryFailed') || 'Failed to clear history');
        }
    };

    const handleResetPassword = async () => {
        if (!resetOtp || !newPassword) {
            toast.error('Please enter OTP and New Password');
            return;
        }
        setResetLoading(true);
        try {
            await axios.post(apis.resetPassword, {
                email: user?.email,
                otp: resetOtp,
                newPassword: newPassword
            });
            toast.success('Password updated successfully');
            setShowResetModal(false);
            setResetStep(1);
            setResetOtp('');
            setNewPassword('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setResetLoading(false);
        }
    };

    const handleSupportSubmit = async () => {
        if (!issueText.trim()) return;
        if (!user?.token) {
            toast.error("Please log in to submit a support request.");
            return;
        }
        setIsSending(true);
        setSendStatus(null);
        try {
            await axios.post(apis.support, {
                email: user?.email,
                issueType: issueType,
                message: issueText
            }, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            setSendStatus('success');
            toast.success("Feedback submitted!");
            setIssueText('');
            setTimeout(() => setSendStatus(null), 3000);
        } catch (error) {
            toast.error(error.response?.data?.error || "Submission failed");
        } finally {
            setIsSending(false);
        }
    };

    const tabs = [
        { id: 'personalization', label: t('personalization'), icon: Sparkles },
        { id: 'notifications', label: t('notifications'), icon: Bell },
        { id: 'data', label: t('dataControls'), icon: Database },
        { id: 'account', label: t('account'), icon: User },
        { id: 'help', label: t('helpFaq') || 'Help & FAQ', icon: HelpCircle },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare },
        { id: 'terms', label: 'Terms', icon: FileText },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ].filter(tab => {
        if (!user?.token) {
            return !['notifications', 'data', 'account', 'feedback'].includes(tab.id);
        }
        return true;
    });

    const renderSettingRow = (label, description, control) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-gray-100 dark:border-white/5 last:border-0 gap-4">
            <div className="flex flex-col gap-1 pr-4 flex-1">
                <span className="text-sm font-black text-gray-800 dark:text-gray-100 tracking-tight">{label}</span>
                {description && <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{description}</span>}
            </div>
            <div className="w-full sm:w-auto shrink-0">
                {control}
            </div>
        </div>
    );

    const renderDropdown = (value, options, onChange, icon) => (
        <div className="w-full sm:w-[200px]">
            <CustomSelect value={value} options={options} onChange={onChange} icon={icon} />
        </div>
    );

    const renderToggle = (value, onToggle) => (
        <button
            onClick={() => onToggle(!value)}
            className={`w-11 h-6 rounded-full p-1 transition-all duration-300 shrink-0 ${value ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
        >
            <div className={`w-4 h-4 rounded-full transition-transform duration-300 shadow-sm bg-white ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );

    const [searchQuery, setSearchQuery] = useState('');

    const allSettings = useMemo(() => {
        const settings = [];

        // Appearance merged into Personalization
        settings.push({
            id: 'theme', tab: 'personalization', label: t('appearance'), description: t('appearanceDesc'), keywords: 'dark mode light mode',
            component: renderSettingRow(t('appearance'), t('appearanceDesc'), renderDropdown(t(theme), [t('system'), t('dark'), t('light')], (e) => setTheme(e.target.value === t('system') ? 'system' : e.target.value === t('dark') ? 'dark' : 'light'), Monitor))
        });
        settings.push({
            id: 'accent', tab: 'personalization', label: t('accentColor'), description: t('accentColorDesc'), keywords: 'color design',
            component: renderSettingRow(t('accentColor'), t('accentColorDesc'), (
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: `hsl(${ACCENT_COLORS[accentColor] || ACCENT_COLORS['Default']})` }} />
                    {renderDropdown(accentColor, Object.keys(ACCENT_COLORS || {}), (e) => setAccentColor(e.target.value), Palette)}
                </div>
            ))
        });

        // Region & Language
        settings.push({
            id: 'region', tab: 'personalization', label: t('region'), description: t('regionDesc'), keywords: 'country region location',
            component: renderSettingRow(t('region'), t('regionDesc'), renderDropdown(region, Object.keys(regions), (e) => setRegion(e.target.value), Globe))
        });
        settings.push({
            id: 'language', tab: 'personalization', label: t('language'), description: t('languageDesc'), keywords: 'language translation hindi english',
            component: renderSettingRow(t('language'), t('languageDesc'), renderDropdown(language, regions[region] || [], (e) => setLanguage(e.target.value), Languages))
        });

        // Personalization
        settings.push({
            id: 'multiScheduleReminder', tab: 'personalization', label: 'Multi Schedule Reminder', keywords: 'alarm scheduler calendar schedule',
            component: <MultiScheduleReminder />
        });


        // Data
        settings.push({
            id: 'chatHistory', tab: 'data', label: t('chatHistory'), description: t('chatHistoryDesc'), keywords: 'save toggle',
            component: renderSettingRow(t('chatHistory'), t('chatHistoryDesc'), renderToggle(personalizations.dataControls?.chatHistory === 'On', (val) => updatePersonalization('dataControls', { chatHistory: val ? 'On' : 'Off' })))
        });

        // Account
        settings.push({
            id: 'nickname', tab: 'account', label: t('displayName'), description: 'Change your display name', keywords: 'name profile',
            component: (
                <div className="flex flex-col gap-2 py-4 border-b border-gray-100 dark:border-white/5">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('displayName')}</label>
                    <div className="relative">
                        <input type="text" value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border rounded-xl p-3 text-sm outline-none focus:border-primary transition-all" />
                        <button onClick={handleSaveNickname} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white text-[10px] rounded-lg hover:opacity-90 transition-all font-bold">{t('saveLabel')}</button>
                    </div>
                </div>
            )
        });

        return settings;
    }, [theme, accentColor, language, personalizations, nicknameInput, user, t, regions, ACCENT_COLORS, region]);

    const renderContent = () => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const results = allSettings.filter(item =>
                item.label.toLowerCase().includes(query) ||
                (item.keywords && item.keywords.toLowerCase().includes(query))
            );
            return (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-1">{t('searchResults') || 'Search Results'}</h3>
                    {results.map(item => <div key={item.id} className="bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl p-4 border border-border/50">{item.component}</div>)}
                    {results.length === 0 && (
                        <div className="py-20 text-center opacity-50">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-subtext/40" />
                            </div>
                            <p className="text-sm font-bold">No results found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            );
        }

        switch (activeTab) {
            case 'personalization':
                return <div className="space-y-0">{allSettings.filter(s => s.tab === 'personalization').map(s => <div key={s.id}>{s.component}</div>)}</div>;
            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{t('notifications')} ({notifications.length})</h3>
                            {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs font-bold text-primary hover:underline">{t('clearAll')}</button>}
                        </div>
                        <div className="space-y-3">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div key={n.id} className="p-4 bg-gray-50/80 dark:bg-white/5 rounded-2xl border border-border/50 flex items-start justify-between gap-4 transition-all hover:border-primary/20">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm text-maintext leading-tight">{n.title}</h4>
                                        <p className="text-xs text-subtext leading-relaxed">{n.desc}</p>
                                    </div>
                                    <button onClick={() => deleteNotification(n.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16} /></button>
                                </div>
                            )) : (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Bell className="w-8 h-8 text-subtext/20" />
                                    </div>
                                    <p className="text-sm text-subtext font-medium">{t('noNotifications')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'feedback':
                return (
                    <div className="space-y-6">
                        <div className="bg-primary/5 rounded-[2.5rem] p-5 sm:p-8 border border-primary/20 shadow-xl shadow-primary/5">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black mb-2 tracking-tight">Share your feedback</h3>
                            <p className="text-xs sm:text-sm text-subtext mb-8 leading-relaxed font-medium">Your feedback helps us build the future of AISA™. Tell us what you'd like to see next.</p>
                            <textarea
                                rows={5}
                                value={issueText}
                                onChange={(e) => setIssueText(e.target.value)}
                                placeholder="Tell us what's on your mind..."
                                className="w-full bg-white dark:bg-[#1E2438] rounded-2xl p-4 text-sm focus:outline-none border border-border focus:border-primary transition-all text-maintext resize-none shadow-sm"
                            />
                            <button
                                onClick={handleSupportSubmit}
                                disabled={isSending || !issueText.trim()}
                                className="w-full mt-6 px-8 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {isSending ? 'Sending...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                );
            case 'terms':
            case 'privacy':
                const isPrivacy = activeTab === 'privacy';
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="p-5 sm:p-6 bg-gradient-to-br from-primary/10 to-transparent rounded-[2rem] sm:rounded-3xl border border-primary/10">
                            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-[#1E2438] flex items-center justify-center shadow-lg text-primary border border-primary/5 shrink-0">
                                    {isPrivacy ? <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> : <Scale className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-maintext tracking-tight">{isPrivacy ? t('privacyPolicy') : t('termsOfService')}</h2>
                                    <p className="text-[10px] text-subtext font-bold uppercase tracking-widest mt-0.5 sm:mt-1 opacity-60">{t('lastUpdated')}: Jan 2026</p>
                                </div>
                            </div>
                            <p className="text-[11px] sm:text-xs text-subtext leading-relaxed font-medium">Please read our {isPrivacy ? 'privacy policy' : 'terms of service'} carefully to understand how we handle your data and the rules of our platform.</p>
                        </div>
                        
                        <div className="prose prose-sm dark:prose-invert max-w-none text-maintext space-y-6 leading-relaxed">
                            {isPrivacy ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
                        </div>
                    </div>
                );
            case 'data':
                return (
                    <div className="space-y-4">
                        {allSettings.filter(s => s.tab === 'data').map(s => <div key={s.id}>{s.component}</div>)}
                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase">{t('chatHistory')}</h4>
                                {chatSessions?.length > 0 && (
                                    <button
                                        onClick={handleClearAllHistory}
                                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
                                    >
                                        {t('clearAll') || 'Clear All'}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2 pr-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {Object.keys(groupedSessions).length > 0 ? Object.keys(groupedSessions).sort((a, b) => new Date(b) - new Date(a)).map(date => (
                                    <div key={date} className="border border-border rounded-xl bg-gray-50/50 dark:bg-zinc-800/30">
                                        <button onClick={() => setExpandedDate(expandedDate === date ? null : date)} className="w-full flex items-center justify-between p-3">
                                            <span className="text-xs font-bold">{date}</span>
                                            <ChevronDown size={14} className={`transition-transform ${expandedDate === date ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedDate === date && (
                                            <div className="p-2 pt-0 space-y-1">
                                                {groupedSessions[date].map(s => (
                                                    <div key={s.sessionId} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-xs group">
                                                        <span className="truncate flex-1 font-medium text-gray-600 dark:text-gray-300">{s.title || t('newChat')}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => { window.location.href = `/dashboard/chat/${s.sessionId}`; onClose(); }}
                                                                className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded font-bold opacity-0 group-hover:opacity-100 transition-all text-[10px]"
                                                            >
                                                                {t('viewLabel')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteChatSession(s.sessionId); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Delete Session"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : <p className="text-center py-10 opacity-50">No chats found</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'account':
                if (!user?.token) {
                    return (
                        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <User className="w-10 h-10 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">You're not logged in</h3>
                                <p className="text-sm text-subtext max-w-xs">Please log in to access your account settings, sessions, and profile information.</p>
                            </div>
                            <button
                                onClick={() => { onClose(); window.location.href = '/login'; }}
                                className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/30 hover:opacity-90 transition-all uppercase tracking-widest text-xs"
                            >
                                Log In
                            </button>
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        {/* Profile Header Card */}
                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-3.5 sm:p-6 border border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Shield className="w-32 h-32 rotate-12" />
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative z-10">
                                <div
                                    className="relative group/avatar cursor-pointer shrink-0"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-primary border border-primary/20 shadow-lg overflow-hidden relative z-10 transition-transform group-hover/avatar:scale-105">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover group-hover/avatar:opacity-50 transition-opacity" />
                                        ) : (
                                            <span className="text-3xl font-black group-hover/avatar:opacity-50 transition-opacity">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <button
                                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-[#161B2E] z-20 hover:scale-110 transition-transform"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 text-center sm:text-left space-y-1.5 sm:space-y-3">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white capitalize flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                                            {user.name}
                                            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-sm ${planName.toLowerCase().includes('pro') ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' :
                                                    planName.toLowerCase().includes('founder') ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' :
                                                        'bg-primary/20 text-primary border-primary/30'
                                                }`}>
                                                {planName.replace(' Plan', '')}
                                            </span>
                                        </h3>
                                        <p className="text-xs sm:text-sm font-bold text-gray-500/80 mt-0.5 sm:mt-1">{user.email}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <button
                                            onClick={() => window._aisa_sync_profile && window._aisa_sync_profile()}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/5 hover:bg-primary/10 hover:text-primary rounded-xl transition-all group/sync border border-border/50 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <RefreshCcw className="w-3.5 h-3.5 group-hover/sync:rotate-180 transition-transform duration-500" />
                                            {t('syncFromSocial')}
                                        </button>

                                        {user.avatar && (
                                            <button
                                                onClick={handleRemoveAvatar}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all group/remove border border-red-500/20 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 group-hover/remove:scale-110 transition-transform" />
                                                {t('removePhoto')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security & Sessions Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-gray-800 dark:text-white leading-tight">Account Security</h4>
                                        <p className="text-[11px] text-subtext font-bold uppercase tracking-wider">Active Login Sessions</p>
                                    </div>
                                </div>
                                <button
                                    onClick={fetchSessions}
                                    className={`p-2 hover:bg-primary/10 rounded-xl transition-all text-subtext hover:text-primary group ${loadingSessions ? 'animate-spin' : ''}`}
                                    title="Refresh Sessions"
                                >
                                    <RefreshCcw className="w-4 h-4 group-active:rotate-180 transition-transform" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {sessions.length > 0 ? sessions.map(session => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={session._id}
                                        className={`group relative p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${session.isCurrent
                                                ? 'bg-primary/[0.03] border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10'
                                                : 'bg-white/40 dark:bg-white/[0.02] border-border/50 hover:border-primary/20 hover:bg-white/60 dark:hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        {session.isCurrent && (
                                            <div className="absolute -top-2.5 right-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-primary/20 z-10">
                                                Active Now
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-110 ${session.device === 'Mobile' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {session.device === 'Mobile' ? (
                                                    <Smartphone className="w-6 h-6" />
                                                ) : session.device === 'Tablet' ? (
                                                    <Tablet className="w-6 h-6" />
                                                ) : (
                                                    <Monitor className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-black text-gray-800 dark:text-white truncate">{session.os} • {session.browser}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <p className="text-[10px] text-subtext font-bold flex items-center gap-1.5">
                                                        <Globe className="w-3 h-3 text-primary/60" />
                                                        {session.ip}
                                                    </p>
                                                    <p className="text-[10px] text-subtext font-bold flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 text-primary/60" />
                                                        {new Date(session.lastActive).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {session.isCurrent && (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex sm:hidden items-center justify-center text-primary shrink-0 animate-pulse">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        {!session.isCurrent ? (
                                            <button
                                                onClick={() => handleRevokeSession(session._id)}
                                                className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 shadow-sm hover:shadow-red-500/20 active:scale-95"
                                            >
                                                End Session
                                            </button>
                                        ) : (
                                            <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary/10 items-center justify-center text-primary shrink-0 animate-pulse">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                        )}
                                    </motion.div>
                                )) : (
                                    <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-3xl bg-gray-50/50 dark:bg-white/[0.01]">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-subtext/40">
                                            <MonitorOff className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-bold text-subtext/60 uppercase tracking-widest">No other active sessions</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Existing Account Settings */}
                        <div className="pt-4 space-y-4">
                            {allSettings.filter(s => s.tab === 'account').map(s => <div key={s.id} className="p-1">{s.component}</div>)}
                        </div>

                        {/* Password Section */}

                        <div className="py-4 flex justify-between items-center text-sm border-b border-gray-100 dark:border-white/5">
                            <div>
                                <p className="font-bold">{t('password')}</p>
                                <p className="text-xs text-subtext">{t('manageAccountSecurity') || 'Manage your account security'}</p>
                            </div>
                            <button onClick={() => setShowResetModal(true)} className="text-primary font-bold hover:underline">{t('changePassword')}</button>
                        </div>
                        <div className="py-6 flex justify-between items-center text-sm">
                            <div className="space-y-1">
                                <p className="font-bold text-red-500">{t('dangerZone') || 'Danger Zone'}</p>
                                <p className="text-[11px] text-subtext leading-tight max-w-[280px]">Permanently delete your account and all associated data. This action is irreversible.</p>
                            </div>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold transition-all"
                            >
                                {t('deleteAccount') || 'Delete Account'}
                            </button>
                        </div>
                    </div>
                );
            case 'credits':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Plan Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <Zap className="w-12 h-12 text-primary opacity-20" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t('currentPlan')}</h3>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <h2 className="text-3xl font-black text-maintext">{planName.replace(' Plan', '')}</h2>
                                    <span className="text-xs text-subtext font-medium">/ 1 {t('month')}</span>
                                </div>

                                <div className="flex items-center justify-between bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                    <div>
                                        <p className="text-[10px] font-bold text-subtext uppercase tracking-wider">{t('availableCredits')}</p>
                                        <p className="text-2xl font-black text-primary">{user?.credits || 0}</p>
                                    </div>
                                    <button onClick={() => { window.location.href = '/pricing'; onClose(); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">{t('buyMore')}</button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Usage */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('recentCreditUsage')}</h4>
                                {loadingHistory && <RefreshCcw className="w-3 h-3 animate-spin text-primary" />}
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {creditLogs.length > 0 ? creditLogs.map(log => (
                                    <div key={log._id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-zinc-800/30 rounded-xl border border-border group hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.credits < 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {log.credits < 0 ? <Zap size={14} /> : <CreditCard size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold truncate max-w-[150px]">{log.description}</p>
                                                <p className="text-[10px] text-subtext">{new Date(log.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${log.credits < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {log.credits > 0 ? '+' : ''}{log.credits}
                                            </p>
                                            <p className="text-[10px] text-subtext">{log.balanceAfter} total</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center opacity-40">
                                        <p className="text-sm">{t('noCreditHistory')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'help':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Help Sub-Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-white/5 rounded-2xl w-full sm:w-fit">
                            <button
                                onClick={() => setFaqSubTab('faq')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${faqSubTab === 'faq' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Browse FAQ
                            </button>
                            <button
                                onClick={() => setFaqSubTab('ticket')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${faqSubTab === 'ticket' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Submit Ticket
                            </button>
                        </div>

                        {faqSubTab === 'faq' ? (
                            <div className="space-y-6">
                                {/* Search */}
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search for questions..."
                                        value={faqSearchQuery}
                                        onChange={(e) => setFaqSearchQuery(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all font-medium"
                                    />
                                </div>

                                {/* Categories Pills */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pb-2">
                                    {faqs.map((cat, idx) => (
                                        <button
                                            key={cat.category}
                                            onClick={() => { setSelectedFaqCategory(idx); setOpenFaqIndex(null); }}
                                            className={`px-3 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center text-center ${idx === faqs.length - 1 && faqs.length % 2 !== 0 ? 'col-span-2' : ''} ${selectedFaqCategory === idx ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-white/5 border-border text-gray-500 hover:border-primary/30'}`}
                                        >
                                            {cat.category}
                                        </button>
                                    ))}
                                </div>

                                {/* Questions List */}
                                <div className="space-y-3 mt-6">
                                    {faqs[selectedFaqCategory].questions
                                        .filter(q => !faqSearchQuery || q.question.toLowerCase().includes(faqSearchQuery.toLowerCase()))
                                        .map((faq, index) => (
                                            <div key={index} className="bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                                                <button
                                                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                                                    className="w-full flex justify-between items-center p-5 text-left group"
                                                >
                                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm group-hover:text-primary transition-colors">{faq.question}</span>
                                                    <div className={`p-1.5 rounded-lg transition-all ${openFaqIndex === index ? 'bg-primary/10 text-primary rotate-180' : 'text-gray-400'}`}>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </button>
                                                <AnimatePresence>
                                                    {openFaqIndex === index && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-5 pb-5 text-gray-500 dark:text-gray-400 text-xs leading-relaxed font-medium border-t border-gray-100/50 dark:border-white/5 pt-4">
                                                                {faq.answer}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-xl space-y-6 pt-4">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Submit a Request</h3>
                                    <p className="text-sm text-subtext italic">Our team typically responds within 24 hours.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Issue Category</label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                                                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-border flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200"
                                            >
                                                {issueType}
                                                <ChevronDown size={16} className={`transition-transform ${isIssueDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {isIssueDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-[#1E2438] border border-border rounded-xl shadow-2xl overflow-hidden py-2"
                                                    >
                                                        {['General Inquiry', 'Technical Support', 'Billing', 'Feature Request', 'Bug Report'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => { setIssueType(opt); setIsIssueDropdownOpen(false); }}
                                                                className={`w-full text-left px-5 py-3 text-xs font-bold transition-all ${issueType === opt ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                                        <textarea
                                            placeholder="How can we help you?"
                                            value={issueText}
                                            onChange={(e) => setIssueText(e.target.value)}
                                            className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-border rounded-xl min-h-[150px] text-sm font-medium outline-none focus:border-primary/50 transition-all resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSupportSubmit}
                                        disabled={isSending || !issueText.trim()}
                                        className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
                                        {isSending ? 'Sending...' : 'Submit Request'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'connectors':
                const gmailApp = user?.personalizations?.apps?.find(a => a.name === 'Gmail');
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Header */}
                        <div className="flex flex-col gap-1 pb-4 border-b border-gray-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('appsConnectors')}</h3>
                            <p className="text-sm text-subtext">{t('connectExternalServices')}</p>
                        </div>

                        {/* Gmail Connector Card */}
                        <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${gmailApp ? 'border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent dark:from-primary/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/30'}`}>
                            {/* Top accent line */}
                            {gmailApp && <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary to-primary/60" />}

                            <div className="p-5">
                                {/* Card header row */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        {/* Gmail icon */}
                                        <div className="relative shrink-0">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-white dark:bg-[#1E2438] border border-gray-100 dark:border-white/10">
                                                {/* Real Gmail SVG Logo */}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-9 h-9">
                                                    <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
                                                    <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
                                                    <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
                                                    <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0 C4.924,8,3,9.924,3,12.298z" />
                                                    <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z" />
                                                </svg>
                                            </div>
                                            {gmailApp && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-white dark:border-[#161B2E]">
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-black text-gray-900 dark:text-white text-[15px]">Gmail</h4>
                                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Google</span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {gmailApp ? (
                                                    <span className="text-primary font-bold flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                                                        {gmailApp.tokens?.email_address || 'Connected'}
                                                    </span>
                                                ) : 'Connect your Gmail account to AISA™'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    {gmailApp ? (
                                        <button
                                            onClick={handleDisconnectGmail}
                                            className="shrink-0 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black rounded-xl border border-primary/20 transition-all duration-200 hover:scale-105"
                                        >
                                            {t('disconnect')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleConnectGmail}
                                            className="shrink-0 px-5 py-2 bg-primary hover:opacity-90 text-white text-xs font-black rounded-xl shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center overflow-hidden">
                                                <img src={logo} alt="AISA" className="w-3 h-3 object-contain" />
                                            </div>
                                            {t('connectLabel')}
                                        </button>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="my-4 border-t border-gray-100 dark:border-white/5" />

                                {/* Feature capability chips */}
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'Read Emails', active: !!gmailApp },
                                        { label: 'Send Emails', active: !!gmailApp },
                                        { label: 'Smart Search', active: !!gmailApp },
                                        { label: 'Draft Creation', active: !!gmailApp },
                                        { label: 'Thread Replies', active: !!gmailApp },
                                        { label: 'Attachment Intelligence', active: !!gmailApp },
                                    ].map(feature => (
                                        <span
                                            key={feature.label}
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${feature.active
                                                ? 'bg-primary/10 text-primary border-primary/20'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                                                }`}
                                        >
                                            {feature.active ? '✓ ' : ''}{feature.label}
                                        </span>
                                    ))}
                                </div>

                                {/* Bottom hint */}
                                {!gmailApp && (
                                    <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500">
                                        💡 Once connected, ask AISA™ to check your emails, search your inbox, send replies, and more — right from chat.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Coming Soon placeholder */}
                        <div className="rounded-2xl border border-dashed border-primary/20 dark:border-primary/10 p-5 text-center opacity-60">
                            <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">{t('moreConnectorsComingSoon')}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Google Drive · Notion · Slack · Calendar</p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-0 sm:p-4">
                {/* Semi-transparent Blurred Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
                />

                {/* Settings Container (Drawer on Mobile, Centered Modal on Desktop) */}
                    <motion.div
                        initial={window.innerWidth < 640 ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                        animate={window.innerWidth < 640 ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={window.innerWidth < 640 ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute sm:relative top-0 left-0 h-full sm:h-[85vh] w-full sm:max-w-5xl bg-white dark:bg-[#161B2E] flex flex-col sm:flex-row shadow-2xl sm:rounded-[2rem] border-r sm:border border-white/5 pointer-events-auto overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} 
                    />
                    
                    {/* Navigation Sidebar (Always visible on Desktop, Conditional on Mobile) */}
                    <div className={`flex flex-col h-full w-full sm:w-[320px] bg-gray-50/30 dark:bg-black/20 border-r border-gray-100 dark:border-white/5 shrink-0 transition-all ${view === 'detail' ? 'hidden sm:flex' : 'flex'}`}>
                        {/* Sticky Header */}
                        <div className="sticky top-0 z-20 px-6 py-6 flex justify-between items-center bg-transparent shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">{t('settings') || 'Settings'}</h2>
                            </div>
                            <button onClick={onClose} className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Search Section */}
                        <div className="px-6 pb-4 shrink-0">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input 
                                    className="w-full bg-white dark:bg-white/5 border border-border rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-primary/50 transition-all shadow-sm" 
                                    placeholder="Search settings..." 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* Scrollable Tabs List */}
                        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                            {tabs.map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => { setActiveTab(tab.id); setView('detail'); }} 
                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm transition-all relative group ${activeTab === tab.id ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'text-subtext hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="activeTabIndicator" className="absolute left-0 w-1.5 h-8 bg-primary rounded-r-full" />
                                    )}
                                    <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-200/50 dark:bg-white/5 text-gray-400 group-hover:text-primary group-hover:bg-primary/5'}`}>
                                        <tab.icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-black flex-1 text-left">{tab.label}</span>
                                    <ChevronRight className={`w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${activeTab === tab.id ? 'opacity-100 text-primary' : ''}`} />
                                </button>
                            ))}
                        </nav>

                        {/* Footer Actions */}
                        {user?.token && (
                            <div className="p-6 border-t border-gray-100 dark:border-white/5">
                                <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-[10px] text-red-500 hover:bg-red-500/10 font-black uppercase tracking-[0.2em] transition-all border border-red-500/10 active:scale-95 bg-white/50 dark:bg-transparent shadow-sm">
                                    <LogOut className="w-4 h-4" /> {t('logOut')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Detail View / Content Area (Always visible on Desktop, Conditional on Mobile) */}
                    <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-transparent overflow-hidden ${view === 'sidebar' ? 'hidden sm:flex' : 'flex'}`}>
                        {/* Sticky Detail Header */}
                        <div className="sticky top-0 z-20 px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#161B2E]/80 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('sidebar')} className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90">
                                    <ChevronLeft size={20} className="text-gray-400" />
                                </button>
                                <h2 className="text-2xl font-black tracking-tight text-maintext">{searchQuery ? 'Search Results' : tabs.find(t => t.id === activeTab)?.label}</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all group active:scale-90">
                                <X size={24} className="text-gray-400 group-hover:text-maintext transition-colors" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 pb-20 custom-scrollbar space-y-10">
                            {renderContent()}
                        </div>
                    </div>
                </motion.div>
            </div>
            {/* Account Deletion Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowDeleteModal(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        className="bg-white dark:bg-[#1E2438] p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl border border-red-500/10 text-center" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Delete Account?</h3>
                        <p className="text-sm text-subtext mb-8 leading-relaxed">
                            Are you absolutely sure? This will permanently remove your profile, data, and access. <strong className="text-red-500">This cannot be undone.</strong>
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 active:scale-95 uppercase"
                            >
                                {deleteLoading ? 'Deleting Account...' : 'Yes, Delete Permanently'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-4 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-sm tracking-widest hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95 uppercase"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowResetModal(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        className="bg-white dark:bg-[#1E2438] p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight">Reset Password</h3>
                        </div>
                        
                        {resetStep === 1 ? (
                            <div className="space-y-6">
                                <p className="text-sm text-subtext leading-relaxed">We'll send a one-time verification code to your registered email address.</p>
                                <button 
                                    onClick={handleSendOtp} 
                                    disabled={resetLoading} 
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/30 disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    {resetLoading ? 'Sending...' : 'Send Verification Code'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Verification Code</label>
                                    <input type="text" placeholder="Enter 6-digit OTP" value={resetOtp} onChange={e => setResetOtp(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-border rounded-2xl outline-none focus:border-primary transition-all text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">New Password</label>
                                    <input type="password" placeholder="Create strong password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-border rounded-2xl outline-none focus:border-primary transition-all text-sm" />
                                </div>
                                <button 
                                    onClick={handleResetPassword} 
                                    disabled={resetLoading} 
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/30 mt-2 active:scale-95 transition-all"
                                >
                                    {resetLoading ? 'Updating...' : 'Update Password'}
                                </button>
                                <button onClick={() => setResetStep(1)} className="w-full py-2 text-xs font-bold text-subtext hover:text-primary transition-colors">Resend Code</button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
            
            {/* Image Cropping Modal */}
            {showCropper && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowCropper(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1E2438] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                            <div>
                                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Adjust Profile Photo</h3>
                                <p className="text-xs text-subtext mt-1">Crop, rotate, and resize your photo</p>
                            </div>
                            <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="relative h-[250px] sm:h-[400px] bg-[#161B2E]">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onCropComplete={handleCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                                cropShape="round"
                                showGrid={true}
                            />
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Zoom Control */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Zoom</span>
                                        <span className="text-primary">{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(e.target.value)}
                                        className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                {/* Rotation Control */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Rotation</span>
                                        <span className="text-primary">{rotation}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        aria-labelledby="Rotation"
                                        onChange={(e) => setRotation(e.target.value)}
                                        className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">Aspect Ratio:</span>
                                    {[
                                        { label: 'Square', value: 1 / 1 },
                                        { label: 'Circle', value: 1 / 1 },
                                        { label: 'Portrait', value: 4 / 5 },
                                        { label: 'Landscape', value: 16 / 9 }
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setAspect(opt.value)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${aspect === opt.value ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-primary'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowCropper(false)}
                                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCrop}
                                        disabled={uploadingCroppedImage}
                                        className="flex-1 sm:flex-none px-8 py-2.5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/30 hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {uploadingCroppedImage ? 'Saving...' : 'Save & Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ProfileSettingsDropdown;
