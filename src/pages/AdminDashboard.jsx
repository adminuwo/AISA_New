import React, { useState, useEffect, Suspense } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, CreditCard, Package, Settings, BarChart3,
    Search, Shield, Ban, Trash2, Plus, Edit2, X,
    TrendingUp, DollarSign, Activity, Zap,
    ChevronDown, Save, RefreshCw, ArrowLeft, FileUp,
    Eye, EyeOff, Check, AlertCircle, FileText, PlusCircle, Headphones, BookOpen,
    MessageSquare, Image, Layers, Clock, Video,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { getUserData } from '../userStore/userData';
import { API } from '../types.js';
import { logo } from '../constants.js';
import toast from 'react-hot-toast';
import { COOKIE_POLICY_DEFAULTS, TERMS_OF_SERVICE_DEFAULTS, PRIVACY_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import AdminHelpDesk from '../Components/AdminHelpDesk';
const KnowledgeUpload = React.lazy(() => import('../Tools/AI_Base/KnowledgeUpload').catch(() => ({ default: () => <div className="p-8 text-center text-subtext">AI Base Module not found.</div> })));
const KnowledgeManagement = React.lazy(() => import('../Tools/AI_Base/KnowledgeManagement').catch(() => ({ default: () => <div className="p-8 text-center text-subtext">AI Base Module not found.</div> })));
import DeleteConfirmModal from '../Components/DeleteConfirmModal';
const ADMIN_EMAIL = 'admin@uwo24.com';
const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
);

