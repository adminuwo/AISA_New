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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={Users} label={t('totalUsers')} value={stats?.totalUsers ?? 0} />
                <StatCard icon={Activity} label={t('activeSubscriptions')} value={stats?.activeSubscriptions ?? 0} color="emerald-500" />
                <StatCard icon={DollarSign} label={t('totalRevenue')} value={`₹${stats?.totalRevenue ?? 0}`} color="amber-500" />
                <StatCard icon={Zap} label={t('creditsUsed')} value={stats?.totalCreditsUsed ?? 0} color="violet-500" />
                <StatCard icon={Headphones} label={t('support')} value={stats?.pendingTickets ?? 0} color="primary" trend={stats?.pendingTickets > 0 ? "Action Required" : "All Clear"} />
            </div>

            {stats?.toolUsage && stats.toolUsage.length > 0 && (
                <SectionCard title={t('toolUsageAnalytics')}>
                    <div className="space-y-3">
                        {stats.toolUsage.map((tool, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-white/10">
                                <span className="font-semibold text-maintext text-sm">{tool._id || 'Unknown'}</span>
                                <div className="flex items-center gap-4 text-xs text-subtext">
                                    <span>{tool.count} uses</span>
                                    <span className="font-bold text-primary">{tool.totalCredits} credits</span>
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
    const [creditAmount, setCreditAmount] = useState('');
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

    const handleAdjustCredits = async (userId, amount = null, absoluteCredits = null) => {
        if (amount === null && absoluteCredits === null && !creditAmount) return;
        
        const payload = { userId };
        if (amount !== null) payload.amount = amount;
        else if (absoluteCredits !== null) payload.credits = absoluteCredits;
        else payload.credits = parseInt(creditAmount);

        try {
            const response = await fetch(`${API}/admin/adjust-credits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getUserData()?.token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Credits adjusted successfully!');
                setCreditAmount('');
                fetchUsers();
            } else {
                toast.error(data.message || 'Failed');
            }
        } catch (err) {
            toast.error('Failed to adjust credits');
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

                        {/* Expanded Management Panel */}
                        <AnimatePresence>
                            {selectedUser === (user._id || user.id) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Adjust Credits */}
                                        <div className="bg-white/10 dark:bg-black/10 rounded-xl p-4 space-y-3">
                                            <h4 className="font-bold text-sm text-maintext flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-500" /> {t('transferCredits')}
                                            </h4>
                                            <p className="text-xs text-subtext">{t('userBalance')}: <span className="font-bold text-maintext">{user.credits ?? 0}</span></p>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-maintext font-black text-sm opacity-60">+</div>
                                                <input
                                                    type="number"
                                                    placeholder={t('amountToSend')}
                                                    value={creditAmount}
                                                    onChange={e => setCreditAmount(e.target.value)}
                                                    className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm outline-none focus:border-amber-500/50 text-maintext font-bold"
                                                    min="1"
                                                />
                                            </div>
                                            {creditAmount && parseInt(creditAmount) > 0 && (
                                                <div className="px-1 flex items-center gap-2 text-[11px] text-amber-500 font-bold">
                                                    <Activity className="w-3 h-3" />
                                                    New Balance: {(user.credits ?? 0) + parseInt(creditAmount)} Credits
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    handleAdjustCredits(user._id || user.id, parseInt(creditAmount));
                                                }}
                                                disabled={!creditAmount || parseInt(creditAmount) <= 0}
                                                className="w-full py-2 bg-amber-500 text-white rounded-lg font-bold text-xs disabled:opacity-40 hover:bg-amber-600 transition-all flex justify-center items-center gap-2"
                                            >
                                                {t('sendCredits')}
                                            </button>
                                        </div>

                                        {/* Manual Plan Upgrade */}
                                        <div className="bg-white/10 dark:bg-black/10 rounded-xl p-4 space-y-3">
                                            <h4 className="font-bold text-sm text-maintext flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-primary" /> {t('manualPlanUpgrade')}
                                            </h4>
                                            <select
                                                value={upgradeData.planName}
                                                onChange={e => {
                                                    const selectedPlanName = e.target.value;
                                                    setUpgradeData(p => ({ ...p, planName: selectedPlanName }));
                                                    const planCredits = availablePlans.find(p => p.planName === selectedPlanName)?.credits || 0;
                                                    setCreditAmount(planCredits.toString());
                                                }}
                                                className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-primary/50 text-maintext"
                                            >
                                                <option value="" disabled className="bg-slate-50 dark:bg-zinc-900 text-subtext">{t('selectPlan') || 'Select Plan'}</option>
                                                {availablePlans.map(plan => (
                                                    <option key={plan._id} value={plan.planName} className="bg-slate-50 dark:bg-zinc-900 text-maintext">
                                                        {plan.planName}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="date"
                                                value={upgradeData.expiryDate}
                                                onChange={e => setUpgradeData(p => ({ ...p, expiryDate: e.target.value }))}
                                                className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-primary/50 text-maintext"
                                            />
                                            {upgradeData.planName && (
                                                <div className="px-1 flex items-center gap-2 text-[11px] text-amber-500 font-bold">
                                                    <Zap className="w-3 h-3" />
                                                    Plan Includes: {availablePlans.find(p => p.planName === upgradeData.planName)?.credits || 0} Credits
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleManualUpgrade(user._id || user.id)}
                                                disabled={!upgradeData.planName || isUpgrading === (user._id || user.id)}
                                                className="w-full py-2 bg-primary text-white rounded-lg font-bold text-xs disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isUpgrading === (user._id || user.id) ? (
                                                    <>
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                        {t('upgrading') || 'Upgrading...'}
                                                    </>
                                                ) : (
                                                    t('upgradePlan') || 'Upgrade Plan'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
        credits: '',
        creditsYearly: '',
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
                ...form,
                priceMonthly: Number(form.priceMonthly),
                priceYearly: Number(form.priceYearly),
                credits: Number(form.credits),
                creditsYearly: Number(form.creditsYearly),
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
            credits: plan.credits?.toString() || '',
            creditsYearly: plan.creditsYearly?.toString() || '',
            features: (plan.features || []).join(', ')
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({ planId: '', planName: '', priceMonthly: '', priceYearly: '', credits: '', creditsYearly: '', features: '' });
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input placeholder="Plan ID (e.g. starter-plan)" value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                                <input placeholder="Plan Name" value={form.planName} onChange={e => setForm(p => ({ ...p, planName: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                                <input placeholder="Price Monthly (₹)" type="number" value={form.priceMonthly} onChange={e => setForm(p => ({ ...p, priceMonthly: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                <input placeholder="Price Yearly (₹)" type="number" value={form.priceYearly} onChange={e => setForm(p => ({ ...p, priceYearly: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                <input placeholder="Credits (Monthly)" type="number" value={form.credits} onChange={e => setForm(p => ({ ...p, credits: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                <input placeholder="Credits (Yearly)" type="number" value={form.creditsYearly} onChange={e => setForm(p => ({ ...p, creditsYearly: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                            </div>
                            <input placeholder="Features (comma-separated)" value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))}
                                className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
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
                        <div className="space-y-1 text-xs text-subtext">
                            <p className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-amber-500" />
                                <span className="font-semibold text-maintext">{plan.credits}</span> / {plan.creditsYearly || plan.credits * 12} credits (M/Y)
                            </p>
                            <p className="flex items-center gap-2 text-[10px] opacity-70">
                                <CreditCard className="w-3 h-3" />
                                ID: {plan.planId}
                            </p>
                            {plan.features && plan.features.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                                    {plan.features.map((f, i) => (
                                        <p key={i} className="flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-green-500" /> {f}
                                        </p>
                                    ))}
                                </div>
                            )}
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
// PACKAGES TAB
// ═══════════════════════════════
const PackagesTab = () => {
    const { t } = useLanguage();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPkg, setEditingPkg] = useState(null);
    const [form, setForm] = useState({ name: '', credits: '', price: '', description: '' });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, pkgId: null });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const data = await apiService.getPackages();
            setPackages(Array.isArray(data) ? data : data.packages || []);
        } catch (err) {
            console.error('Failed to fetch packages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const body = { ...form, credits: Number(form.credits), price: Number(form.price) };
            
            let data;
            if (editingPkg) {
                data = await apiService.updatePackage(editingPkg._id, body);
            } else {
                data = await apiService.createPackage(body);
            }

            if (data.success) {
                toast.success(editingPkg ? 'Package updated' : 'Package created');
                resetForm();
                fetchPackages();
            }
        } catch (err) {
            toast.error('Failed to save package');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.pkgId) return;
        try {
            await apiService.deletePackage(deleteModal.pkgId);
            toast.success('Package deleted');
            setDeleteModal({ isOpen: false, pkgId: null });
            fetchPackages();
        } catch (err) {
            toast.error('Failed to delete package');
            setDeleteModal({ isOpen: false, pkgId: null });
        }
    };

    const startEdit = (pkg) => {
        setEditingPkg(pkg);
        setForm({ name: pkg.name || '', credits: pkg.credits?.toString() || '', price: pkg.price?.toString() || '', description: pkg.description || '' });
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({ name: '', credits: '', price: '', description: '' });
        setEditingPkg(null);
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
                    <Plus className="w-4 h-4" /> New Package
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-4">
                            <h3 className="font-bold text-maintext">{editingPkg ? 'Edit Package' : 'Create New Package'}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input placeholder="Package Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                                <input placeholder="Credits" type="number" value={form.credits} onChange={e => setForm(p => ({ ...p, credits: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                                <input placeholder="Price (₹)" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                                    className="bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext no-spinner" />
                            </div>
                            <input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                className="w-full bg-white/20 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-maintext" />
                            <div className="flex gap-3 justify-end">
                                <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm font-bold text-subtext hover:text-maintext hover:bg-white/20 transition-all">Cancel</button>
                                <button onClick={handleSubmit} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                    {editingPkg ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                    <div key={pkg._id} className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:border-primary/20 transition-all">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-bold text-maintext">{pkg.name}</h4>
                                <p className="text-xs text-subtext mt-1">{pkg.description}</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => startEdit(pkg)} className="p-2 rounded-lg hover:bg-primary/10 text-subtext hover:text-primary transition-all"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => setDeleteModal({ isOpen: true, pkgId: pkg._id })} className="p-2 rounded-lg hover:bg-red-500/10 text-subtext hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-primary">₹{pkg.price}</span>
                            <span className="text-xs text-subtext font-semibold">{pkg.credits} credits</span>
                        </div>
                    </div>
                ))}
                {packages.length === 0 && <p className="text-subtext text-sm col-span-full text-center py-8">No packages created yet</p>}
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, pkgId: null })}
                onConfirm={handleDelete}
                title="Delete Package?"
                description="Are you sure you want to delete this package? This action cannot be undone."
            />
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
// FEATURE CREDITS TAB
// ═══════════════════════════════
const FeatureCreditsTab = () => {
    const { t } = useLanguage();
    const [features, setFeatures] = useState([]);
    const [modifiedFeatures, setModifiedFeatures] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAiAdsModal, setShowAiAdsModal] = useState(false);
    const AI_ADS_FEATURES = [
        'ai_ads_agent', 'gemini_flash', 'activate_strategy', 'generate_content', 'regenerate_content',
        'strategy_7days', 'strategy_1x_week', 'strategy_3x_week', 'strategy_daily', 'strategy_2x_daily'
    ];

    const fetchFeatures = async () => {
        try {
            const res = await apiService.getFeatureCredits();
            if (res.success && res.features) {
                setFeatures(res.features.sort((a, b) => a.category.localeCompare(b.category)));
                setModifiedFeatures({});
            }
        } catch (err) {
            toast.error(t('failedToLoadFeatureCredits') || "Failed to load feature credits");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFeatures(); }, []);

    const handleFeatureChange = (id, field, value) => {
        setModifiedFeatures(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSaveChanges = async () => {
        const changes = Object.entries(modifiedFeatures);
        if (changes.length === 0) return;

        setSaving(true);
        try {
            // Batch update visually by executing promises
            await Promise.all(changes.map(async ([id, data]) => {
                const original = features.find(f => f._id === id);
                const updatePayload = {
                    cost: data.cost !== undefined ? Number(data.cost) : original.cost,
                    uiLabel: data.uiLabel !== undefined ? data.uiLabel : original.uiLabel
                };
                await apiService.updateFeatureCredit(id, updatePayload);
            }));
            
            toast.success(t('featureCostsUpdated') || 'All feature costs updated successfully!');
            fetchFeatures();
        } catch (error) {
            toast.error(t('failedToSaveFeatures') || 'Failed to save some features');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    // Group features by category
    const grouped = features.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {});

    const hasChanges = Object.keys(modifiedFeatures).length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-4 flex-1">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-maintext">{t('creditCostEconomics')}</h4>
                        <p className="text-xs text-subtext mt-1">{t('platformEconomicsDesc')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={fetchFeatures}
                        className="px-4 py-2 bg-white/10 dark:bg-black/20 text-maintext rounded-xl font-bold text-sm hover:bg-white/20 transition-all border border-white/20 flex items-center gap-2"
                        disabled={saving}
                    >
                        <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} /> {t('reset')}
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges || saving}
                        className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            hasChanges && !saving
                                ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105'
                                : 'bg-white/5 text-subtext cursor-not-allowed border border-white/10'
                        }`}
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('saveChanges')}
                    </button>
                </div>
            </div>

            {Object.entries(grouped).map(([category, items]) => {
                const isAdvanceCategory = category === 'AISA Advance Feature';
                const regularFeatures = isAdvanceCategory ? items.filter(f => !AI_ADS_FEATURES.includes(f.featureKey)) : items;
                const aiAdsFeatures = isAdvanceCategory ? items.filter(f => AI_ADS_FEATURES.includes(f.featureKey)) : [];

                return (
                    <SectionCard key={category} title={category}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render AI ADS Combined Card first if applicable */}
                            {isAdvanceCategory && aiAdsFeatures.length > 0 && (
                                <div 
                                    onClick={() => setShowAiAdsModal(true)}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 relative flex flex-col justify-between hover:bg-white/10 hover:border-primary/50 transition-colors cursor-pointer group"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-subtext uppercase tracking-wider mb-1">AI_ADS_AGENT_SUITE</p>
                                        <h3 className="font-bold text-maintext text-lg">AI ADS™ Credits</h3>
                                        <p className="text-xs text-subtext mt-1.5">Manage credit costs for Visuals, Strategy, Content, and Brand Scraping.</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                                        <p className="text-xs text-primary font-bold group-hover:text-primary transition-colors">Configure {aiAdsFeatures.length} Features</p>
                                        <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center">
                                            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Render Regular Features */}
                            {regularFeatures.map(f => {
                                const mod = modifiedFeatures[f._id] || {};
                                const currentCost = mod.cost !== undefined ? mod.cost : f.cost;
                                const currentLabel = mod.uiLabel !== undefined ? mod.uiLabel : f.uiLabel;
                                const isChanged = mod.cost !== undefined || mod.uiLabel !== undefined;
                                
                                return (
                                    <div key={f._id} className={`bg-white/5 border rounded-xl p-4 relative flex flex-col justify-between transition-colors ${isChanged ? 'border-primary/50' : 'border-white/10'}`}>
                                        <div>
                                            <p className="text-xs font-bold text-subtext uppercase tracking-wider mb-1">{f.featureKey}</p>
                                            <input 
                                                type="text" 
                                                className="font-bold text-maintext bg-transparent border-none p-0 outline-none w-full"
                                                value={currentLabel}
                                                onChange={(e) => handleFeatureChange(f._id, 'uiLabel', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-xs text-subtext font-medium">Credit Cost</p>
                                            <div className="flex items-center bg-black/20 rounded-lg w-24 overflow-hidden border border-transparent focus-within:border-primary/50 transition-colors">
                                                <input
                                                    type="number"
                                                    className="bg-transparent border-none outline-none text-right font-black text-primary text-lg w-full p-2 no-spinner"
                                                    value={currentCost}
                                                    onChange={(e) => handleFeatureChange(f._id, 'cost', e.target.value)}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                );
            })}

            {/* AI ADS Credit System Modal */}
            {showAiAdsModal && (() => {
                // Pull live base costs from DB features (editable)
                const getBase = (key) => {
                    const f = features.find(f => f.featureKey === key);
                    if (!f) return 0;
                    const mod = modifiedFeatures[f._id];
                    return mod?.cost !== undefined ? Number(mod.cost) : f.cost;
                };
                const baseScrape     = getBase('gemini_flash');
                const baseStrategy   = getBase('activate_strategy');
                const baseVisual     = getBase('ai_ads_agent');
                const baseContent    = getBase('generate_content');
                const baseRegen      = getBase('regenerate_content');

                // Dynamic strategy costs (frequency-based)
                const strategyRows = [
                    { key: 'strategy_7days',    label: '7 Days (Starter)',      days: 7,  posts: 7,   freeOnly: true },
                    { key: 'strategy_1x_week',  label: '1x per week',           days: 30, posts: 4,   freeOnly: false },
                    { key: 'strategy_3x_week',  label: '3x per week',           days: 30, posts: 12,  freeOnly: false },
                    { key: 'strategy_daily',    label: 'Daily',                 days: 30, posts: 30,  freeOnly: false },
                    { key: 'strategy_2x_daily', label: '2x Daily (High Growth)', days: 30, posts: 60,  freeOnly: false },
                ];

                // Carousel costs (ai_ads_agent base × slides)
                const carouselRows = [
                    { slides: 2, credits: baseVisual * 2 },
                    { slides: 3, credits: baseVisual * 3 },
                    { slides: 4, credits: baseVisual * 4 },
                ];

                const FIXED_KEYS = [
                    { key: 'brand_setup',        label: 'Brand Setup Save',         note: 'No AI call — always free' },
                    { key: 'gemini_flash',        label: 'Website Scraping',         note: 'Per scrape (Gemini Flash)' },
                    { key: 'generate_content',    label: 'Content Generation',       note: 'Per calendar row' },
                    { key: 'regenerate_content',  label: 'Regeneration / Hashtags',  note: 'Per re-roll' },
                    { key: 'ai_ads_agent',        label: 'Visual Post (Single)',      note: 'GPT-4 + Imagen 3 per image' },
                ];

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-surface dark:bg-[#0e0e0e] border border-border/50 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

                            {/* Header */}
                            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-maintext">AI ADS™ Credit System</h3>
                                        <p className="text-xs text-subtext mt-0.5">Full pricing matrix — edit base costs, dynamic costs auto-calculate</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAiAdsModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-subtext">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">

                                {/* ── SECTION 1: FIXED BASE COSTS ── */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-maintext">Fixed Base Costs</h4>
                                        <span className="text-[10px] text-subtext ml-1">(editable — saved to DB)</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {FIXED_KEYS.map(({ key, label, note }) => {
                                            const f = features.find(f => f.featureKey === key);
                                            if (!f) return null;
                                            const mod = modifiedFeatures[f._id] || {};
                                            const currentCost  = mod.cost !== undefined ? mod.cost : f.cost;
                                            const isChanged    = mod.cost !== undefined || mod.uiLabel !== undefined;
                                            const isFree       = key === 'brand_setup';
                                            return (
                                                <div key={f._id} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-all ${isChanged ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-subtext">{key}</p>
                                                        <p className="text-sm font-bold text-maintext truncate">{label}</p>
                                                        <p className="text-[10px] text-subtext/70 mt-0.5">{note}</p>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 border shrink-0 ${isFree ? 'bg-green-500/10 border-green-500/20' : 'bg-black/20 border-transparent focus-within:border-primary/50'}`}>
                                                        {isFree ? (
                                                            <span className="text-green-400 font-black text-lg w-10 text-right">FREE</span>
                                                        ) : (
                                                            <>
                                                                <input
                                                                    type="number"
                                                                    className="bg-transparent border-none outline-none text-right font-black text-primary text-xl w-16 no-spinner"
                                                                    value={currentCost}
                                                                    onChange={(e) => handleFeatureChange(f._id, 'cost', e.target.value)}
                                                                    min="0"
                                                                />
                                                                <span className="text-[10px] text-subtext font-bold">cr</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── SECTION 2: STRATEGY DYNAMIC COSTS ── */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-maintext">Strategy Activation — Dynamic Pricing</h4>
                                        <span className="text-[10px] text-subtext ml-1">(editable — saved to DB)</span>
                                    </div>
                                    <div className="rounded-xl border border-white/10 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/10">
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-subtext">Posting Frequency</th>
                                                    <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-subtext">Days</th>
                                                    <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-subtext">Posts</th>
                                                    <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-subtext">Credits</th>
                                                    <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-subtext">Plan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {strategyRows.map((row, i) => {
                                                    const f = features.find(feat => feat.featureKey === row.key);
                                                    if (!f) return null;
                                                    const mod = modifiedFeatures[f._id] || {};
                                                    const currentCost = mod.cost !== undefined ? mod.cost : f.cost;
                                                    return (
                                                    <tr key={i} className={`border-b border-white/5 last:border-0 ${row.freeOnly ? 'bg-green-500/5' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <span className="font-bold text-maintext text-sm">{row.label}</span>
                                                        </td>
                                                        <td className="px-3 py-3 text-center text-subtext text-xs font-medium">{row.days}d</td>
                                                        <td className="px-3 py-3 text-center text-subtext text-xs font-medium">{row.posts}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <input
                                                                    type="number"
                                                                    className="bg-black/20 border border-transparent focus:border-primary/50 outline-none text-right font-black text-primary text-base w-16 px-2 py-1 rounded no-spinner"
                                                                    value={currentCost}
                                                                    onChange={(e) => handleFeatureChange(f._id, 'cost', e.target.value)}
                                                                    min="0"
                                                                />
                                                                <span className="text-subtext text-[10px]">cr</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {row.freeOnly
                                                                ? <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-black">FREE + PRO</span>
                                                                : <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">🔒 PRO</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                )})}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-subtext mt-2 ml-1">
                                        ⚠️ Free plan users are always forced to <strong>7 Days = 14 credits</strong>. Other frequencies require a paid plan.
                                    </p>
                                </div>

                                {/* ── SECTION 3: CAROUSEL DYNAMIC COSTS ── */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 bg-violet-400 rounded-full" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-maintext">Carousel — Dynamic Pricing</h4>
                                        <span className="text-[10px] text-subtext ml-1">(Visual base × slide count)</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {carouselRows.map((row) => (
                                            <div key={row.slides} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                                                <div className="flex justify-center gap-0.5 mb-2">
                                                    {Array.from({ length: row.slides }).map((_, i) => (
                                                        <div key={i} className="w-4 h-6 rounded bg-primary/30 border border-primary/20" />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-subtext font-bold uppercase tracking-wide mb-1">{row.slides} Slides</p>
                                                <p className="text-2xl font-black text-primary">{row.credits}</p>
                                                <p className="text-[10px] text-subtext">credits</p>
                                                <p className="text-[10px] text-subtext/50 mt-1">{baseVisual} × {row.slides}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-subtext mt-2 ml-1">❌ Carousel posts are <strong>blocked</strong> for free plan users.</p>
                                </div>

                                {/* ── SECTION 4: FREE PLAN RULES ── */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 bg-red-400 rounded-full" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-maintext">Free Plan Rules (500 Credits)</h4>
                                        <span className="text-[10px] text-subtext ml-1">(enforced in backend middleware)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            { icon: '🌐', rule: 'Website Scraping', limit: 'Max 2 scrapes (lifetime)', action: '3rd attempt → UPGRADE_REQUIRED → Upgrade modal', color: 'amber' },
                                            { icon: '📅', rule: 'Content Calendar', limit: 'Hard-capped at 7 days', action: 'Backend forces maxDays=7 regardless of selection', color: 'blue' },
                                            { icon: '🎨', rule: 'Visual Posts', limit: 'Completely blocked', action: 'PLAN_RESTRICTED 403 → Upgrade modal', color: 'red' },
                                            { icon: '🖼️', rule: 'Carousel Posts', limit: 'Completely blocked', action: 'Same as visual posts', color: 'red' },
                                            { icon: '📊', rule: 'Posting Frequency', limit: 'Only "7 Days (Starter)"', action: 'Other options show 🔒 PRO lock in dropdown', color: 'violet' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                                                <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-maintext">{item.rule}</p>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                            item.color === 'red' ? 'bg-red-500/15 text-red-400' :
                                                            item.color === 'amber' ? 'bg-amber-500/15 text-amber-400' :
                                                            item.color === 'blue' ? 'bg-blue-500/15 text-blue-400' :
                                                            'bg-violet-500/15 text-violet-400'
                                                        }`}>{item.limit}</span>
                                                    </div>
                                                    <p className="text-[10px] text-subtext mt-0.5">{item.action}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
                                <p className="text-[10px] text-subtext">
                                    {Object.keys(modifiedFeatures).length > 0
                                        ? <span className="text-amber-400 font-bold">⚠ {Object.keys(modifiedFeatures).length} unsaved changes — click Save to apply</span>
                                        : 'Changes to base costs are reflected in all dynamic calculations above.'}
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => setShowAiAdsModal(false)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/10 text-maintext hover:bg-white/20 transition-colors">
                                        Close
                                    </button>
                                    {Object.keys(modifiedFeatures).length > 0 && (
                                        <button
                                            onClick={() => { handleSaveChanges(); setShowAiAdsModal(false); }}
                                            disabled={saving}
                                            className="px-5 py-2 rounded-xl font-bold text-sm bg-primary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
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
        { id: 'packages', label: t('packages'), icon: Package },
        { id: 'credits', label: t('toolCosts'), icon: Zap },
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
            case 'packages': return <PackagesTab />;
            case 'credits': return <FeatureCreditsTab />;
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
