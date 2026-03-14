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
import { TrendingUp, Lock, CheckCircle, Clock, ArrowRight, Plus, Globe, AlertTriangle, Briefcase, Copy, Check } from 'lucide-react';

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
// CLIENT DASHBOARD (Original UI Preserved)
// ==========================================
function ClientDashboard({ contracts, totalValue, totalLocked, totalReleased }) {
    const [copiedId, setCopiedId] = useState(null);

    const copyLink = (e, contractId) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/contract/${contractId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(contractId);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const stats = [
        { label: 'Total Contract Value', value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: '#3b54f6', bg: '#eef0ff' },
        { label: 'Locked in Vault', value: `$${totalLocked.toLocaleString()}`, icon: Lock, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: 'Released', value: `$${totalReleased.toLocaleString()}`, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Active Contracts', value: contracts.length, icon: Clock, color: '#f5a623', bg: '#fff8ec' },
    ];

    return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16">
                <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Escrow Dashboard</h1>
                            <p className="text-slate-400 mt-0.5 text-sm">Manage your cross-border payment contracts</p>
                        </div>
                        <Link href="/new-contract" className="btn-primary">
                            <Plus size={15} /> New Contract
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {stats.map(({ label, value, icon: Icon, color, bg }) => (
                            <Card key={label} className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                                        <Icon size={17} style={{ color }} />
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium leading-tight">{label}</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{value}</p>
                            </Card>
                        ))}
                    </div>

                    {/* Fund Flow */}
                    <Card className="p-6 mb-8">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Live Fund Flow</h2>
                        <div className="flex items-center justify-between gap-4">
                            {[
                                { label: 'Client Wallets', sub: `${contracts.length} contracts`, bg: '#eef0ff', emoji: '👤' },
                                null,
                                { label: 'Escrow Vault', sub: `$${totalLocked.toLocaleString()} locked`, bg: '#f5f3ff', emoji: '🔒' },
                                null,
                                { label: 'Freelancers', sub: `$${totalReleased.toLocaleString()} received`, bg: '#ecfdf5', emoji: '💸' },
                            ].map((item, i) => item === null ? (
                                <div key={i} className="flex-1 flex items-center gap-1">
                                    <div className="flex-1 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#3b54f6,#8b5cf6)' }} />
                                    <ArrowRight size={14} style={{ color: '#8b5cf6' }} />
                                </div>
                            ) : (
                                <div key={item.label} className="text-center shrink-0">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl" style={{ background: item.bg }}>
                                        {item.emoji}
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Contracts list */}
                    <div>
                        <h2 className="text-base font-bold text-slate-900 mb-4">Your Contracts</h2>
                        {contracts.length === 0 ? (
                            <Card className="p-12 flex flex-col items-center text-center gap-4">
                                <div className="text-5xl">📋</div>
                                <h3 className="font-bold text-slate-900">No contracts yet</h3>
                                <p className="text-slate-400 text-sm max-w-xs">Create your first escrow contract and start securing global payments.</p>
                                <Link href="/new-contract" className="btn-primary mt-2">
                                    <Plus size={15} /> Create Contract
                                </Link>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {contracts.map((contract) => {
                                    const ms = contract.milestones || [];
                                    const releasedAmount = ms.filter(m => m.status === 'Approved').reduce((s, m) => s + (m.amount || 0), 0);
                                    const progress = contract.totalValue ? Math.round((releasedAmount / contract.totalValue) * 100) : 0;
                                    return (
                                        <Link key={contract.id} href={`/contract/${contract.id}`}>
                                            <Card hover className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs text-slate-400 font-mono">{contract.id?.slice(0, 8).toUpperCase()}</span>
                                                            <span className={`badge ${getStatusColor(contract.status)}`}>{contract.status}</span>
                                                        </div>
                                                        <h3 className="font-bold text-slate-900">{contract.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                                            <Globe size={11} />
                                                            <span className="font-medium text-slate-600">{contract.clientName}</span>
                                                            <span>{contract.clientCountry}</span>
                                                            <span>→</span>
                                                            <span className="font-medium text-slate-600">{contract.freelancerName}</span>
                                                            <span>{contract.freelancerCountry}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-4 flex flex-col items-end gap-2">
                                                        <p className="text-xl font-black text-slate-900">${(contract.totalValue || 0).toLocaleString()}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Due {contract.deadline}</p>
                                                        <button
                                                            onClick={(e) => copyLink(e, contract.id)}
                                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                                                            style={copiedId === contract.id
                                                                ? { borderColor: '#10b981', color: '#10b981', background: '#ecfdf5' }
                                                                : { borderColor: '#e2e8f0', color: '#64748b', background: '#f8fafc' }
                                                            }
                                                        >
                                                            {copiedId === contract.id
                                                                ? <><Check size={11} /> Copied!</>
                                                                : <><Copy size={11} /> Share Link</>
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                                        <span>${releasedAmount.toLocaleString()} / ${contract.totalValue.toLocaleString()} released</span>
                                                        <span className="font-semibold text-slate-600">{progress}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all"
                                                            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#f5a623,#10b981)' }} />
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
