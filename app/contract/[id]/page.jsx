'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import {
    subscribeToContract, submitMilestone, approveMilestone,
    rejectMilestone, fundContract, raiseDispute
} from '@/lib/firestore';
import { getStatusColor, statusFlow } from '@/lib/store';
import {
    Shield, CheckCircle, Upload, AlertTriangle,
    ArrowLeft, Lock, ExternalLink, User, ChevronRight, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWriteContract, useAccount, useSwitchChain } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

const iconMap = { shield: Shield, lock: Lock, upload: Upload, check: CheckCircle };

export default function ContractPage() {
    const { id } = useParams();
    const router = useRouter();
    const { isConnected, address: walletAddress, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { switchChainAsync } = useSwitchChain();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [evidence, setEvidence] = useState({});
    const [disputeModal, setDisputeModal] = useState(false);
    const [actionLoading, setActionLoading] = useState('');

    // Real-time subscription
    useEffect(() => {
        if (!id) return;
        const unsub = subscribeToContract(id, (data) => {
            setContract(data);
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    const [ethRates, setEthRates] = useState({});
    const [showLocal, setShowLocal] = useState(false);

    const fetchRates = async () => {
        try {
            const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH');
            const data = await res.json();
            const rates = data.data.rates;
            
            setEthRates({
                USD: parseFloat(rates.USD),
                EUR: parseFloat(rates.EUR),
                GBP: parseFloat(rates.GBP),
                INR: parseFloat(rates.INR),
                USDC: parseFloat(rates.USDC)
            });
        } catch (err) {
            console.error("Failed to fetch ETH exchange rates:", err);
            // Reasonable fallbacks if Coinbase API fails
            setEthRates({ USD: 2500, EUR: 2300, GBP: 1900, INR: 210000, USDC: 2500 }); 
        }
    };

    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 60000); 
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <AuthGuard><Navbar />
            <div className="min-h-screen bg-surface pt-16 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }} />
            </div>
        </AuthGuard>
    );

    if (!contract) return (
        <AuthGuard><Navbar />
            <div className="pt-20 px-12 text-slate-400">Contract not found.</div>
        </AuthGuard>
    );

    const currentStepIdx = statusFlow.indexOf(contract.status);
    const totalReleased = (contract.milestones || []).filter(m => m.status === 'Approved').reduce((s, m) => s + m.amount, 0);
    const totalLocked = contract.totalValue - totalReleased;
    
    // Determine the exchange rate based on the contract's stored currency
    const contractCurrency = contract.currency || 'USD';
    const currentRate = ethRates[contractCurrency] || 0;
    
    // Estimate ETH based on the dynamic total Value
    const ethEquivalent = currentRate > 0 ? (contract.totalValue / currentRate) : 0; 
    
    // Handle the optional UI toggle to INR (if the user wants to see their local currency)
    const inrValue = ethRates.INR ? (ethEquivalent * ethRates.INR) : 0;


    const act = async (key, fn) => {
        setActionLoading(key);
        try {
            // If it's an approval and on-chain, trigger the smart contract first
            if (key.startsWith('app-') && contract.onChain) {
                if (!isConnected) throw new Error('Connect your wallet to release funds');
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                const mIdx = milestone.order; // Assuming order is the index

                if (chainId !== localhost.id) {
                    toast.loading('Switching to Local Testnet...', { id: 'tx' });
                    await switchChainAsync({ chainId: localhost.id });
                }

                toast.loading('Confirming release on-chain...', { id: 'tx' });
                const hash = await writeContractAsync({
                    chainId: localhost.id,
                    address: ESCROW_ADDRESS,
                    abi: ESCROW_ABI,
                    functionName: 'approveMilestone',
                    args: [0n, BigInt(mIdx)], // Project ID 0 for now (demo simplification)
                });
                toast.loading('Mining release transaction...', { id: 'tx' });
            }

            await fn();

            if (key === 'fund') toast.success('Funds locked safely in Escrow Vault', { id: 'tx' });
            else if (key.startsWith('sub-')) toast.success('Milestone submitted for review');
            else if (key.startsWith('app-')) toast.success('Milestone approved & funds released!', { id: 'tx' });
            else if (key.startsWith('rej-')) toast.success('Milestone rejected');
            else if (key === 'dispute') toast.success('Dispute raised. Platform notified.');
        } catch (err) {
            console.error(err);
            toast.error(err.shortMessage || err.message || 'Action failed. Please try again.', { id: 'tx' });
        } finally {
            setActionLoading('');
        }
    };

    return (
        <AuthGuard>
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
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-mono text-slate-400">{id?.slice(0, 8).toUpperCase()}</p>
                                {contract.txHash && (
                                    <span className="text-[10px] font-mono text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                        🔗 {contract.txHash.slice(0, 16)}…
                                    </span>
                                )}
                            </div>
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
                            {ethRates.INR > 0 && contractCurrency !== 'INR' && (
                                <button onClick={() => setShowLocal(!showLocal)} 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                                    <span className={showLocal ? 'text-slate-400' : 'text-blue-600'}>{contractCurrency}</span>
                                    <div className="w-8 h-4 bg-slate-100 rounded-full relative">
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${showLocal ? 'left-4.5 bg-blue-500' : 'left-0.5 bg-slate-400'}`} />
                                    </div>
                                    <span className={showLocal ? 'text-blue-600' : 'text-slate-400'}>INR</span>
                                </button>
                            )}
                            <span className={`badge ${getStatusColor(contract.status)}`}>{contract.status}</span>

                            {!['Disputed', 'Completed'].includes(contract.status) && (
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
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
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
                                    <button disabled={!!actionLoading}
                                        onClick={() => act('fund', () => fundContract(id, contract.clientName))}
                                        className="btn-primary text-sm disabled:opacity-60">
                                        <Lock size={13} /> {actionLoading === 'fund' ? 'Locking...' : 'Deposit & Lock Funds'}
                                    </button>
                                )}
                            </div>

                            {(contract.milestones || []).map(m => (
                                <Card key={m.id} className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">{m.title}</h3>
                                            <p className="text-lg font-black text-slate-900 mt-1">${m.amount?.toLocaleString()}</p>
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
                                    {m.status === 'Approved' && m.approvedAt && (
                                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                            <CheckCircle size={11} /> Released
                                        </p>
                                    )}

                                    {m.status === 'Pending' && contract.status !== 'Agreement' && (
                                        <div className="mt-3 flex gap-2">
                                            <input value={evidence[m.id] || ''} onChange={e => setEvidence(p => ({ ...p, [m.id]: e.target.value }))}
                                                placeholder="Evidence URL (GitHub, Figma, Loom...)" className="input flex-1 py-2 text-xs" />
                                            <button disabled={!!actionLoading}
                                                onClick={() => act(`sub-${m.id}`, () => submitMilestone(id, m.id, evidence[m.id] || 'https://example.com/proof', contract.freelancerName))}
                                                className="btn-primary text-xs px-4 py-2 disabled:opacity-60">
                                                <Upload size={12} /> {actionLoading === `sub-${m.id}` ? '...' : 'Submit'}
                                            </button>
                                        </div>
                                    )}

                                    {m.status === 'Submitted' && (
                                        <div className="mt-3 flex gap-2">
                                            <button disabled={!!actionLoading}
                                                onClick={() => act(`app-${m.id}`, () => approveMilestone(id, m.id, m.amount, m.title, contract.clientName))}
                                                className="btn-primary text-xs px-4 py-2 disabled:opacity-60" style={{ background: '#10b981' }}>
                                                <CheckCircle size={12} /> {actionLoading === `app-${m.id}` ? '...' : `Approve & Release $${m.amount}`}
                                            </button>
                                            <button disabled={!!actionLoading}
                                                onClick={() => act(`rej-${m.id}`, () => rejectMilestone(id, m.id, m.title, contract.clientName))}
                                                className="btn-ghost text-red-500 text-xs border-red-200 disabled:opacity-60">
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
                                        { label: 'Total', value: showLocal && ethRates.INR ? `₹${inrValue.toLocaleString('en-IN')}` : `${contractCurrency === 'USDC' ? '₮' : contractCurrency === 'EUR' ? '€' : contractCurrency === 'GBP' ? '£' : contractCurrency === 'INR' ? '₹' : '$'}${contract.totalValue?.toLocaleString()}`, color: '#0f172a' },
                                        { label: 'Locked', value: showLocal && ethRates.INR ? `₹${(inrValue * (totalLocked / contract.totalValue)).toLocaleString('en-IN')}` : `${contractCurrency === 'USDC' ? '₮' : contractCurrency === 'EUR' ? '€' : contractCurrency === 'GBP' ? '£' : contractCurrency === 'INR' ? '₹' : '$'}${totalLocked.toLocaleString()}`, color: '#8b5cf6' },
                                        { label: 'Released', value: showLocal && ethRates.INR ? `₹${(inrValue * (totalReleased / contract.totalValue)).toLocaleString('en-IN')}` : `${contractCurrency === 'USDC' ? '₮' : contractCurrency === 'EUR' ? '€' : contractCurrency === 'GBP' ? '£' : contractCurrency === 'INR' ? '₹' : '$'}${totalReleased.toLocaleString()}`, color: '#10b981' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">{label}</span>
                                            <span className="font-black text-sm" style={{ color }}>{value}</span>
                                        </div>
                                    ))}

                                    <div className="pt-2">
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full"
                                                style={{ width: `${Math.round((totalReleased / (contract.totalValue || 1)) * 100)}%`, background: 'linear-gradient(90deg,#8b5cf6,#10b981)' }} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1.5 text-right">
                                            {Math.round((totalReleased / (contract.totalValue || 1)) * 100)}% complete
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Audit Trail</h3>
                                <div className="space-y-4 max-h-80 overflow-y-auto">
                                    {[...(contract.auditLog || [])].reverse().map((log, i) => {
                                        const Icon = iconMap[log.icon] || Shield;
                                        return (
                                            <div key={log.id || i} className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-amber-50">
                                                    <Icon size={11} style={{ color: '#f5a623' }} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-700 font-semibold leading-tight">{log.action}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{log.actor}</p>
                                                    {log.txHash && (
                                                        <p className="text-[9px] font-mono text-slate-300 mt-1 truncate max-w-[120px]">
                                                            hash: {log.txHash}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Dispute Modal */}
                {disputeModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
                        <Card className="p-8 max-w-md w-full mx-4">
                            <h2 className="text-xl font-black text-slate-900 mb-2">Raise a Dispute</h2>
                            <p className="text-slate-500 text-sm mb-6">The platform will review the audit trail and decide the outcome.</p>
                            <div className="space-y-3">
                                <button onClick={() => { setDisputeModal(false); act('dispute', () => raiseDispute(id, 'client', contract.clientName)); }}
                                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-left text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                                    Refund client — work not completed
                                </button>
                                <button onClick={() => { setDisputeModal(false); act('dispute', () => raiseDispute(id, 'freelancer', contract.clientName)); }}
                                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-left text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
                                    Release to freelancer — work meets requirements
                                </button>
                                <button onClick={() => setDisputeModal(false)} className="w-full btn-ghost justify-center">Cancel</button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