// ─── Tab Button ───
const TabButton = ({ active, icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${active
            ? 'bg-primary text-white shadow-lg shadow-primary/30'
            : 'text-subtext hover:bg-white/20 dark:hover:bg-white/10 hover:text-maintext'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

// ─── Stat Card ───
const StatCard = ({ icon: Icon, label, value, color = 'primary', trend }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-primary/30 transition-all"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${color}`} />
                </div>
                {trend && (
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-black text-maintext">{value}</p>
            <p className="text-xs font-semibold text-subtext uppercase tracking-wider mt-1">{label}</p>
        </div>
    </motion.div>
);

// ─── Section Card ───
const SectionCard = ({ title, children, action }) => (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/20 dark:border-white/10">
            <h3 className="font-bold text-maintext text-lg">{title}</h3>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

// ═══════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════
const OverviewTab = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const data = await apiService.getAdminOverviewStats();
            setStats(data.stats || data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Polling for real-time updates every 10 seconds
        const interval = setInterval(() => fetchStats(), 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-subtext text-sm">{t('loadingRealTimeOverview')}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-subtext uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> {t('livePlatformActivity')}
                </h2>
                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all disabled:opacity-50"
                    title="Manual Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label={t('totalUsers')} value={stats?.totalUsers ?? 0} />
                <StatCard icon={Activity} label={t('activeSubscriptions')} value={stats?.activeSubscriptions ?? 0} color="emerald-500" />
                <StatCard icon={DollarSign} label={t('totalRevenue')} value={`₹${stats?.totalRevenue ?? 0}`} color="amber-500" />
                <StatCard icon={Headphones} label={t('support')} value={stats?.pendingTickets ?? 0} color="primary" trend={stats?.pendingTickets > 0 ? "Action Required" : "All Clear"} />
            </div>

            {stats?.toolUsage && stats.toolUsage.length > 0 && (
                <SectionCard title={t('toolUsageAnalytics')}>
                    <div className="space-y-3">
                        {stats.toolUsage.map((tool, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-white/10">
                                <span className="font-semibold text-maintext text-sm">{tool._id || 'Unknown'}</span>
                                <div className="flex items-center gap-4 text-xs text-subtext">
                                    <span className="font-bold text-primary">{tool.count} uses</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
    );
};

// ═══════════════════════════════
// USERS TAB
// ═══════════════════════════════
const UsersTab = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [upgradeData, setUpgradeData] = useState({ planName: '', expiryDate: '' });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null });

    useEffect(() => {
        fetchUsers();
        fetchPlans();
    }, []);

    const [availablePlans, setAvailablePlans] = useState([]);

    const fetchPlans = async () => {
        try {
            const data = await apiService.getPlans();
            setAvailablePlans(Array.isArray(data) ? data : data.plans || []);
        } catch (err) {
            console.error('Failed to fetch plans:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBlockToggle = async (userId, currentStatus) => {
        try {
            await apiService.toggleBlockUser(userId, !currentStatus);
            toast.success(currentStatus ? 'User unblocked' : 'User blocked');
            fetchUsers();
        } catch (err) {
            toast.error('Failed to update user status');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteModal.userId) return;
        try {
            await apiService.deleteUser(deleteModal.userId);
            toast.success('User deleted');
            setDeleteModal({ isOpen: false, userId: null });
            fetchUsers();
        } catch (err) {
            toast.error('Failed to delete user');
            setDeleteModal({ isOpen: false, userId: null });
        }
    };

    const [isUpgrading, setIsUpgrading] = useState(null); // track userId being upgraded

    const handleManualUpgrade = async (userId) => {
        if (!upgradeData.planName) {
            toast.error('Please select a plan');
            return;
        }
        
        setIsUpgrading(userId);
        try {
            const response = await fetch(`${API}/admin/manual-upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getUserData()?.token}`
                },
                body: JSON.stringify({ userId, ...upgradeData })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Plan upgraded successfully');
                setUpgradeData({ planName: '', expiryDate: '' });
                fetchUsers();
            } else {
                toast.error(data.message || 'Failed to upgrade plan');
            }
        } catch (err) {
            console.error("Upgrade error:", err);
            toast.error('Failed to upgrade plan');
        } finally {
            setIsUpgrading(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext" />
                <input
                    type="text"
                    placeholder={t('searchUsersPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-subtext/50 text-maintext"
                />
            </div>

            {/* User List */}
            <div className="space-y-2">
                {filteredUsers.length === 0 && (
                    <p className="text-center text-subtext py-8 text-sm">{t('noUsersFound')}</p>
                )}
                {filteredUsers.map(user => (
                    <motion.div
                        key={user._id || user.id}
                        layout
                        className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 hover:border-primary/20 transition-all"
                    >
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/account.png'; }} />
                                    ) : (
                                        <span className="font-bold text-primary text-sm">
                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-maintext text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-subtext truncate">{user.email}</p>
                                </div>
                                {user.isBlocked && (
                                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">{t('block')}</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    user.planName?.toLowerCase().includes('pro') ? 'bg-amber-500/10 text-amber-500' : 
                                    user.planName?.toLowerCase().includes('founder') ? 'bg-purple-500/10 text-purple-500' : 
                                    'bg-primary/10 text-primary'
                                }`}>
                                    {user.planName || user.role || 'Free Plan'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedUser(selectedUser === (user._id || user.id) ? null : (user._id || user.id))}
                                    className="p-2 rounded-lg hover:bg-primary/10 text-subtext hover:text-primary transition-all"
                                    title={t('manage')}
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleBlockToggle(user._id || user.id, user.isBlocked)}
                                    className={`p-2 rounded-lg transition-all ${user.isBlocked ? 'hover:bg-green-500/10 text-green-500' : 'hover:bg-amber-500/10 text-amber-500'}`}
                                    title={user.isBlocked ? t('unblock') : t('block')}
                                >
                                    {user.isBlocked ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ isOpen: true, userId: user._id || user.id })}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                                    title={t('delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {selectedUser === (user._id || user.id) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-white/10 mt-3 pt-3"
                            >
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-maintext"
                                        value={upgradeData.planName}
                                        onChange={(e) => setUpgradeData({ ...upgradeData, planName: e.target.value })}
                                    >
                                        <option value="">{t('selectPlan')}</option>
                                        {availablePlans.map(p => (
                                            <option key={p._id} value={p.planName}>{p.planName}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-maintext"
                                        value={upgradeData.expiryDate}
                                        onChange={(e) => setUpgradeData({ ...upgradeData, expiryDate: e.target.value })}
                                    />
                                    <button
                                        onClick={() => handleManualUpgrade(user._id || user.id)}
                                        disabled={isUpgrading === (user._id || user.id)}
                                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all"
                                    >
                                        {isUpgrading === (user._id || user.id) ? t('loading') : t('upgrade')}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, userId: null })}
                onConfirm={handleDeleteUser}
                title={t('deleteUserTitle')}
                description={t('deleteUserDesc')}
            />
        </div>
    );
};

// Helper function to format feature checklist descriptions dynamically matching DB limits
const formatFeatureString = (feature, plan) => {
    if (!feature || !plan) return feature;
    let result = feature;

    // 1. Total AI messages / chat limit / Unlimited Chat
    if (/total AI messages/i.test(result) || /total messages/i.test(result) || /AI messages/i.test(result)) {
        if (plan.chatLimit === -1 || plan.chatScope === 'unlimited') {
            return "Unlimited AI Chat";
        } else {
            result = result.replace(/\d+/, plan.chatLimit ?? 100);
        }
    }

    // 2. Validity
    if (/months validity/i.test(result) || /month validity/i.test(result) || /days validity/i.test(result)) {
        const months = Math.round((plan.validityDays || 90) / 30);
        result = result.replace(/\d+/, months);
    }

    // 3. Images/day
    if (/Images\/day/i.test(result)) {
        result = result.replace(/\d+/, plan.imageLimit ?? 0);
    }

    // 4. Carousel/day
    if (/Carousel\/day/i.test(result)) {
        result = result.replace(/\d+/, plan.carouselLimit ?? 0);
    }

    // 5. Videos/day
    if (/Videos\/day/i.test(result)) {
        result = result.replace(/\d+/, plan.videoLimit ?? 0);
    }

    return result;
};

// ═══════════════════════════════
// PLANS TAB
// ═══════════════════════════════
const PlansTab = () => {
    const { t } = useLanguage();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [form, setForm] = useState({
        planId: '',
        planName: '',
        priceMonthly: '',
        priceYearly: '',
        validityDays: '',
        features: ''
    });

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, planId: null });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await apiService.getPlans();
            setPlans(Array.isArray(data) ? data : data.plans || []);
        } catch (err) {
            console.error('Failed to fetch plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const body = {
                planId: form.planId,
                planName: form.planName,
                priceMonthly: Number(form.priceMonthly),
                priceYearly: Number(form.priceYearly),
                validityDays: Number(form.validityDays),
                features: form.features.split(',').map(f => f.trim()).filter(Boolean)
            };

            let data;
            if (editingPlan) {
                data = await apiService.updatePlan(editingPlan._id, body);
            } else {
                data = await apiService.createPlan(body);
            }

            if (data.success) {
                toast.success(editingPlan ? 'Plan updated' : 'Plan created');
                resetForm();
                fetchPlans();
            } else {
                toast.error(data.message || 'Failed');
            }
        } catch (err) {
            toast.error('Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.planId) return;
        try {
            await apiService.deletePlan(deleteModal.planId);
            toast.success('Plan deleted');
            setDeleteModal({ isOpen: false, planId: null });
            fetchPlans();
        } catch (err) {
            toast.error('Failed to delete plan');
            setDeleteModal({ isOpen: false, planId: null });
        }
    };

    const startEdit = (plan) => {
        setEditingPlan(plan);
        setForm({
            planId: plan.planId || '',
            planName: plan.planName || '',
            priceMonthly: plan.priceMonthly?.toString() || '',
            priceYearly: plan.priceYearly?.toString() || '',
            validityDays: plan.validityDays?.toString() ?? '90',
            features: (plan.features || []).map(f => formatFeatureString(f, plan)).join(', ')
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({
            planId: '',
            planName: '',
            priceMonthly: '',
            priceYearly: '',
            validityDays: '',
            features: ''
        });
        setEditingPlan(null);
        setShowForm(false);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => { resetForm(); setShowForm(!showForm); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" /> New Plan
                </button>
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-4">
                            <h3 className="font-bold text-maintext">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Plan ID</label>
                                    <input placeholder="e.g. starter-plan" value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Plan Name</label>
                                    <input placeholder="e.g. Starter" value={form.planName} onChange={e => setForm(p => ({ ...p, planName: e.target.value }))}
                                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Monthly Price (₹)</label>
                                    <input placeholder="e.g. 499" type="number" value={form.priceMonthly} onChange={e => setForm(p => ({ ...p, priceMonthly: e.target.value }))}
                                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Yearly Price (₹)</label>
                                    <input placeholder="e.g. 4990" type="number" value={form.priceYearly} onChange={e => setForm(p => ({ ...p, priceYearly: e.target.value }))}
                                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Validity (Days)</label>
                                    <input placeholder="e.g. 30" type="number" value={form.validityDays} onChange={e => setForm(p => ({ ...p, validityDays: e.target.value }))}
                                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-subtext">Features List (Comma-separated)</label>
                                <input placeholder="e.g. Unlimited AI Chat, CashFlow Explorer, Web & Deep Search" value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))}
                                    className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm font-bold text-subtext hover:text-maintext hover:bg-white/20 transition-all">Cancel</button>
                                <button onClick={handleSubmit} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                    {editingPlan ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Plan List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <div key={plan._id} className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:border-primary/20 transition-all">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-bold text-maintext">{plan.planName}</h4>
                                <div className="mt-1 space-y-0.5">
                                    <p className="text-lg font-black text-primary leading-none">₹{plan.priceMonthly}<span className="text-[10px] text-subtext font-normal ml-1">/mo</span></p>
                                    <p className="text-[10px] text-subtext">Yearly: ₹{plan.priceYearly} (₹{Math.round(plan.priceYearly / 12)}/mo)</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => startEdit(plan)} className="p-2 rounded-lg hover:bg-primary/10 text-subtext hover:text-primary transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteModal({ isOpen: true, planId: plan._id })} className="p-2 rounded-lg hover:bg-red-500/10 text-subtext hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-xs text-subtext border-t border-white/10 pt-3">
                            <p className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
                                Validity: <span className="font-semibold text-maintext">{plan.validityDays} days</span>
                            </p>
                            <p className="flex items-center gap-2 text-[10px] opacity-70">
                                <CreditCard className="w-3.5 h-3.5" />
                                ID: {plan.planId}
                            </p>

                        </div>
                    </div>
                ))}
                {plans.length === 0 && <p className="text-subtext text-sm col-span-full text-center py-8">No plans created yet</p>}
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, planId: null })}
                onConfirm={handleDelete}
                title="Delete Plan?"
                description="Are you sure you want to delete this plan? This action cannot be undone."
            />
        </div>
    );
};

// ═══════════════════════════════
// TOOL LIMIT TAB
// ═══════════════════════════════
const ToolLimitTab = () => {
    const { t } = useLanguage();
    const [plans, setPlans] = useState([]);
    const [editedPlans, setEditedPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await apiService.getPlans();
                const plansList = Array.isArray(data) ? data : data.plans || [];
                setPlans(plansList);
                setEditedPlans(JSON.parse(JSON.stringify(plansList)));
            } catch (err) {
                console.error('Failed to fetch plans:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handleValueChange = (planId, field, value) => {
        setEditedPlans(prev => prev.map(p => {
            if (p._id === planId) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    const hasUnsavedChanges = JSON.stringify(plans) !== JSON.stringify(editedPlans);

    const handleSaveAll = async () => {
        setSaving(true);
        let successCount = 0;
        let failCount = 0;

        const modified = editedPlans.filter(ep => {
            const original = plans.find(p => p._id === ep._id);
            return JSON.stringify(ep) !== JSON.stringify(original);
        });

        for (const plan of modified) {
            try {
                const body = {
                    planId: plan.planId,
                    planName: plan.planName,
                    priceMonthly: Number(plan.priceMonthly),
                    priceYearly: Number(plan.priceYearly),
                    chatLimit: Number(plan.chatLimit),
                    chatScope: plan.chatScope,
                    imageLimit: Number(plan.imageLimit),
                    carouselLimit: Number(plan.carouselLimit),
                    videoLimit: Number(plan.videoLimit),
                    editImageAllowed: Boolean(plan.editImageAllowed),
                    cashflowAllowed: Boolean(plan.cashflowAllowed),
                    validityDays: Number(plan.validityDays),
                    aiLegalAllowed: Boolean(plan.aiLegalAllowed),
                    aiAdsAllowed: Boolean(plan.aiAdsAllowed),
                    voiceGenAllowed: Boolean(plan.voiceGenAllowed),
                    webSearchAllowed: Boolean(plan.webSearchAllowed),
                    deepSearchAllowed: Boolean(plan.deepSearchAllowed),
                    codeWriterAllowed: Boolean(plan.codeWriterAllowed),
                    documentConvertAllowed: Boolean(plan.documentConvertAllowed),
                    features: plan.features,
                    badge: plan.badge,
                    isPopular: plan.isPopular,
                    isActive: plan.isActive
                };
                const res = await apiService.updatePlan(plan._id, body);
                if (res.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to update plan ${plan.planName}:`, err);
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully saved ${successCount} plan limit configuration${successCount > 1 ? 's' : ''}`);
        }
        if (failCount > 0) {
            toast.error(`Failed to save ${failCount} plan configurations`);
        }

        try {
            const data = await apiService.getPlans();
            const freshPlans = Array.isArray(data) ? data : data.plans || [];
            setPlans(freshPlans);
            setEditedPlans(JSON.parse(JSON.stringify(freshPlans)));
        } catch (err) {
            console.error('Failed to reload plans:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    // Matrix representation fields classified according to home chat screen categories
    const services = [
        {
            category: 'Plan Core Settings',
            items: [
                {
                    name: 'AI Chat Scope',
                    description: 'Chat availability type',
                    field: 'chatScope',
                    type: 'select',
                    options: [
                        { value: 'total', label: 'Lifetime Cap' },
                        { value: 'unlimited', label: 'Unlimited' }
                    ]
                },
                {
                    name: 'AI Chat Limit',
                    description: 'Max messages count (-1 for unlimited)',
                    field: 'chatLimit',
                    type: 'number'
                },
                {
                    name: 'Validity (Days)',
                    description: 'Plan expiration duration',
                    field: 'validityDays',
                    type: 'number'
                }
            ]
        },
        {
            category: 'BUSINESS',
            items: [
                {
                    name: 'AI Legal™ Advisor',
                    description: 'Access to AI Legal documents and toolkit',
                    field: 'aiLegalAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI Cashflow™',
                    description: 'Permission to access stock analysis tabs',
                    field: 'cashflowAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI ADS™ Agent',
                    description: 'Access to AI Ads and Social Media generation',
                    field: 'aiAdsAllowed',
                    type: 'boolean'
                }
            ]
        },
        {
            category: 'CREATE',
            items: [
                {
                    name: 'AI Image Generation',
                    description: 'Daily image creation limit',
                    field: 'imageLimit',
                    type: 'number'
                },
                {
                    name: 'AI Image Editor',
                    description: 'Permission to edit/transform images',
                    field: 'editImageAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI Carousel Generation',
                    description: 'Daily AIAD carousel limit',
                    field: 'carouselLimit',
                    type: 'number'
                },
                {
                    name: 'AI Video Generation',
                    description: 'Daily video creation limit',
                    field: 'videoLimit',
                    type: 'number'
                },
                {
                    name: 'Voice Generation',
                    description: 'Text-to-speech audio synthesis',
                    field: 'voiceGenAllowed',
                    type: 'boolean'
                }
            ]
        },
        {
            category: 'INTELLIGENCE',
            items: [
                {
                    name: 'AI Web Search',
                    description: 'Real-time web search capability',
                    field: 'webSearchAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI Deep Search',
                    description: 'AI Deep Search capability',
                    field: 'deepSearchAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI Code Writer',
                    description: 'Programming support and code generator',
                    field: 'codeWriterAllowed',
                    type: 'boolean'
                },
                {
                    name: 'AI Document Converter',
                    description: 'Access to document format conversion tool',
                    field: 'documentConvertAllowed',
                    type: 'boolean'
                }
            ]
        }
    ];

    return (
        <div className="space-y-6 pb-24">
            <div>
                <h2 className="text-lg font-bold text-maintext">Plan Services & Limits (Tool Matrix)</h2>
                <p className="text-xs text-subtext">Directly edit limits, permissions, and service capabilities for each plan in the grid below.</p>
            </div>

            {/* Matrix Card */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20">
                            <th className="p-4 text-xs font-bold text-subtext uppercase tracking-wider w-[280px]">Service / Tool Name</th>
                            {editedPlans.map(plan => (
                                <th key={plan._id} className="p-4 text-xs font-black text-maintext uppercase tracking-wider text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-sm text-maintext">{plan.planName}</span>
                                        <span className="text-[10px] text-primary/80 lowercase font-medium mt-0.5">₹{plan.priceMonthly}/mo</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((cat, idx) => (
                            <React.Fragment key={idx}>
                                {/* Category Header */}
                                <tr className="bg-white/10 dark:bg-white/5">
                                    <td colSpan={editedPlans.length + 1} className="px-4 py-2 text-xs font-extrabold text-primary uppercase tracking-wider">
                                        {cat.category}
                                    </td>
                                </tr>
                                {cat.items.map((item, itemIdx) => (
                                    <tr key={itemIdx} className="border-b border-white/10 dark:border-b-white/5 hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-maintext text-sm">{item.name}</p>
                                            <p className="text-[11px] text-subtext/80 mt-0.5">{item.description}</p>
                                        </td>
                                        {editedPlans.map(plan => {
                                            const val = plan[item.field];
                                            
                                            return (
                                                <td key={plan._id} className="p-4 text-center">
                                                    {item.type === 'boolean' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={!!val}
                                                            onChange={(e) => handleValueChange(plan._id, item.field, e.target.checked)}
                                                            className="w-4.5 h-4.5 accent-primary rounded border-white/20 cursor-pointer flex items-center justify-center mx-auto"
                                                        />
                                                    )}
                                                    {item.type === 'number' && (
                                                        <input
                                                            type="number"
                                                            value={val ?? 0}
                                                            onChange={(e) => handleValueChange(plan._id, item.field, Number(e.target.value))}
                                                            className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-primary text-maintext font-bold text-center w-24 mx-auto block no-spinner font-mono"
                                                        />
                                                    )}
                                                    {item.type === 'select' && (
                                                        <select
                                                            value={val || ''}
                                                            onChange={(e) => handleValueChange(plan._id, item.field, e.target.value)}
                                                            className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-primary text-maintext font-bold text-center max-w-[150px] mx-auto block font-mono"
                                                        >
                                                            {item.options.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-slate-50 dark:bg-zinc-900 text-maintext text-xs font-semibold">
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Hint Box */}
            <div className="bg-white/20 dark:bg-white/5 rounded-2xl p-4 border border-white/10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-subtext space-y-1">
                    <p className="font-bold text-maintext">Quick Edit Matrix</p>
                    <p>Adjust limits and check permissions directly in the comparison grid. Changes are kept locally until you click the save bar at the bottom.</p>
                </div>
            </div>

            {/* Floating Save/Reset Bar */}
            <AnimatePresence>
                {hasUnsavedChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl rounded-2xl min-w-[320px] md:min-w-[500px]"
                    >
                        <div className="flex items-center gap-2.5 text-maintext">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="text-left">
                                <p className="text-sm font-bold text-maintext">Unsaved Changes</p>
                                <p className="text-[11px] text-subtext">You have modified the plan limits and permissions matrix.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 font-semibold">
                            <button
                                onClick={() => setEditedPlans(JSON.parse(JSON.stringify(plans)))}
                                className="px-4 py-2 text-xs font-bold text-subtext hover:text-maintext hover:bg-white/10 rounded-xl transition-all"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        Save All Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════
const SettingsTab = () => {
    const { t } = useLanguage();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiService.getAdminSettings();
                setSettings(data);
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiService.updateAdminSettings(settings);
            toast.success('Settings saved');
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <SectionCard
            title="Admin Settings"
            action={
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                </button>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Organization Name</label>
                    <input
                        value={settings?.organizationName || ''}
                        onChange={e => setSettings(p => ({ ...p, organizationName: e.target.value }))}
                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Default AI Model</label>
                    <input
                        value={settings?.defaultModel || ''}
                        onChange={e => setSettings(p => ({ ...p, defaultModel: e.target.value }))}
                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Max Tokens Per User</label>
                    <input
                        type="number"
                        value={settings?.maxTokensPerUser || ''}
                        onChange={e => setSettings(p => ({ ...p, maxTokensPerUser: Number(e.target.value) }))}
                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-subtext">Allow Public Signup</label>
                    <button
                        onClick={() => setSettings(p => ({ ...p, allowPublicSignup: !p.allowPublicSignup }))}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all border ${settings?.allowPublicSignup
                            ? 'bg-green-500/10 border-green-500/30 text-green-500'
                            : 'bg-red-500/10 border-red-500/30 text-red-500'
                            }`}
                    >
                        {settings?.allowPublicSignup ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
};

// ═══════════════════════════════
// LEGAL PAGES TAB
// ═══════════════════════════════
const LegalPagesTab = () => {
    const { t } = useLanguage();
    const [selectedPage, setSelectedPage] = useState('cookie-policy');
    const [pageData, setPageData] = useState({ sections: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);

    useEffect(() => {
        fetchPage();
    }, [selectedPage]);

    const getDefaultsForPage = (type) => {
        switch (type) {
            case 'cookie-policy': return COOKIE_POLICY_DEFAULTS;
            case 'terms-of-service': return TERMS_OF_SERVICE_DEFAULTS;
            case 'privacy-policy': return PRIVACY_POLICY_DEFAULTS;
            default: return [];
        }
    };

    const fetchPage = async () => {
        setLoading(true);
        try {
            const data = await apiService.getLegalPage(selectedPage);
            if (data && data.sections && data.sections.length > 0) {
                setPageData(data);
            } else {
                // If no DB content exists, show empty
                setPageData({
                    sections: [],
                    lastUpdated: new Date().toISOString()
                });
            }
        } catch (err) {
            toast.error('Failed to fetch legal page data');
            // Fallback to empty on error too
            setPageData({ sections: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiService.updateLegalPage(selectedPage, pageData.sections);
            toast.success('Legal page updated successfully');
        } catch (err) {
            toast.error('Failed to update legal page');
        } finally {
            setSaving(false);
        }
    };

    const addSection = () => {
        setPageData(prev => ({
            ...prev,
            sections: [...prev.sections, { title: 'New Section', content: [{ subtitle: 'New Subtitle', text: 'Section content here...' }] }]
        }));
    };

    const removeSection = (index) => {
        setPageData(prev => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== index)
        }));
    };

    const updateSection = (index, field, value) => {
        setPageData(prev => {
            const newSections = [...prev.sections];
            newSections[index] = { ...newSections[index], [field]: value };
            return { ...prev, sections: newSections };
        });
    };

    const addContent = (sectionIndex) => {
        setPageData(prev => {
            const newSections = [...prev.sections];
            newSections[sectionIndex] = {
                ...newSections[sectionIndex],
                content: [...newSections[sectionIndex].content, { subtitle: 'New Subtitle', text: 'Content text here...' }]
            };
            return { ...prev, sections: newSections };
        });
    };

    const removeContent = (sectionIndex, contentIndex) => {
        setPageData(prev => {
            const newSections = [...prev.sections];
            newSections[sectionIndex] = {
                ...newSections[sectionIndex],
                content: newSections[sectionIndex].content.filter((_, i) => i !== contentIndex)
            };
            return { ...prev, sections: newSections };
        });
    };

    const updateContent = (sectionIndex, contentIndex, field, value) => {
        setPageData(prev => {
            const newSections = [...prev.sections];
            const newContent = [...newSections[sectionIndex].content];
            newContent[contentIndex] = { ...newContent[contentIndex], [field]: value };
            newSections[sectionIndex] = { ...newSections[sectionIndex], content: newContent };
            return { ...prev, sections: newSections };
        });
    };

    const parseLegalDocument = (text) => {
        // Split by lines and filter empty ones
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const sections = [];
        let currentSection = null;

        lines.forEach((line) => {
            // Robust Header Detection:
            // 1. Markdown headers (# Header)
            // 2. ARTICLE I, SECTION 1, CHAPTER 1
            // 3. Numbered headers (1. Introduction)
            // 4. Short Uppercase headers
            const isMetaInfo = /^(Effective Date|Last Updated|Revision|Version)\s*:?/i.test(line);
            const isHeader = !isMetaInfo && (
                /^#+\s+/.test(line) ||
                /^(ARTICLE|SECTION|CHAPTER|UNIT)\s+([IVXLCDM\d]+)/i.test(line) ||
                (/^\d+[\.\)]\s+[A-Z][^a-z]/.test(line) && line.length < 60) ||
                (line.length > 3 && line.length < 50 && line === line.toUpperCase() && !line.includes(':') && !line.endsWith('.'))
            );

            if (isHeader) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    title: line.replace(/^#+\s*/, '').trim(),
                    content: []
                };
            } else if (currentSection) {
                const isBulletOrList = /^[•\-\*\u2022\u2023\u2043\u2044]/.test(line) || /^\d+[\.\)]\s/.test(line);
                const isMetaInfoLine = /^(Effective Date|Last Updated|Revision|Version)\s*:?/i.test(line);
                const isSubtitle = !isBulletOrList && !isMetaInfoLine && ((line.length < 100 && (line.endsWith(':') || !line.endsWith('.'))) || /^###\s+/.test(line));

                if (isSubtitle && !line.includes('http')) {
                    currentSection.content.push({ 
                        subtitle: line.replace(/^#+\s*/, '').replace(/:$/, '').trim(), 
                        text: '' 
                    });
                } else {
                    if (currentSection.content.length === 0) {
                        currentSection.content.push({ subtitle: 'General Terms', text: line });
                    } else {
                        const lastUnit = currentSection.content[currentSection.content.length - 1];
                        if (lastUnit.text) {
                            lastUnit.text += '\n\n' + line;
                        } else {
                            lastUnit.text = line;
                        }
                    }
                }
            } else {
                // Fallback for header-less starts
                currentSection = {
                    title: 'Policy Overview',
                    content: [{ subtitle: 'Introduction', text: line }]
                };
            }
        });

        if (currentSection) sections.push(currentSection);

        // Post-process: Ensure no empty text units
        return sections.map(s => ({
            ...s,
            content: s.content.map(c => ({
                ...c,
                text: (c.text || '').trim()
            })).filter(c => c.text.length > 0)
        })).filter(s => s.content.length > 0);
    };

    const handleDocUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const res = await apiService.parseLegalDoc(file);
            if (res.success && res.sections && res.sections.length > 0) {
                setPageData(prev => ({ ...prev, sections: res.sections }));
                toast.success(`Successfully parsed ${res.sections.length} sections from ${file.name}!`);
            } else {
                toast.error("Could not detect sections in the document.");
            }
        } catch (err) {
            console.error("Doc upload error:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            toast.error(errMsg || "Failed to parse document. Ensure it is a valid PDF, DOCX, or TXT file.");
        } finally {
            setIsParsing(false);
            e.target.value = '';
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white/20 dark:bg-white/5 rounded-xl p-1 border border-white/10 overflow-x-auto admin-horizontal-scrollbar">
                    {['cookie-policy', 'terms-of-service', 'privacy-policy'].map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedPage(type)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedPage === type
                                ? 'bg-primary text-white shadow-md'
                                : 'text-subtext hover:bg-white/10 hover:text-maintext'
                                }`}
                        >
                            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <label className={`flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-maintext rounded-xl font-bold text-sm transition-all border border-white/20 cursor-pointer ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isParsing ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <FileUp className="w-4 h-4" />}
                        {isParsing ? 'Parsing...' : 'Upload Document'}
                        <input
                            type="file"
                            className="hidden"
                            accept=".txt,.md,.pdf,.docx"
                            onChange={handleDocUpload}
                            disabled={isParsing}
                        />
                    </label>
                    <button
                        onClick={handleSave}
                        disabled={saving || isParsing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            <SectionCard
                title={`${selectedPage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Content Management`}
                action={
                    <button
                        onClick={addSection}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold text-maintext border border-white/10 transition-all"
                    >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Section
                    </button>
                }
            >
                <div className="space-y-8">
                    {pageData.sections.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                            <p className="text-subtext text-sm mb-4">No content found. Please create the first section to start building this page.</p>
                            <button
                                onClick={addSection}
                                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/20 transition-all"
                            >
                                Create First Section
                            </button>
                        </div>
                    )}
                    {pageData.sections.map((section, sIdx) => (
                        <div key={sIdx} className="relative bg-white/10 dark:bg-white/5 rounded-2xl p-6 border border-white/10">
                            <button
                                onClick={() => removeSection(sIdx)}
                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="mb-6 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Section Title</label>
                                <input
                                    value={section.title}
                                    onChange={e => updateSection(sIdx, 'title', e.target.value)}
                                    className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-primary/50 text-maintext"
                                />
                            </div>

                            <div className="space-y-6 ml-6 pl-6 border-l-2 border-primary/10">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary/50">Section Content Units</label>
                                    <button
                                        onClick={() => addContent(sIdx)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] bg-primary text-white hover:opacity-90 font-bold transition-all shadow-lg shadow-primary/20"
                                    >
                                        <Plus className="w-3 h-3" /> Add Content Unit
                                    </button>
                                </div>

                                {section.content.map((item, cIdx) => (
                                    <div key={cIdx} className="bg-white/5 dark:bg-black/40 rounded-2xl p-6 space-y-4 relative group border border-white/5 hover:border-primary/30 transition-all">
                                        <button
                                            onClick={() => removeContent(sIdx, cIdx)}
                                            className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                                <input
                                                    value={item.subtitle}
                                                    onChange={e => updateContent(sIdx, cIdx, 'subtitle', e.target.value)}
                                                    placeholder="Subtitle (e.g. 1.1 Eligibility)"
                                                    className={`w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-maintext placeholder:text-subtext/20 ${['General Terms', 'Policy Overview', 'Introduction', 'N/A', ''].includes(item.subtitle) ? 'opacity-20 italic font-normal' : ''}`}
                                                />
                                            </div>
                                            <textarea
                                                value={item.text}
                                                onChange={e => updateContent(sIdx, cIdx, 'text', e.target.value)}
                                                rows={3}
                                                className="w-full bg-transparent border-none p-0 text-xs outline-none text-subtext resize-none placeholder:text-subtext/30"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
};

// ─── Loading Spinner Removed (Moved to Top) ───

// ═══════════════════════════════
// KNOWLEDGE BASE TAB
// ═══════════════════════════════
const KnowledgeBaseTab = () => {
    const { t } = useLanguage();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUploadSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        toast.success(t('uploadSuccessKnowledge'));
    };

    return (
        <div className="space-y-6">
            <Suspense fallback={<div className="p-8 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>}>
                <SectionCard
                    title={t('ingestNewKnowledge')}
                    action={<span className="text-xs text-subtext font-medium">{t('addFilesWebsitesRAG')}</span>}
                >
                    <KnowledgeUpload onUploadSuccess={handleUploadSuccess} />
                </SectionCard>

                <SectionCard title={t('knowledgeAssetsManagement')}>
                    <KnowledgeManagement key={refreshTrigger} />
                </SectionCard>
            </Suspense>
        </div>
    );
};


// ═══════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════
const AdminDashboard = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('overview'); 
    const navigate = useNavigate();

    // Verify admin access
    const user = getUserData();
    const isAdmin = user?.token && (user?.email === ADMIN_EMAIL || user?.role === 'admin');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard/chat', { replace: true });
        }
    }, [isAdmin, navigate]);

    if (!isAdmin) return null;

    const tabs = [
        { id: 'overview', label: t('overview'), icon: BarChart3 },
        { id: 'users', label: t('users'), icon: Users },
        { id: 'plans', label: t('plans'), icon: CreditCard },
        { id: 'tool-limit', label: t('toolLimit') || 'Tool Limit', icon: Shield },
        { id: 'legal', label: t('legalPages'), icon: FileText },
        { id: 'helpdesk', label: t('helpDesk'), icon: Headphones },
        { id: 'knowledge', label: t('knowledge'), icon: BookOpen },
        { id: 'settings', label: t('settings'), icon: Settings },
    ];

    const renderTab = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab />;
            case 'users': return <UsersTab />;
            case 'plans': return <PlansTab />;
            case 'tool-limit': return <ToolLimitTab />;
            case 'legal': return <LegalPagesTab />;
            case 'helpdesk': return <AdminHelpDesk isOpen={true} isEmbedded={true} />;
            case 'knowledge': return <KnowledgeBaseTab />;
            case 'settings': return <SettingsTab />;
            default: return <OverviewTab />;
        }
    };



    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/10 overflow-hidden">
                            <img src={logo} alt="AISA" className="w-9 h-9 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-maintext tracking-tight">{t('adminDashboard')}</h1>
                            <p className="text-xs text-subtext font-semibold uppercase tracking-wider">{t('platformManagementConsole')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/chat')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-subtext hover:text-maintext hover:bg-white/20 dark:hover:bg-white/10 transition-all border border-white/20 dark:border-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" /> {t('backToChat')}
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 admin-horizontal-scrollbar">
                    {tabs.map(tab => (
                        <TabButton
                            key={tab.id}
                            active={activeTab === tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            onClick={() => setActiveTab(tab.id)}
                        />
                    ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderTab()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminDashboard;
