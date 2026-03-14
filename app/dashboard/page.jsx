'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getUserContracts, getFreelancerContracts, getReviewsForUser } from '@/lib/firestore';
import { getStatusColor } from '@/lib/store';
import { TrendingUp, Lock, CheckCircle, Clock, ArrowRight, Plus, Globe, AlertTriangle, Briefcase, Copy, Check, Wallet, Building2, Shield, Users, Search, Bell, ClipboardList, Star } from 'lucide-react';

export default function DashboardPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || !profile) return;
        setLoading(true);
        const fetchContracts = profile.role === 'freelancer'
            ? getFreelancerContracts(profile.email)
            : getUserContracts(user.uid);

        fetchContracts
            .then(setContracts)
            .catch(err => {
                console.error("Dashboard fetch error:", err);
                setError(err.message || "Failed to load contracts.");
            })
            .finally(() => setLoading(false));
    }, [user, profile]);

    const sum = (fn) => contracts.reduce(fn, 0);
    const totalValue = sum((s, c) => s + (c.totalValue || 0));
    const totalLocked = sum((s, c) => s + (c.milestones || []).filter(m => m.status !== 'Approved').reduce((a, m) => a + m.amount, 0));
    const totalReleased = sum((s, c) => s + (c.milestones || []).filter(m => m.status === 'Approved').reduce((a, m) => a + m.amount, 0));

    const isFreelancer = profile?.role === 'freelancer';

    if (error) return (
        <AuthGuard><Navbar />
            <div className="min-h-screen bg-surface pt-24 px-6 flex flex-col items-center">
                <Card className="p-8 border-red-200 bg-red-50 flex flex-col items-center text-center gap-2 max-w-md">
                    <AlertTriangle className="text-red-500 mb-2" size={32} />
                    <h3 className="font-bold text-red-900">Failed to load dashboard</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="btn-primary mt-4 bg-red-600 hover:bg-red-700 hover:shadow-red-500/20">
                        Retry Connection
                    </button>
                </Card>
            </div>
        </AuthGuard>
    );

    if (loading) return (
        <AuthGuard><Navbar />
            <div className="min-h-screen bg-surface pt-16 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: '#ffb43b', borderTopColor: 'transparent' }} />
            </div>
        </AuthGuard>
    );

    return isFreelancer
        ? <FreelancerDashboard contracts={contracts} totalValue={totalValue} totalLocked={totalLocked} totalReleased={totalReleased} profile={profile} />
        : <ClientDashboard contracts={contracts} totalValue={totalValue} totalLocked={totalLocked} totalReleased={totalReleased} profile={profile} />;
}

