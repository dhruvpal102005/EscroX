'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getUserContracts, getFreelancerContracts } from '@/lib/firestore';
import { getStatusColor } from '@/lib/store';
import { TrendingUp, Lock, CheckCircle, Clock, ArrowRight, Plus, Globe, AlertTriangle, Briefcase, Copy, Check, Wallet, Building2, Shield, Users, Search, Bell, ClipboardList } from 'lucide-react';

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
                    style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }} />
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
                            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#f5a623] outline-none"
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
                    <div className="max-w-[1000px] mx-auto px-6 lg:px-10">

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
                                                <Lock className="text-[#f5a623]" size={20} />
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
                                        style={{ background: `conic-gradient(#10b981 0% ${releasedPercentage}%, #f5a623 ${releasedPercentage}% ${releasedPercentage + lockedPercentage}%, #f1f5f9 ${releasedPercentage + lockedPercentage}% 100%)` }}>
                                        <div className="absolute inset-0 m-[18px] bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-sm">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</span>
                                            <span className="text-3xl font-black text-slate-900">${totalValue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-10 mt-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#f5a623]"></div>
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
                                        <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-[#f5a623] animate-[spin_12s_linear_infinite] opacity-60"></div>
                                        <div className="w-[60px] h-[60px] rounded-full bg-[#f5a623] flex items-center justify-center shadow-lg shadow-[#f5a623]/30 z-10">
                                            <Shield size={28} className="text-white absolute shrink-0" />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-[#f5a623] mb-1.5">Escrow Vault</h3>
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
                            style={{ borderColor: '#f5a623', color: '#f5a623' }}>
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
                                        {/* CSS Doughnut Chart */}
                                        <div className="w-32 h-32 rounded-full flex items-center justify-center relative"
                                            style={{ background: `conic-gradient(#f5a623 0% ${overallProgress}%, #1e293b ${overallProgress}% 100%)` }}>
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner relative z-10 flex-col">
                                                <span className="text-xl font-black text-slate-900">{overallProgress}%</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Success</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Sub Stats */}
                                    <div className="flex gap-4 mt-auto">
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="text-[#f5a623]"><TrendingUp size={16} /></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{overallProgress}%</div>
                                                <div className="text-[10px] text-slate-400">Total Progress</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="text-[#f5a623]"><CheckCircle size={16} /></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{activeContracts.length}</div>
                                                <div className="text-[10px] text-slate-400">Total contracts</div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Earning Reports Card (Figma reference matching) */}
                                <Card className="p-6 h-72 flex flex-col pt-5 overflow-hidden relative group">
                                    <div className="flex justify-between items-center z-10 relative">
                                        <h3 className="font-bold text-slate-900 text-lg">Earning reports</h3>
                                        <span className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg">Yearly</span>
                                    </div>

                                    <div className="mt-4 z-10 relative">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Income in {new Date().getFullYear()}</p>
                                        <div className="flex items-end gap-3">
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">${activeTotalReleased.toLocaleString()}</h2>
                                            <span className="flex items-center text-xs font-bold text-[#f5a623] mb-1.5 px-2 py-0.5 bg-[#fff8ec] rounded-md">
                                                + 2.3% <TrendingUp size={12} className="ml-1" />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mocked Wave Area Chart */}
                                    <div className="absolute bottom-0 left-0 right-0 h-32 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full">
                                            <defs>
                                                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#f5a623" stopOpacity="0.4" />
                                                    <stop offset="100%" stopColor="#f5a623" stopOpacity="0.01" />
                                                </linearGradient>
                                            </defs>
                                            {/* Decorative grid lines */}
                                            <path d="M0 20 H400 M0 60 H400 M0 100 H400" stroke="#f1f5f9" strokeWidth="1" fill="none" />
                                            {/* The wave */}
                                            <path d="M0,80 C40,40 80,100 120,60 C160,20 200,90 240,40 C280,-10 320,80 360,50 C380,35 400,60 400,60 L400,120 L0,120 Z" fill="url(#purpleGradient)" />
                                            <path d="M0,80 C40,40 80,100 120,60 C160,20 200,90 240,40 C280,-10 320,80 360,50 C380,35 400,60 400,60" fill="none" stroke="#f5a623" strokeWidth="3" />
                                            {/* Peak marker */}
                                            <circle cx="280" cy="15" r="4" fill="#f5a623" stroke="#fff" strokeWidth="2" />
                                        </svg>
                                        {/* Mock Tooltip on peak */}
                                        <div className="absolute top-[10px] left-[70%] -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded cursor-default shadow-lg">
                                            $2,450
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900"></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-6 flex gap-4 text-[9px] text-slate-400 font-bold z-10 w-full">
                                        <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span>
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
                                                                            style={{ width: `${progress}%`, background: '#f5a623' }} />
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
                                style={{ background: 'linear-gradient(135deg, #fcd34d 0%, #f5a623 100%)' }}>
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
