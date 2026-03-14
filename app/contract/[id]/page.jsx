'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { initialContracts, getStatusColor, statusFlow } from '@/lib/store';
import {
    Shield, CheckCircle, Upload, AlertTriangle,
    ArrowLeft, Lock, ExternalLink, User, ChevronRight
} from 'lucide-react';

const iconMap = { shield: Shield, lock: Lock, upload: Upload, check: CheckCircle };

export default function ContractPage() {
    const { id } = useParams();
    const router = useRouter();
    const [contracts, setContracts] = useState(initialContracts);
    const [evidenceInput, setEvidenceInput] = useState({});
    const [disputeModal, setDisputeModal] = useState(false);

    const contract = contracts.find(c => c.id === id);
    if (!contract) return (
        <>
            <Navbar />
            <div className="pt-16 p-12 text-slate-400">Contract not found.</div>
        </>
    );

    const currentStepIdx = statusFlow.indexOf(contract.status);
    const updateContract = (updater) => setContracts(prev => prev.map(c => c.id === id ? updater(c) : c));

    const handleFund = () => updateContract(c => ({
        ...c, status: 'Verification',
        auditLog: [...c.auditLog, { id: Date.now(), action: 'Funds Deposited to Escrow Vault', actor: `${c.clientName} (Client)`, timestamp: new Date().toLocaleString(), icon: 'lock' }]
    }));

    const handleSubmit = (mId) => {
        const url = evidenceInput[mId] || 'https://example.com/proof-of-work';
        updateContract(c => {
            const milestone = c.milestones.find(m => m.id === mId);
            return {
                ...c, status: 'Inspection',
                milestones: c.milestones.map(m => m.id === mId ? { ...m, status: 'Submitted', evidenceUrl: url, submittedAt: new Date().toLocaleString() } : m),
                auditLog: [...c.auditLog, { id: Date.now(), action: `"${milestone.title}" Submitted`, actor: `${c.freelancerName} (Freelancer)`, timestamp: new Date().toLocaleString(), icon: 'upload' }]
            };
        });
    };

    const handleApprove = (mId) => updateContract(c => {
        const milestone = c.milestones.find(m => m.id === mId);
        const ms = c.milestones.map(m => m.id === mId ? { ...m, status: 'Approved', approvedAt: new Date().toLocaleString() } : m);
        return {
            ...c, status: ms.every(m => m.status === 'Approved') ? 'Completed' : 'Verification', milestones: ms,
            auditLog: [...c.auditLog, { id: Date.now(), action: `"${milestone.title}" Approved — $${milestone.amount} Released`, actor: `${c.clientName} (Client)`, timestamp: new Date().toLocaleString(), icon: 'check' }]
        };
    });

    const handleReject = (mId) => updateContract(c => {
        const milestone = c.milestones.find(m => m.id === mId);
        return {
            ...c,
            milestones: c.milestones.map(m => m.id === mId ? { ...m, status: 'Pending', evidenceUrl: null } : m),
            auditLog: [...c.auditLog, { id: Date.now(), action: `"${milestone.title}" Rejected`, actor: `${c.clientName} (Client)`, timestamp: new Date().toLocaleString(), icon: 'shield' }]
        };
    });

    const handleDispute = (resolution) => {
        const action = resolution === 'client' ? 'Dispute Resolved — Funds Refunded to Client' : 'Dispute Resolved — Payment Released to Freelancer';
        updateContract(c => ({ ...c, status: 'Disputed', auditLog: [...c.auditLog, { id: Date.now(), action, actor: 'Platform Arbitrator', timestamp: new Date().toLocaleString(), icon: 'shield' }] }));
        setDisputeModal(false);
    };

    const totalReleased = contract.milestones.filter(m => m.status === 'Approved').reduce((s, m) => s + m.amount, 0);
    const totalLocked = contract.totalValue - totalReleased;

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16">
                <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
                    <button onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
                        <ArrowLeft size={15} /> Back to Dashboard
                    </button>

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                        <div>
                            <p className="text-xs font-mono text-slate-400 mb-1">{contract.id}</p>
                            <h1 className="text-2xl font-black text-slate-900">{contract.title}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                                <span className="flex items-center gap-1.5 text-slate-500">
                                    <User size={13} /><span className="font-semibold text-slate-700">{contract.clientName}</span> {contract.clientCountry}
                                </span>
                                <ChevronRight size={13} className="text-slate-300" />
                                <span className="flex items-center gap-1.5 text-slate-500">
                                    <User size={13} /><span className="font-semibold text-slate-700">{contract.freelancerName}</span> {contract.freelancerCountry}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className={`badge ${getStatusColor(contract.status)}`}>{contract.status}</span>
                            {contract.status !== 'Disputed' && contract.status !== 'Completed' && (
                                <button onClick={() => setDisputeModal(true)} className="btn-ghost text-red-500 text-xs border-red-200">
                                    <AlertTriangle size={12} /> Raise Dispute
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stepper */}
                    <Card className="p-5 mb-8">
                        <div className="flex items-center">
                            {statusFlow.map((stage, i) => (
                                <div key={stage} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all`}
                                            style={i < currentStepIdx ? { background: '#10b981', color: '#fff' } : i === currentStepIdx ? { background: '#f5a623', color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                                            {i < currentStepIdx ? <CheckCircle size={14} /> : i + 1}
                                        </div>
                                        <span className="text-[9px] mt-1.5 font-semibold whitespace-nowrap"
                                            style={i === currentStepIdx ? { color: '#f5a623' } : i < currentStepIdx ? { color: '#10b981' } : { color: '#cbd5e1' }}>
                                            {stage}
                                        </span>
                                    </div>
                                    {i < statusFlow.length - 1 && (
                                        <div className="flex-1 h-px mx-1 mb-4 rounded-full"
                                            style={{ background: i < currentStepIdx ? '#10b981' : '#e2e8f0' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Milestones */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-slate-900">Milestones</h2>
                                {contract.status === 'Agreement' && (
                                    <button onClick={handleFund} className="btn-primary text-sm">
                                        <Lock size={13} /> Deposit & Lock Funds
                                    </button>
                                )}
                            </div>

                            {contract.milestones.map(m => (
                                <Card key={m.id} className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">{m.title}</h3>
                                            <p className="text-lg font-black text-slate-900 mt-1">${m.amount.toLocaleString()}</p>
                                        </div>
                                        <span className={`badge ${getStatusColor(m.status)}`}>{m.status}</span>
                                    </div>

                                    {m.status === 'Submitted' && m.evidenceUrl && (
                                        <a href={m.evidenceUrl} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 text-xs hover:underline mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100"
                                            style={{ color: '#3b54f6' }}>
                                            <ExternalLink size={12} /> {m.evidenceUrl}
                                        </a>
                                    )}

                                    {m.status === 'Approved' && (
                                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                            <CheckCircle size={11} /> Released · {m.approvedAt}
                                        </p>
                                    )}

                                    {m.status === 'Pending' && contract.status !== 'Agreement' && (
                                        <div className="mt-3 flex gap-2">
                                            <input value={evidenceInput[m.id] || ''} onChange={e => setEvidenceInput(p => ({ ...p, [m.id]: e.target.value }))}
                                                placeholder="Evidence URL (GitHub, Figma, Loom...)" className="input flex-1 py-2 text-xs" />
                                            <button onClick={() => handleSubmit(m.id)} className="btn-primary text-xs px-4 py-2">
                                                <Upload size={12} /> Submit
                                            </button>
                                        </div>
                                    )}

                                    {m.status === 'Submitted' && (
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => handleApprove(m.id)} className="btn-primary text-xs px-4 py-2" style={{ background: '#10b981' }}>
                                                <CheckCircle size={12} /> Approve & Release ${m.amount}
                                            </button>
                                            <button onClick={() => handleReject(m.id)} className="btn-ghost text-red-500 text-xs border-red-200">
                                                <AlertTriangle size={12} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>

                        {/* Right Panel */}
                        <div className="space-y-4">
                            <Card className="p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Vault Status</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Total', value: `$${contract.totalValue.toLocaleString()}`, color: '#0f172a' },
                                        { label: 'Locked', value: `$${totalLocked.toLocaleString()}`, color: '#8b5cf6' },
                                        { label: 'Released', value: `$${totalReleased.toLocaleString()}`, color: '#10b981' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">{label}</span>
                                            <span className="font-black text-sm" style={{ color }}>{value}</span>
                                        </div>
                                    ))}
                                    <div className="pt-2">
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full"
                                                style={{ width: `${Math.round((totalReleased / contract.totalValue) * 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, #10b981)' }} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1.5 text-right">
                                            {Math.round((totalReleased / contract.totalValue) * 100)}% complete
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Audit Trail</h3>
                                <div className="space-y-4 max-h-72 overflow-y-auto">
                                    {[...contract.auditLog].reverse().map(log => {
                                        const Icon = iconMap[log.icon] || Shield;
                                        return (
                                            <div key={log.id} className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-amber-50">
                                                    <Icon size={11} style={{ color: '#f5a623' }} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-700 font-semibold leading-tight">{log.action}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{log.actor} · {log.timestamp}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dispute Modal */}
            {disputeModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
                    <Card className="p-8 max-w-md w-full mx-4">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Raise a Dispute</h2>
                        <p className="text-slate-500 text-sm mb-6">The platform arbitrator will review the audit trail and decide the outcome.</p>
                        <div className="space-y-3">
                            <button onClick={() => handleDispute('client')}
                                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-left text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                                Refund client — work not completed satisfactorily
                            </button>
                            <button onClick={() => handleDispute('freelancer')}
                                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-left text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
                                Release to freelancer — work meets requirements
                            </button>
                            <button onClick={() => setDisputeModal(false)} className="w-full btn-ghost justify-center">Cancel</button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
