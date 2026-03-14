import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { initialContracts, getStatusColor } from '../data/store';
import Card from '../components/GlassCard';
import { TrendingUp, Lock, CheckCircle, Clock, ArrowRight, Plus, Globe } from 'lucide-react';

const Dashboard = () => {
    const [contracts] = useState(initialContracts);

    const totalLocked = contracts.reduce((sum, c) =>
        sum + c.milestones.filter(m => m.status !== 'Approved').reduce((s, m) => s + m.amount, 0), 0);
    const totalReleased = contracts.reduce((sum, c) =>
        sum + c.milestones.filter(m => m.status === 'Approved').reduce((s, m) => s + m.amount, 0), 0);
    const totalValue = contracts.reduce((s, c) => s + c.totalValue, 0);

    const stats = [
        { label: 'Total Contract Value', value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: '#3b54f6', bg: '#eef0ff' },
        { label: 'Locked in Vault', value: `$${totalLocked.toLocaleString()}`, icon: Lock, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: 'Released to Freelancers', value: `$${totalReleased.toLocaleString()}`, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Active Contracts', value: contracts.length, icon: Clock, color: '#f5a623', bg: '#fff8ec' },
    ];

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Escrow Dashboard</h1>
                        <p className="text-slate-400 mt-0.5 text-sm">Autonomous cross-border payment contracts</p>
                    </div>
                    <Link to="/new-contract" className="btn-primary">
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
                            { label: 'Client Wallets', sub: `${contracts.length} clients`, color: '#3b54f6', bg: '#eef0ff', emoji: '👤' },
                            null,
                            { label: 'Escrow Vault', sub: `$${totalLocked.toLocaleString()} locked`, color: '#8b5cf6', bg: '#f5f3ff', emoji: '🔒' },
                            null,
                            { label: 'Freelancer Wallets', sub: `$${totalReleased.toLocaleString()} received`, color: '#10b981', bg: '#ecfdf5', emoji: '💸' },
                        ].map((item, i) =>
                            item === null ? (
                                <div key={i} className="flex-1 flex items-center gap-1">
                                    <div className="flex-1 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #3b54f6, #8b5cf6)' }} />
                                    <ArrowRight size={14} style={{ color: '#8b5cf6' }} />
                                </div>
                            ) : (
                                <div key={item.label} className="text-center shrink-0">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl"
                                        style={{ background: item.bg }}>
                                        {item.emoji}
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                                </div>
                            )
                        )}
                    </div>
                </Card>

                {/* Contracts */}
                <div>
                    <h2 className="text-base font-bold text-slate-900 mb-4">Active Contracts</h2>
                    <div className="space-y-3">
                        {contracts.map((contract) => {
                            const approvedCount = contract.milestones.filter(m => m.status === 'Approved').length;
                            const progress = Math.round((approvedCount / contract.milestones.length) * 100);
                            return (
                                <Link key={contract.id} to={`/contract/${contract.id}`}>
                                    <Card hover className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-slate-400 font-mono">{contract.id}</span>
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
                                                <p className="text-xl font-black text-slate-900">${contract.totalValue.toLocaleString()}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Due {contract.deadline}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                                <span>{approvedCount}/{contract.milestones.length} milestones done</span>
                                                <span className="font-semibold text-slate-600">{progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all"
                                                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f5a623, #10b981)' }} />
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
