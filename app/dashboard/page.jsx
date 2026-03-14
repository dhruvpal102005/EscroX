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
import { TrendingUp, Lock, CheckCircle, Clock, ArrowRight, Plus, Globe, AlertTriangle, Briefcase } from 'lucide-react';

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

    const clientStats = [
        { label: 'Total Contract Value', value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: '#3b54f6', bg: '#eef0ff' },
        { label: 'Locked in Vault', value: `$${totalLocked.toLocaleString()}`, icon: Lock, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: 'Released', value: `$${totalReleased.toLocaleString()}`, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Active Contracts', value: contracts.length, icon: Clock, color: '#f5a623', bg: '#fff8ec' },
    ];

    const freelancerStats = [
        { label: 'Total Project Value', value: `$${totalValue.toLocaleString()}`, icon: Briefcase, color: '#3b54f6', bg: '#eef0ff' },
        { label: 'Pending in Escrow', value: `$${totalLocked.toLocaleString()}`, icon: Lock, color: '#f5a623', bg: '#fff8ec' },
        { label: 'Total Earned', value: `$${totalReleased.toLocaleString()}`, icon: TrendingUp, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Active Projects', value: contracts.length, icon: Clock, color: '#8b5cf6', bg: '#f5f3ff' },
    ];

    const stats = isFreelancer ? freelancerStats : clientStats;

    return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16">
                <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">
                                {isFreelancer ? 'Freelancer Dashboard' : 'Escrow Dashboard'}
                            </h1>
                            <p className="text-slate-400 mt-0.5 text-sm">
                                {isFreelancer ? 'Manage your upcoming projects and earnings' : 'Manage your cross-border payment contracts'}
                            </p>
                        </div>
                        {!isFreelancer && (
                            <Link href="/new-contract" className="btn-primary">
                                <Plus size={15} /> New Contract
                            </Link>
                        )}
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
                            ].map((item, i) =>
                                item === null ? (
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
                                )
                            )}
                        </div>
                    </Card>

                    {/* Contracts list */}
                    <div>
                        <h2 className="text-base font-bold text-slate-900 mb-4">Your Contracts</h2>

                        {error ? (
                            <Card className="p-8 border-red-200 bg-red-50 flex flex-col items-center text-center gap-2">
                                <AlertTriangle className="text-red-500 mb-2" size={32} />
                                <h3 className="font-bold text-red-900">Failed to load contracts</h3>
                                <p className="text-red-600 text-sm max-w-sm">{error}</p>
                                <p className="text-red-500 text-xs mt-2">Check your internet connection or Firebase permissions.</p>
                                <button onClick={() => window.location.reload()} className="btn-primary mt-4 bg-red-600 hover:bg-red-700">
                                    Retry Connection
                                </button>
                            </Card>
                        ) : loading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                                    style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }} />
                            </div>
                        ) : contracts.length === 0 ? (
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
                                    const approvedCount = ms.filter(m => m.status === 'Approved').length;
                                    const progress = ms.length ? Math.round((approvedCount / ms.length) * 100) : 0;
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
                                                    <div className="text-right shrink-0 ml-4">
                                                        <p className="text-xl font-black text-slate-900">${(contract.totalValue || 0).toLocaleString()}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Due {contract.deadline}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                                        <span>{approvedCount}/{ms.length} milestones done</span>
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