// ==========================================
// CLIENT DASHBOARD (New Professional UI)
// ==========================================
function ClientDashboard({ contracts, totalValue, totalLocked, totalReleased, profile }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const activeContracts = contracts.filter(c => c.status !== 'Agreement');

    // Using totalValue, totalLocked, totalReleased passed from props which are based on all contracts.
    // Progress calculation for donut
    const releasedPercentage = totalValue > 0 ? (totalReleased / totalValue) * 100 : 0;
    const lockedPercentage = totalValue > 0 ? (totalLocked / totalValue) * 100 : 0;

    // Fetch the client's average rating
    const [avgRating, setAvgRating] = useState(null);
    const { user } = useAuth();
    useEffect(() => {
        if (user?.email) {
            getReviewsForUser(user.email)
                .then(reviews => {
                    if (reviews.length > 0) {
                        const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
                        setAvgRating(avg.toFixed(1));
                    }
                })
                .catch(() => { });
        }
    }, [user?.email]);

    return (
        <AuthGuard>
            <Navbar />
            <div className="pt-16">
                {/* Custom Top Bar for Client Dashboard to match the design */}
                <div className="bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 py-4 sticky top-16 z-40 shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">Client Dashboard</h1>

                    <div className="flex-1 max-w-xl mx-8 hidden md:block relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search contracts, transactions..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#ffb43b] outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-[6px] right-[6px] w-[7px] h-[7px] bg-red-500 rounded-full border border-slate-50"></span>
                        </button>
                        <Link href="/new-contract" className="btn-primary rounded-full px-5 py-2 text-sm">
                            <Plus size={16} /> New Contract
                        </Link>
                    </div>
                </div>

                <div className="min-h-screen pt-8 pb-16" style={{ background: '#f7f7f5' }}>
                    <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                            {/* LEFT COLUMN: Main Dashboard Content */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Financial Health Row */}
                                <Card className="p-8 mb-8 overflow-hidden bg-white border border-slate-100 shadow-md rounded-[24px]">
                                    <div className="flex flex-col lg:flex-row items-center gap-12">
                                        {/* Left Stats Grid */}
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center justify-between mb-8">
                                                <h2 className="text-lg font-bold text-slate-900">Financial Health</h2>
                                                <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                                    +12% vs last month
                                                </div>
                                            </div>
                                            <div className="hidden lg:block w-px h-54 bg-slate-100"></div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                                                        <Wallet className="text-slate-600" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Total Contract Value</p>
                                                        <p className="text-2xl font-black text-slate-900">${totalValue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#fff8ec] flex items-center justify-center shrink-0">
                                                        <Lock className="text-[#ffb43b]" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Locked in Escrow</p>
                                                        <p className="text-2xl font-black text-slate-900">${totalLocked.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                            <Check className="text-white" size={14} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Released Funds</p>
                                                        <p className="text-2xl font-black text-slate-900">${totalReleased.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                                                        <ClipboardList className="text-purple-600" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Active Contracts</p>
                                                        <p className="text-2xl font-black text-slate-900">{activeContracts.length}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider line */}
                                        <div className="hidden lg:block w-px h-64 bg-slate-100"></div>

                                        {/* Right Donut Chart */}
                                        <div className="w-full lg:w-80 flex flex-col items-center justify-center">
                                            <div className="relative w-56 h-56 flex items-center justify-center rounded-full"
                                                style={{ background: `conic-gradient(#10b981 0% ${releasedPercentage}%, #ffb43b ${releasedPercentage}% ${releasedPercentage + lockedPercentage}%, #f1f5f9 ${releasedPercentage + lockedPercentage}% 100%)` }}>
                                                <div className="absolute inset-0 m-[18px] bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-sm">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</span>
                                                    <span className="text-3xl font-black text-slate-900">${totalValue.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-10 mt-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#ffb43b]"></div>
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Locked</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Released</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Escrow Capital Pipeline Card */}
                                <Card className="p-8 mb-10 bg-white border border-slate-100 shadow-sm rounded-[24px]">
                                    <h2 className="text-lg font-bold text-slate-900 mb-8">Escrow Capital Pipeline</h2>

                                    <div className="flex flex-col md:flex-row items-center justify-evenly relative max-w-5xl mx-auto py-4">

                                        {/* Client Wallets */}
                                        <div className="flex flex-col items-center text-center z-10 bg-white px-6">
                                            <div className="w-[72px] h-[72px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 text-slate-600 shadow-sm">
                                                <Building2 size={28} />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900">Client Wallets</h3>
                                            <p className="text-[11px] text-slate-400 mt-1">Funding Sources (ACH/Crypto)</p>
                                        </div>

                                        {/* Escrow Vault (Center) */}
                                        <div className="flex flex-col items-center text-center z-10 bg-white px-6 mt-10 md:mt-0">
                                            <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center mb-5 relative" style={{ background: '#fff8ec' }}>
                                                {/* Rotating dashed border for high-tech look */}
                                                <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-[#ffb43b] animate-[spin_12s_linear_infinite] opacity-60"></div>
                                                <div className="w-[60px] h-[60px] rounded-full bg-[#ffb43b] flex items-center justify-center shadow-lg shadow-[#ffb43b]/30 z-10">
                                                    <Shield size={28} className="text-white absolute shrink-0" />
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-bold text-[#ffb43b] mb-1.5">Escrow Vault</h3>
                                            <p className="text-2xl font-black text-slate-900">${totalLocked.toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Sig Secure</p>
                                        </div>

                                        {/* Freelancers */}
                                        <div className="flex flex-col items-center text-center z-10 bg-white px-6 mt-10 md:mt-0">
                                            <div className="w-[72px] h-[72px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 text-slate-600 shadow-sm">
                                                <Users size={28} />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900">Freelancers</h3>
                                            <p className="text-[11px] text-slate-400 mt-1">Cross-Border Settlement</p>
                                        </div>

                                    </div>
                                </Card>

                                {/* Active Contracts Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900">Active Contracts</h2>
                                    <button className="text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 px-5 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
                                        View All
                                    </button>
                                </div>

                                {/* Contracts Grid */}
                                {activeContracts.length === 0 ? (
                                    <Card className="p-12 flex flex-col items-center text-center gap-4 bg-white border border-slate-100 shadow-sm rounded-[24px]">
                                        <div className="text-5xl opacity-80">📋</div>
                                        <h3 className="text-xl font-bold text-slate-900 mt-2">No active contracts</h3>
                                        <p className="text-slate-500 text-sm max-w-sm">Create your first escrow contract and start securing your cross-border payments.</p>
                                        <Link href="/new-contract" className="btn-primary rounded-full px-6 py-3 mt-4">
                                            <Plus size={16} /> Create Contract
                                        </Link>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activeContracts.map((contract) => {
                                            const ms = contract.milestones || [];
                                            const releasedAmount = ms.filter(m => m.status === 'Approved').reduce((s, m) => s + (m.amount || 0), 0);
                                            const progress = contract.totalValue ? Math.round((releasedAmount / contract.totalValue) * 100) : 0;
                                            const approvedCount = ms.filter(m => m.status === 'Approved').length;

                                            // Pseudo-random colors for clients and freelancers avatars
                                            const avatarColors = ['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#dc2626'];
                                            const cIndex = contract.clientName.length % avatarColors.length;
                                            const fIndex = (contract.freelancerName.length + 1) % avatarColors.length;

                                            return (
                                                <Link key={contract.id} href={`/contract/${contract.id}`}>
                                                    <Card hover className="p-7 flex flex-col h-[280px] bg-white border border-slate-100 shadow-sm rounded-[24px] relative transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{contract.id?.slice(0, 8)}</span>
                                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${contract.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                                                                contract.status === 'Agreement' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-emerald-50 text-emerald-600'
                                                                }`}>
                                                                {contract.status}
                                                            </span>
                                                        </div>

                                                        <h3 className="text-[19px] font-bold text-slate-900 mb-6 line-clamp-2 leading-tight flex-1">
                                                            {contract.title}
                                                        </h3>

                                                        <div className="flex items-center gap-3 mb-8">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-[22px] h-[22px] rounded-full" style={{ background: avatarColors[cIndex] }}></div>
                                                                <span className="text-xs text-slate-700 font-medium">Client</span>
                                                            </div>
                                                            <ArrowRight size={14} className="text-slate-300 mx-1" />
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-[22px] h-[22px] rounded-full" style={{ background: avatarColors[fIndex] }}></div>
                                                                <span className="text-xs text-slate-700 font-medium truncate max-w-[100px]">
                                                                    {(contract.freelancerName.split(' ')[0] || 'User')} ({contract.freelancerCountry.slice(0, 2).toUpperCase()})
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-1">
                                                            <div className="flex justify-between items-end mb-5">
                                                                <span className="text-[13px] text-slate-500 font-medium">Contract Value</span>
                                                                <span className="text-[22px] font-black text-slate-900">${(contract.totalValue || 0).toLocaleString()}</span>
                                                            </div>

                                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest">
                                                                <span>Milestones ({approvedCount}/{ms.length})</span>
                                                                <span>{progress}%</span>
                                                            </div>
                                                            <div className="h-[6px] bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${progress}%`, background: '#2563eb' }}></div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Profile & Activity */}
                            <div className="lg:col-span-1 space-y-6 lg:space-y-8">
                                {/* Profile Card */}
                                <div className="rounded-[24px] p-8 flex flex-col items-center text-center shadow-md relative overflow-hidden"
                                    style={{ background: 'linear-gradient(135deg, #fcd34d 0%, #ffb43b 100%)' }}>
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>

                                    <div className="w-24 h-24 rounded-full bg-slate-200 border-[6px] border-[#fbb32f] mb-4 overflow-hidden shrink-0 shadow-lg">
                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.displayName || 'Client'}&backgroundColor=e2e8f0`} alt={profile?.displayName} className="w-full h-full object-cover" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">{profile?.displayName || 'Client'}</h2>
                                    <p className="text-sm font-medium text-orange-100 mt-1 mb-3 flex items-center justify-center">
                                        {profile?.country || 'Earth'}
                                    </p>
                                    {avgRating && (
                                        <div className="flex items-center justify-center gap-1.5 mb-4">
                                            <Star size={14} fill="#fff" stroke="#fff" />
                                            <span className="text-white font-black text-sm">{avgRating}</span>
                                            <span className="text-white/60 text-xs font-medium">avg rating</span>
                                        </div>
                                    )}

                                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold border-2 border-white/60 text-white transition-all hover:bg-white/10 w-full justify-center shadow-sm">
                                        <TrendingUp size={12} className="text-orange-200" /> Edit profile
                                    </button>
                                    <Link href={`/profile/${encodeURIComponent(user?.email || '')}`}
                                        className="mt-2 text-[10px] font-bold text-white/60 hover:text-white/90 transition-colors w-full text-center block">
                                        View public profile →
                                    </Link>
                                </div>

                                {/* Recent Activity */}
                                <Card className="p-7 rounded-[24px] shadow-sm border border-slate-100 bg-white">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-slate-900 text-[19px]">Recent Activity</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
                                    </div>

                                    {(() => {
                                        const events = [];
                                        for (const c of contracts) {
                                            if (c.createdAt) {
                                                const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                                                events.push({ type: 'created', date: d, contract: c });
                                            }
                                            for (const m of (c.milestones || [])) {
                                                if (m.status === 'Approved' && m.approvedAt) {
                                                    const d = m.approvedAt?.toDate ? m.approvedAt.toDate() : new Date(m.approvedAt);
                                                    events.push({ type: 'released', date: d, contract: c, milestone: m });
                                                } else if (m.status === 'Submitted' && m.submittedAt) {
                                                    const d = m.submittedAt?.toDate ? m.submittedAt.toDate() : new Date(m.submittedAt);
                                                    events.push({ type: 'submitted', date: d, contract: c, milestone: m });
                                                } else if (m.status === 'Rejected' && m.rejectedAt) {
                                                    const d = m.rejectedAt?.toDate ? m.rejectedAt.toDate() : new Date(m.rejectedAt);
                                                    events.push({ type: 'rejected', date: d, contract: c, milestone: m });
                                                }
                                            }
                                        }
                                        events.sort((a, b) => b.date - a.date);
                                        const recent = events.slice(0, 5);

                                        if (recent.length === 0) {
                                            return (
                                                <div className="text-center py-8">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                        <Clock size={18} className="text-slate-400" />
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium">No recent activity yet</p>
                                                    <p className="text-[11px] text-slate-300 mt-1">Activity will appear here as contracts progress.</p>
                                                </div>
                                            );
                                        }

                                        const typeConfig = {
                                            created: { label: 'Contract Created', badge: 'bg-blue-100 text-blue-700', dot: '#2563eb' },
                                            released: { label: 'Funds Released', badge: 'bg-emerald-100 text-emerald-700', dot: '#10b981' },
                                            submitted: { label: 'Work Submitted', badge: 'bg-yellow-100 text-yellow-700', dot: '#f59e0b' },
                                            rejected: { label: 'Milestone Rejected', badge: 'bg-red-100 text-red-700', dot: '#ef4444' },
                                        };

                                        return (
                                            <div className="space-y-5">
                                                {recent.map((ev, i) => {
                                                    const cfg = typeConfig[ev.type];
                                                    const dateStr = ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                    return (
                                                        <div key={i} className="flex gap-3 items-start border-b border-slate-50 pb-5 last:border-0 last:pb-0">
                                                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: cfg.dot }}></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 shrink-0">{dateStr}</span>
                                                                </div>
                                                                <Link href={`/contract/${ev.contract.id}`} className="hover:underline">
                                                                    <h4 className="font-bold text-slate-900 text-[13px] truncate">{ev.contract.title}</h4>
                                                                </Link>
                                                                {ev.milestone && (
                                                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                                        Milestone: {ev.milestone.title}
                                                                        {ev.type === 'released' && <span className="text-emerald-600 font-bold ml-1">+${ev.milestone.amount?.toLocaleString()}</span>}
                                                                    </p>
                                                                )}
                                                                {ev.type === 'created' && (
                                                                    <p className="text-[11px] text-slate-500 mt-0.5">with {ev.contract.freelancerName}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

// ==========================================
// FREELANCER DASHBOARD (New Professional UI)
// ==========================================
function FreelancerDashboard({ contracts, totalValue, totalLocked, totalReleased, profile }) {
    const router = useRouter();
    const firstName = (profile?.displayName || 'Freelancer').split(' ')[0];

    // Filter out contracts that haven't been accepted yet (Agreement) or are Rejected
    const activeContracts = contracts.filter(c => c.status !== 'Agreement' && c.status !== 'Rejected');

    // Recalculate stats based on active contracts only
    const sum = (fn) => activeContracts.reduce(fn, 0);
    const activeTotalValue = sum((s, c) => s + (c.totalValue || 0));
    const activeTotalReleased = sum((s, c) => {
        const released = (c.milestones || []).filter(m => m.status === 'Approved').reduce((ms, m) => ms + (m.amount || 0), 0);
        return s + released;
    });

    const overallProgress = activeTotalValue > 0 ? Math.round((activeTotalReleased / activeTotalValue) * 100) : 0;
    const completedContracts = activeContracts.filter(c => c.status === 'Completed').length;
    const completionRate = activeContracts.length > 0 ? Math.round((completedContracts / activeContracts.length) * 100) : 0;

    // ─── MONTHLY EARNINGS WAVE CHART ────────────────────────────────────────────
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentYear = new Date().getFullYear();

    // Build monthly totals from approved milestones
    const monthlyEarnings = Array(12).fill(0);
    for (const contract of contracts) {
        for (const milestone of (contract.milestones || [])) {
            if (milestone.status === 'Approved' && milestone.approvedAt) {
                // Firestore timestamps have .toDate() method; plain dates are JS dates
                const d = milestone.approvedAt?.toDate ? milestone.approvedAt.toDate() : new Date(milestone.approvedAt);
                if (d.getFullYear() === currentYear) {
                    monthlyEarnings[d.getMonth()] += (milestone.amount || 0);
                }
            }
        }
    }

    // Find peak month
    const peakValue = Math.max(...monthlyEarnings, 1);
    const peakMonthIdx = monthlyEarnings.indexOf(Math.max(...monthlyEarnings));

    // Generate SVG path points — map monthly earnings to y coords (120 = bottom, 10 = top)
    const SVG_W = 400;
    const SVG_H = 120;
    const points = monthlyEarnings.map((val, i) => ({
        x: (i / 11) * SVG_W,
        y: SVG_H - 10 - ((val / peakValue) * (SVG_H - 20)),
    }));

    // Build a smooth cubic bezier path through the points
    const buildPath = (pts) => {
        if (pts.length < 2) return '';
        let d = `M${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
            const cp1y = pts[i].y;
            const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) / 3;
            const cp2y = pts[i + 1].y;
            d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i + 1].x},${pts[i + 1].y}`;
        }
        return d;
    };

    const linePath = buildPath(points);
    const areaPath = linePath ? `${linePath} L${SVG_W},${SVG_H} L0,${SVG_H} Z` : '';
    const peakPoint = points[peakMonthIdx];
    // ─────────────────────────────────────────────────────────────────────────────

    return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen pt-16" style={{ background: '#fdfdfd' }}>
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-10">

                    {/* Top Welcome */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            Welcome back, {firstName}! <span>👋</span>
                        </h1>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all hover:bg-slate-50"
                            style={{ borderColor: '#ffb43b', color: '#ffb43b' }}>
                            <ArrowRight size={15} /> Download report
                        </button>
                    </div>

                    {/* Main Grid: Left Column (Analytics) + Right Column (Profile) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                        {/* LEFT COLUMN: Analytics & Table */}
                        <div className="lg:col-span-2 space-y-6 lg:space-y-8">

                            {/* Top Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Analytics Doughnut Card */}
                                <Card className="p-6 h-72 flex flex-col pt-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-900 text-lg">Analytics</h3>
                                        <ArrowRight size={18} className="text-slate-400 rotate-[-45deg]" />
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center relative -mt-4">
                                        {/* CSS Doughnut Chart — real overallProgress */}
                                        <div className="w-32 h-32 rounded-full flex items-center justify-center relative"
                                            style={{ background: `conic-gradient(#ffb43b 0% ${overallProgress}%, #1e293b ${overallProgress}% 100%)` }}>
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner relative z-10 flex-col">
                                                <span className="text-xl font-black text-slate-900">{overallProgress}%</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Released</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Sub Stats */}
                                    <div className="flex gap-4 mt-auto">
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="text-[#ffb43b]"><TrendingUp size={16} /></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{completionRate}%</div>
                                                <div className="text-[10px] text-slate-400">Completion rate</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="text-[#ffb43b]"><CheckCircle size={16} /></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{activeContracts.length}</div>
                                                <div className="text-[10px] text-slate-400">Active contracts</div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Earning Reports Card — real monthly data */}
                                <Card className="p-6 h-72 flex flex-col pt-5 overflow-hidden relative group">
                                    <div className="flex justify-between items-center z-10 relative">
                                        <h3 className="font-bold text-slate-900 text-lg">Earning reports</h3>
                                        <span className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg">Yearly</span>
                                    </div>

                                    <div className="mt-4 z-10 relative">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Income in {currentYear}</p>
                                        <div className="flex items-end gap-3">
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">${activeTotalReleased.toLocaleString()}</h2>
                                            {activeTotalReleased > 0 && (
                                                <span className="flex items-center text-xs font-bold text-[#10b981] mb-1.5 px-2 py-0.5 bg-[#ecfdf5] rounded-md">
                                                    Active <TrendingUp size={12} className="ml-1" />
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dynamic SVG Wave Chart */}
                                    <div className="absolute bottom-0 left-0 right-0 h-32 opacity-80 group-hover:opacity-100 transition-opacity">
                                        {activeTotalReleased > 0 ? (
                                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none" className="w-full h-full">
                                                <defs>
                                                    <linearGradient id="earningsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#ffb43b" stopOpacity="0.4" />
                                                        <stop offset="100%" stopColor="#ffb43b" stopOpacity="0.01" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M0 20 H400 M0 60 H400 M0 100 H400" stroke="#f1f5f9" strokeWidth="1" fill="none" />
                                                {areaPath && <path d={areaPath} fill="url(#earningsGradient)" />}
                                                {linePath && <path d={linePath} fill="none" stroke="#ffb43b" strokeWidth="3" />}
                                                {peakValue > 0 && <circle cx={peakPoint.x} cy={peakPoint.y} r="4" fill="#ffb43b" stroke="#fff" strokeWidth="2" />}
                                            </svg>
                                        ) : (
                                            // Empty state wave
                                            <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full opacity-30">
                                                <path d="M0 100 C100,100 200,100 400,100 L400,120 L0,120 Z" fill="#ffb43b" opacity="0.2" />
                                                <path d="M0 100 C100,100 200,100 400,100" fill="none" stroke="#ffb43b" strokeWidth="2" strokeDasharray="6 4" />
                                            </svg>
                                        )}
                                        {/* Tooltip on the peak month */}
                                        {activeTotalReleased > 0 && peakValue > 0 && (
                                            <div className="absolute bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded cursor-default shadow-lg"
                                                style={{
                                                    top: `${Math.max(2, (peakPoint.y / SVG_H) * 100 - 15)}%`,
                                                    left: `${Math.min(80, (peakPoint.x / SVG_W) * 100)}%`,
                                                    transform: 'translateX(-50%)'
                                                }}>
                                                ${monthlyEarnings[peakMonthIdx].toLocaleString()} · {MONTHS[peakMonthIdx]}
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900"></div>
                                            </div>
                                        )}
                                        {activeTotalReleased === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <p className="text-[10px] text-slate-400 font-semibold">No earnings yet — complete a milestone!</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-4 left-6 flex gap-3 text-[9px] text-slate-400 font-bold z-10">
                                        {MONTHS.map(m => <span key={m}>{m}</span>)}
                                    </div>
                                </Card>

                            </div>

                            {/* Active Projects Table */}
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    Active projects <span className="text-sm text-slate-400 font-medium">({activeContracts.length})</span>
                                </h3>
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="text-xs text-slate-400 font-medium bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-4 font-medium">Client Name</th>
                                                    <th className="px-5 py-4 font-medium">Project</th>
                                                    <th className="px-5 py-4 font-medium">Price</th>
                                                    <th className="px-5 py-4 font-medium">Deadline</th>
                                                    <th className="px-5 py-4 font-medium">Progress</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeContracts.map(contract => {
                                                    const ms = contract.milestones || [];
                                                    const releasedAmount = ms.filter(m => m.status === 'Approved').reduce((s, m) => s + (m.amount || 0), 0);
                                                    const progress = contract.totalValue ? Math.round((releasedAmount / contract.totalValue) * 100) : 0;

                                                    // Generate a pseudo-random avatar background color based on name
                                                    const avatarColors = ['#fecdd3', '#fed7aa', '#fde047', '#bbf7d0', '#bfdbfe', '#e9d5ff'];
                                                    const colorIndex = contract.clientName.length % avatarColors.length;

                                                    return (
                                                        <tr key={contract.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/contract/${contract.id}`)}>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-slate-700"
                                                                        style={{ background: avatarColors[colorIndex] }}>
                                                                        {contract.clientName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-900">{contract.clientName}</p>
                                                                        <p className="text-[10px] text-slate-400">View contract</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 font-medium text-slate-700">{contract.title}</td>
                                                            <td className="px-5 py-4 font-bold text-slate-900">${(contract.totalValue || 0).toLocaleString()}</td>
                                                            <td className="px-5 py-4 text-slate-500">{contract.deadline || 'TBD'}</td>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full transition-all"
                                                                            style={{ width: `${progress}%`, background: '#ffb43b' }} />
                                                                    </div>
                                                                    <span className="font-bold text-slate-900 text-xs">{progress}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {activeContracts.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                                                            No active projects yet. When clients hire you, they'll appear here!
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-1 space-y-6 lg:space-y-8">

                            {/* Profile Card */}
                            <div className="rounded-3xl p-8 flex flex-col items-center text-center shadow-md relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #fcd34d 0%, #ffb43b 100%)' }}>
                                {/* Decorative circle */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5"></div>

                                <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-[#fff8ec] mb-4 overflow-hidden shrink-0 shadow-xl">
                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${firstName}&backgroundColor=e2e8f0`} alt={firstName} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">{profile?.displayName || 'Jane Doe'}</h2>
                                <p className="text-sm text-orange-100 mt-1 mb-6 flex items-center gap-1.5 justify-center">
                                    {profile?.country || 'Earth'}
                                </p>

                                <button className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold border-2 border-white-400 text-white transition-all hover:bg-white/10 w-full justify-center">
                                    <div className="w-3 h-3 text-orange-200"><TrendingUp size={12} /></div> Edit profile
                                </button>
                            </div>

                            {/* Application Status (Past Projects Showcase) */}
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-900 text-lg">Application status</h3>
                                    <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-50 text-slate-400">⋮</button>
                                </div>

                                <div className="space-y-6">
                                    {/* Mock 1 */}
                                    <div className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Applied</span>
                                            <span className="text-[9px] font-bold text-[#10b981]">Applied on Jan 22</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">Chinese Translator</h4>
                                        <p className="text-[10px] text-slate-500 mb-3">Tech Troopsy (Jurong East, Singapore)</p>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-200 text-slate-500">Remote</span>
                                            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-200 text-slate-500">Contract</span>
                                        </div>
                                    </div>

                                    {/* Mock 2 */}
                                    <div className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">Not selected by employer</span>
                                            <span className="text-[9px] font-bold text-[#10b981]">Applied on Jan 09</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">Frontend Developer (Junior Position)</h4>
                                        <p className="text-[10px] text-slate-500 mb-3">PT Nirlaba Digital Indonesia (Kemang, South Jakarta)</p>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-200 text-slate-500">1-3 years exp</span>
                                            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-200 text-slate-500">Freelance</span>
                                        </div>
                                    </div>

                                    {/* Mock 3 */}
                                    <div className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">Interview</span>
                                            <span className="text-[9px] font-bold text-[#10b981]">Applied on Dec 29</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">Website Designer</h4>
                                        <p className="text-[10px] text-slate-500 mb-3">Verganis Studio (Sydney, Australia)</p>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-2 py-1 rounded-full border border-slate-200 text-slate-500">3 months contract</span>
                                        </div>
                                    </div>

                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
