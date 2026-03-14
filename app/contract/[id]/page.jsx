'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import {
    subscribeToContract, submitMilestone, approveMilestone,
    rejectMilestone, fundContract, raiseDispute,
    acceptContract, rejectContract
} from '@/lib/firestore';
import { getStatusColor, statusFlow } from '@/lib/store';
import {
    Shield, CheckCircle, Upload, AlertTriangle,
    ArrowLeft, Lock, ExternalLink, User, ChevronRight, Wallet, PartyPopper, XCircle, IndianRupee,
    Banknote, Send, X, BadgeCheck, Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWriteContract, useAccount, useSwitchChain, usePublicClient } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

const iconMap = { shield: Shield, lock: Lock, upload: Upload, check: CheckCircle };

export default function ContractPage() {
    const { id } = useParams();
    const router = useRouter();
    const { isConnected, address: walletAddress, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { switchChainAsync } = useSwitchChain();
    const publicClient = usePublicClient();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [evidence, setEvidence] = useState({});
    const [disputeModal, setDisputeModal] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [payoutModal, setPayoutModal] = useState(false);
    const [payoutTo, setPayoutTo] = useState('upi'); // 'upi' | 'bank'
    const [upiId, setUpiId] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutSuccess, setPayoutSuccess] = useState(null);

    // Submission confirmation state
    const [confirmSubmit, setConfirmSubmit] = useState(null); // { milestoneId, evidenceUrl }

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
    const isClient = user?.uid === contract.clientUid;
    const isFreelancer = user?.email === contract.freelancerEmail;
    const totalReleased = (contract.milestones || []).filter(m => m.status === 'Approved').reduce((s, m) => s + m.amount, 0);
    const totalLocked = contract.totalValue - totalReleased;
    
    // Determine the exchange rate based on the contract's stored currency
    const contractCurrency = contract.currency || 'USD';
    const currentRate = ethRates[contractCurrency] || 0;
    
    // Estimate ETH based on the dynamic total Value
    const ethEquivalent = currentRate > 0 ? (contract.totalValue / currentRate) : 0; 
    
    // Handle the optional UI toggle to INR (if the user wants to see their local currency)
    const inrValue = ethRates.INR ? (ethEquivalent * ethRates.INR) : 0;


    const handlePayout = async () => {
        const amountInr = contract.paymentMethod === 'razorpay'
            ? Math.round((totalReleased / (contract.totalValue || 1)) * ((contract.amountInrPaise || 0) / 100))
            : null;

        if (contract.paymentMethod === 'razorpay') {
            if (payoutTo === 'upi' && !upiId.trim()) { toast.error('Enter your UPI ID'); return; }
            if (payoutTo === 'bank' && (!accountNumber.trim() || !ifsc.trim())) { toast.error('Enter account number and IFSC'); return; }
        }

        setPayoutLoading(true);
        try {
            if (contract.paymentMethod === 'razorpay') {
                toast.loading('Processing payout...', { id: 'payout' });
                const res = await fetch('/api/payout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contractId: id,
                        freelancerName: contract.freelancerName,
                        amount: amountInr,
                        currency: 'INR',
                        paymentMethod: 'razorpay',
                        payoutTo,
                        upiId: payoutTo === 'upi' ? upiId : undefined,
                        accountNumber: payoutTo === 'bank' ? accountNumber : undefined,
                        ifsc: payoutTo === 'bank' ? ifsc : undefined,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Payout failed');
                toast.success('Payout initiated! 🎉', { id: 'payout' });
                setPayoutSuccess(data);
            }
        } catch (err) {
            toast.error(err.message || 'Payout failed', { id: 'payout' });
        } finally {
            setPayoutLoading(false);
        }
    };

    const act = async (key, fn) => {
        setActionLoading(key);
        try {
            // If it's an approval and on-chain via wallet (not fiat), trigger the smart contract first
            const isFiatFunded = contract.paymentMethod === 'razorpay';
            if (key.startsWith('app-') && contract.onChain && !isFiatFunded) {
                if (!isConnected) throw new Error('Connect your wallet to release funds');
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                const mIdx = milestone.order;
                
                if (contract.onChainId === undefined || contract.onChainId === null) {
                    throw new Error('On-chain Project ID not found. This contract may not have been initialized correctly.');
                }

                console.log(`Approving milestone on-chain. Project: ${contract.onChainId}, Milestone Index: ${mIdx}`);

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
                    args: [BigInt(contract.onChainId), BigInt(mIdx)],
                });
                
                toast.loading('Mining release transaction...', { id: 'tx' });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                
                if (receipt.status === 'reverted') {
                    throw new Error('Transaction was reverted on-chain. Check that your wallet is the one that funded this contract.');
                }

                console.log('✅ Funds released on-chain! TxHash:', hash);
                // Update the fn to include the txHash for the audit log
                const originalFn = fn;
                fn = () => originalFn(hash);
            }

            await fn();

            if (key === 'fund') toast.success('Funds locked safely in Escrow Vault', { id: 'tx' });
            else if (key.startsWith('sub-')) toast.success('Milestone submitted for review! The client has been notified.');
            else if (key.startsWith('app-')) toast.success('🎉 Milestone approved! Funds transferred to freelancer on-chain!', { id: 'tx' });
            else if (key.startsWith('rej-')) toast.success('Milestone rejected — freelancer must resubmit.');
            else if (key === 'accept') toast.success('Contract offer accepted! It is now active.');
            else if (key === 'decline') toast.success('Contract offer declined.');
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
                            {contract.paymentMethod === 'razorpay' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">
                                    <IndianRupee size={9} /> Fiat Funded
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

                            {!['Disputed', 'Completed', 'Rejected'].includes(contract.status) && (
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
                                {contract.status === 'Agreement' && isClient && (
                                    <button disabled={!!actionLoading}
                                        onClick={() => act('fund', () => fundContract(id, contract.clientName))}
                                        className="btn-primary text-sm disabled:opacity-60 bg-slate-900 text-white">
                                        <Lock size={13} /> {actionLoading === 'fund' ? 'Locking...' : 'Deposit & Lock Funds'}
                                    </button>
                                )}
                            </div>

                            {/* Freelancer Action Banner for New Offers */}
                            {contract.status === 'Agreement' && isFreelancer && (
                                <Card className="p-6 border-2 border-[#f5a623] bg-[#fff8ec]">
                                    <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                            <PartyPopper size={24} className="text-[#f5a623]" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-black text-slate-900">New Contract Offer!</h3>
                                            <p className="text-sm text-slate-600 mt-1">Review the milestones below. Do you accept these terms?</p>
                                        </div>
                                        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                            <button disabled={!!actionLoading}
                                                onClick={() => act('decline', () => rejectContract(id, contract.freelancerName))}
                                                className="btn-ghost text-slate-500 px-5 flex-1 md:flex-none">
                                                Decline
                                            </button>
                                            <button disabled={!!actionLoading}
                                                onClick={() => act('accept', () => acceptContract(id, contract.freelancerName))}
                                                className="btn-primary flex items-center gap-2 flex-1 md:flex-none"
                                                style={{ background: '#f5a623' }}>
                                                <CheckCircle size={16} /> Accept Offer
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            )}

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

                                    {/* Submit Work — Freelancer only */}
                                    {m.status === 'Pending' && isFreelancer && contract.status !== 'Agreement' && contract.status !== 'Rejected' && (
                                        <div className="mt-3 flex gap-2">
                                            <input value={evidence[m.id] || ''} onChange={e => setEvidence(p => ({ ...p, [m.id]: e.target.value }))}
                                                placeholder="Evidence URL (GitHub, Figma, Loom...)" className="input flex-1 py-2 text-xs" />
                                            <button disabled={!!actionLoading}
                                                onClick={() => {
                                                    const url = evidence[m.id]?.trim();
                                                    if (!url) { toast.error('Please enter an evidence URL'); return; }
                                                    setConfirmSubmit({ milestoneId: m.id, evidenceUrl: url, milestoneTitle: m.title });
                                                }}
                                                className="btn-primary text-xs px-4 py-2 disabled:opacity-60"
                                                style={{ background: '#f5a623' }}>
                                                <Upload size={12} /> Submit Work
                                            </button>
                                        </div>
                                    )}

                                    {/* AI Summary Card — shown ONLY to client on submitted milestones */}
                                    {m.status === 'Submitted' && m.aiSummary && isClient && (
                                        <div className="mt-3 rounded-xl border p-4" style={{
                                            borderColor: m.aiConfidence === 'high' ? '#86efac' : m.aiConfidence === 'medium' ? '#fde68a' : '#fca5a5',
                                            background: m.aiConfidence === 'high' ? 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' : m.aiConfidence === 'medium' ? 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                                                    background: m.aiConfidence === 'high' ? '#10b981' : m.aiConfidence === 'medium' ? '#f59e0b' : '#ef4444'
                                                }}>
                                                    <Bot size={12} className="text-white" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">AI Verification</span>
                                                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    m.aiConfidence === 'high' ? 'bg-green-100 text-green-700' : m.aiConfidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {m.aiConfidence === 'high' ? '✓ High Confidence' : m.aiConfidence === 'medium' ? '⚠ Medium' : '⚠ Low'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">{m.aiSummary}</p>
                                            {m.aiFlags && m.aiFlags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {m.aiFlags.map((flag, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                                            ⚠ {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Approve / Reject — Client only */}
                                    {m.status === 'Submitted' && isClient && (
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

                                    {/* Awaiting review — shown to freelancer when submitted */}
                                    {m.status === 'Submitted' && isFreelancer && (
                                        <p className="mt-3 text-xs text-blue-600 font-semibold flex items-center gap-1.5">
                                            <CheckCircle size={12} /> Submitted — awaiting client review
                                        </p>
                                    )}
                                </Card>
                            ))}

                            {/* Simple Confirmation Modal — Freelancer */}
                            {confirmSubmit && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                                        <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(to right, #fff8ec, #fff)' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5a623, #e09000)' }}>
                                                    <Upload size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Confirm Submission</h3>
                                                    <p className="text-[11px] text-slate-400">Review before submitting to the client</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-sm text-slate-600 mb-2">You are about to submit work for:</p>
                                            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                                                <p className="text-sm font-bold text-slate-900">{confirmSubmit.milestoneTitle}</p>
                                                <p className="text-xs text-slate-400 mt-1.5 truncate">🔗 {confirmSubmit.evidenceUrl}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-5">Are you sure you want to submit this link? The client will be notified and our AI will verify the submission.</p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setConfirmSubmit(null)}
                                                    className="btn-ghost flex-1 justify-center text-sm">
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={!!actionLoading}
                                                    onClick={async () => {
                                                        const { milestoneId, evidenceUrl } = confirmSubmit;
                                                        setConfirmSubmit(null);
                                                        // Submit immediately, AI runs in background
                                                        let aiResult = null;
                                                        try {
                                                            const res = await fetch('/api/verify-submission', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ evidenceUrl, milestoneTitle: confirmSubmit.milestoneTitle, contractTitle: contract.title }),
                                                            });
                                                            aiResult = await res.json();
                                                        } catch (err) {
                                                            console.error('AI verify error (non-blocking):', err);
                                                        }
                                                        act(`sub-${milestoneId}`, () => submitMilestone(id, milestoneId, evidenceUrl, contract.freelancerName, aiResult));
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                                                    style={{ background: 'linear-gradient(135deg, #f5a623, #e09000)' }}>
                                                    {actionLoading ? (
                                                        <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Submitting...</>
                                                    ) : (
                                                        <><CheckCircle size={14} /> Yes, Submit</>)}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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

                                    {contract.paymentMethod === 'razorpay' && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-slate-400 flex items-center gap-1"><IndianRupee size={10} /> Paid (INR)</span>
                                                <span className="text-xs font-bold text-green-600">₹{((contract.amountInrPaise || 0) / 100).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-400">EscroTokens</span>
                                                <span className="text-xs font-bold text-purple-600">{contract.escrowTokenAmount ?? contract.totalValue} ESC</span>
                                            </div>
                                        </div>
                                    )}

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

                            {/* Freelancer Payout Panel — only shown when earnings exist */}
                            {isFreelancer && totalReleased > 0 && (
                                <Card className="p-5 border-2" style={{ borderColor: '#10b981', background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
                                            <Banknote size={14} className="text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">Your Earnings</h3>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-slate-500">Total earned</span>
                                            <span className="text-sm font-black text-slate-900">
                                                {contract.paymentMethod === 'razorpay'
                                                    ? `₹${Math.round((totalReleased / (contract.totalValue || 1)) * ((contract.amountInrPaise || 0) / 100)).toLocaleString('en-IN')}`
                                                    : `${contract.currency || 'USD'} ${totalReleased.toLocaleString()}`
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-slate-500">Milestones approved</span>
                                            <span className="text-xs font-bold text-green-600">
                                                {(contract.milestones || []).filter(m => m.status === 'Approved').length} / {(contract.milestones || []).length}
                                            </span>
                                        </div>
                                    </div>

                                    {contract.paymentMethod === 'razorpay' ? (
                                        <button
                                            onClick={() => { setPayoutSuccess(null); setPayoutModal(true); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                                        >
                                            <Send size={14} /> Redeem to Bank / UPI
                                        </button>
                                    ) : (
                                        <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <BadgeCheck size={14} className="text-blue-500" />
                                                <p className="text-xs font-bold text-blue-700">Funds sent to your wallet</p>
                                            </div>
                                            <p className="text-[10px] text-blue-600 break-all font-mono">
                                                {contract.freelancerWallet || 'Wallet address stored on-chain'}
                                            </p>
                                            {contract.txHash && (
                                                <p className="text-[9px] text-slate-400 mt-1 truncate">tx: {contract.txHash}</p>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            )}

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

                {/* Payout Modal */}
                {payoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between"
                                style={{ background: 'linear-gradient(to right, #f0fdf4, #fff)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                                        <Banknote size={14} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Redeem Earnings</h3>
                                </div>
                                <button onClick={() => !payoutLoading && setPayoutModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {payoutSuccess ? (
                                    // Success screen
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
                                            <BadgeCheck size={32} className="text-green-500" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 mb-1">Payout Initiated!</h4>
                                        <p className="text-sm text-slate-500 mb-4">{payoutSuccess.message}</p>
                                        <div className="bg-slate-50 rounded-xl p-3 text-left space-y-1 mb-6">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Reference</span>
                                                <span className="font-mono font-bold text-slate-700">{payoutSuccess.payoutRef}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Estimated arrival</span>
                                                <span className="font-bold text-green-600">{payoutSuccess.estimatedArrival}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setPayoutModal(false)}
                                            className="btn-primary w-full justify-center" style={{ background: '#10b981' }}>
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    // Input screen
                                    <>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Choose how to receive your earnings of
                                            <strong className="text-slate-900"> ₹{Math.round((totalReleased / (contract.totalValue || 1)) * ((contract.amountInrPaise || 0) / 100)).toLocaleString('en-IN')}</strong>.
                                        </p>

                                        {/* Payout method tabs */}
                                        <div className="grid grid-cols-2 gap-2 mb-5">
                                            {[['upi', '⚡ UPI (Instant)'], ['bank', '🏦 Bank Transfer']].map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => setPayoutTo(val)}
                                                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${payoutTo === val
                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        {payoutTo === 'upi' ? (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">UPI ID</label>
                                                <input
                                                    className="input"
                                                    placeholder="yourname@upi"
                                                    value={upiId}
                                                    onChange={e => setUpiId(e.target.value)}
                                                    disabled={payoutLoading}
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">Funds arrive instantly to your UPI-linked account.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Account Number</label>
                                                    <input className="input" placeholder="Enter account number"
                                                        value={accountNumber} onChange={e => setAccountNumber(e.target.value)} disabled={payoutLoading} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">IFSC Code</label>
                                                    <input className="input" placeholder="e.g. SBIN0001234"
                                                        value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} disabled={payoutLoading} />
                                                </div>
                                                <p className="text-[10px] text-slate-400">Arrives within 1-2 business days via NEFT/IMPS.</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={handlePayout}
                                            disabled={payoutLoading}
                                            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                                        >
                                            {payoutLoading
                                                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing...</>
                                                : <><Send size={15} /> Initiate Payout</>}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
