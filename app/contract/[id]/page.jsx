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
    acceptContract, rejectContract, submitReview, getContractReviews
} from '@/lib/firestore';
import { getStatusColor, statusFlow } from '@/lib/store';
import {
    Shield, CheckCircle, Upload, AlertTriangle,
    ArrowLeft, Lock, ExternalLink, User, ChevronRight, Wallet, PartyPopper, XCircle, IndianRupee,
    Star, Banknote, Send, X, BadgeCheck, Bot, Download, MessageSquare, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWriteContract, useAccount, useSwitchChain, usePublicClient } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

const iconMap = { shield: Shield, lock: Lock, upload: Upload, check: CheckCircle };

// Step icons for the progress stepper
const stepIcons = {
    'Agreement': '📋',
    'Verification': '🔐',
    'Inspection': '🔍',
    'Disbursement': '💸',
    'Completed': '🏁',
};

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
    const [reviews, setReviews] = useState({});
    const [myRating, setMyRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [disputeModal, setDisputeModal] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [payoutModal, setPayoutModal] = useState(false);
    const [payoutTo, setPayoutTo] = useState('upi');
    const [upiId, setUpiId] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutSuccess, setPayoutSuccess] = useState(null);

    // Submission confirmation state
    const [confirmSubmit, setConfirmSubmit] = useState(null); // { milestoneId, evidenceUrl }

    const sendNotification = async (to, subject, type, data) => {
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, type, data }),
            });
        } catch (err) {
            console.error('Failed to send email notification:', err);
        }
    };

    // Real-time subscription
    useEffect(() => {
        if (!id) return;
        const unsub = subscribeToContract(id, (data) => {
            setContract(data);
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    // Load existing reviews for this contract
    useEffect(() => {
        if (!id) return;
        getContractReviews(id).then(setReviews).catch(() => { });
    }, [id]);

    const [ethRates, setEthRates] = useState({});
    const [showLocal, setShowLocal] = useState(false);

    useEffect(() => {
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur,gbp,inr')
            .then(r => r.json())
            .then(d => {
                if (d?.ethereum) setEthRates({ USD: d.ethereum.usd, EUR: d.ethereum.eur, GBP: d.ethereum.gbp, INR: d.ethereum.inr });
            }).catch(() => { });
    }, []);

    if (loading) return (
        <AuthGuard><Navbar />
            <div className="min-h-screen bg-surface pt-16 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: '#ffb43b', borderTopColor: 'transparent' }} />
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

    const contractCurrency = contract.currency || 'USD';
    const currentRate = ethRates[contractCurrency] || 0;
    const ethEquivalent = currentRate > 0 ? (contract.totalValue / currentRate) : 0;
    const inrValue = ethRates.INR ? (ethEquivalent * ethRates.INR) : 0;

    const currencySymbol = contractCurrency === 'USDC' ? '₮' : contractCurrency === 'EUR' ? '€' : contractCurrency === 'GBP' ? '£' : contractCurrency === 'INR' ? '₹' : '$';
    const fmt = (val) => showLocal && ethRates.INR ? `₹${(inrValue * (val / contract.totalValue)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `${currencySymbol}${val?.toLocaleString()}`;
    const contractId = id?.slice(0, 8).toUpperCase();
    const createdDate = contract.createdAt?.toDate ? contract.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

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
                        contractId: id, freelancerName: contract.freelancerName, amount: amountInr,
                        currency: 'INR', paymentMethod: 'razorpay', payoutTo,
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
            const isFiatFunded = contract.paymentMethod === 'razorpay';
            if (key.startsWith('app-') && contract.onChain && !isFiatFunded) {
                if (!isConnected) throw new Error('Connect your wallet to release funds');
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                const mIdx = milestone.order;
                if (contract.onChainId === undefined || contract.onChainId === null) throw new Error('On-chain Project ID not found.');
                if (chainId !== localhost.id) {
                    toast.loading('Switching to Local Testnet...', { id: 'tx' });
                    await switchChainAsync({ chainId: localhost.id });
                }
                toast.loading('Confirming release on-chain...', { id: 'tx' });
                const hash = await writeContractAsync({
                    chainId: localhost.id, address: ESCROW_ADDRESS, abi: ESCROW_ABI,
                    functionName: 'approveMilestone', args: [BigInt(contract.onChainId), BigInt(mIdx)],
                });
                toast.loading('Mining release transaction...', { id: 'tx' });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                if (receipt.status === 'reverted') throw new Error('Transaction was reverted on-chain.');
                const originalFn = fn;
                fn = () => originalFn(hash);
            }

            await fn();

            if (key === 'fund') toast.success('Funds locked safely in Escrow Vault', { id: 'tx' });
            else if (key.startsWith('sub-')) {
                toast.success('Milestone submitted for review! The client has been notified.');
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                sendNotification(contract.clientEmail, 'Milestone Ready for Review 📬', 'milestone_submitted', {
                    clientName: contract.clientName,
                    id: contract.id,
                    title: milestone.title,
                    order: milestone.order
                });
            }
            else if (key.startsWith('app-')) {
                toast.success('🎉 Milestone approved! Funds transferred to freelancer on-chain!', { id: 'tx' });
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                sendNotification(contract.freelancerEmail, 'Funds Released! 🎉', 'milestone_approved', {
                    freelancerName: contract.freelancerName,
                    clientName: contract.clientName,
                    id: contract.id,
                    title: milestone.title,
                    amount: milestone.amount
                });
            }
            else if (key.startsWith('rej-')) {
                toast.success('Milestone rejected — freelancer must resubmit.');
                const mId = key.split('-')[1];
                const milestone = contract.milestones.find(m => m.id === mId);
                sendNotification(contract.freelancerEmail, 'Milestone Needs Revision ⚠️', 'milestone_rejected', {
                    freelancerName: contract.freelancerName,
                    clientName: contract.clientName,
                    id: contract.id,
                    title: milestone.title
                });
            }
            else if (key === 'accept') {
                toast.success('Contract offer accepted! It is now active.');
                sendNotification(contract.clientEmail, 'Contract Accepted! ✅', 'contract_accepted', {
                    clientName: contract.clientName,
                    id: contract.id,
                    title: contract.title
                });
            }
            else if (key === 'decline') toast.success('Contract offer declined.');
            else if (key === 'dispute') {
                toast.success('Dispute raised. Platform notified.');
                // Optional: add dispute email
            }
        } catch (err) {
            console.error(err);
            toast.error(err.shortMessage || err.message || 'Action failed. Please try again.', { id: 'tx' });
        } finally {
            setActionLoading('');
        }
    };

    const handleSubmitReview = async () => {
        if (!myRating) return toast.error('Please select a star rating.');
        setReviewSubmitting(true);
        try {
            const reviewerRole = isClient ? 'client' : 'freelancer';
            const revieweeEmail = isClient ? contract.freelancerEmail : contract.clientEmail;
            const revieweeName = isClient ? contract.freelancerName : contract.clientName;
            const reviewerName = isClient ? contract.clientName : contract.freelancerName;
            await submitReview(id, reviewerRole, { rating: myRating, comment: reviewComment, reviewerName, revieweeEmail, revieweeName, contractTitle: contract.title });
            toast.success('Review submitted!');
            const updated = await getContractReviews(id);
            setReviews(updated);
        } catch (err) {
            toast.error(err.message || 'Failed to submit review.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const renderStars = (count, interactive = false) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" disabled={!interactive}
                    onClick={() => interactive && setMyRating(n)}
                    onMouseEnter={() => interactive && setHoverRating(n)}
                    onMouseLeave={() => interactive && setHoverRating(0)}
                    className={interactive ? 'cursor-pointer' : 'cursor-default'}>
                    <Star size={18}
                        fill={(interactive ? (hoverRating || myRating) >= n : count >= n) ? '#ffb43b' : 'none'}
                        stroke={(interactive ? (hoverRating || myRating) >= n : count >= n) ? '#ffb43b' : '#cbd5e1'}
                    />
                </button>
            ))}
        </div>
    );

    const milestoneStatusBadge = (status) => {
        const map = {
            'Approved': 'bg-green-100 text-green-700',
            'Submitted': 'bg-amber-100 text-amber-700',
            'Pending': 'bg-slate-100 text-slate-500',
            'Rejected': 'bg-red-100 text-red-600',
        };
        return map[status] || 'bg-slate-100 text-slate-500';
    };

    return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen pt-16" style={{ background: '#f7f7f5' }}>
                <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8">

                    {/* ── Breadcrumb ── */}
                    <div className="flex items-center gap-3 mb-6 text-sm">
                        <button onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                            <ArrowLeft size={13} /> Back to Dashboard
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="font-mono text-slate-400 text-xs font-bold">CNT-{contractId}</span>
                    </div>

                    {/* ── Title Row ── */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-black text-slate-900">{contract.title}</h1>
                                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getStatusColor(contract.status)}`}>
                                    {contract.status}
                                </span>
                                {contract.paymentMethod === 'razorpay' && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">
                                        <IndianRupee size={9} /> Fiat Funded
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-[12px] text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-slate-500">🔖</span> ID: CNT-{contractId}
                                </span>
                                {createdDate && (
                                    <span className="flex items-center gap-1.5">
                                        <span>🗓</span> Created {createdDate}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {ethRates.INR > 0 && contractCurrency !== 'INR' && (
                                <button onClick={() => setShowLocal(!showLocal)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                                    <span className={showLocal ? 'text-slate-400' : 'text-blue-600'}>{contractCurrency}</span>
                                    <div className="w-8 h-4 bg-slate-100 rounded-full relative">
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${showLocal ? 'translate-x-4 bg-blue-500' : 'translate-x-0.5 bg-slate-400'}`} />
                                    </div>
                                    <span className={showLocal ? 'text-blue-600' : 'text-slate-400'}>INR</span>
                                </button>
                            )}
                            {!['Disputed', 'Completed', 'Rejected'].includes(contract.status) && (
                                <button onClick={() => setDisputeModal(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                                    <AlertTriangle size={12} /> Raise Dispute
                                </button>
                            )}
                            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
                                <Download size={12} /> Download PDF
                            </button>
                        </div>
                    </div>

                    {/* ── Progress Stepper ── */}
                    <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6 mb-6">
                        <div className="flex items-center">
                            {statusFlow.map((stage, i) => {
                                const isDone = i < currentStepIdx;
                                const isActive = i === currentStepIdx;
                                return (
                                    <div key={stage} className="flex items-center flex-1 last:flex-none">
                                        <div className="flex flex-col items-center min-w-0">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base mb-2 transition-all"
                                                style={isDone ? { background: '#ffb43b', boxShadow: '0 0 0 4px #fef3c7' }
                                                    : isActive ? { background: '#ffb43b', boxShadow: '0 0 0 4px #fef3c7' }
                                                        : { background: '#f1f5f9' }}>
                                                {isDone
                                                    ? <CheckCircle size={18} color="#fff" />
                                                    : <span className="text-[13px]">{stepIcons[stage] || '⚪'}</span>}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-[#ffb43b]' : isDone ? 'text-[#ffb43b]' : 'text-slate-300'}`}>
                                                {stage}
                                            </span>
                                            <span className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-[#ffb43b]' : isDone ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {isDone ? 'COMPLETED' : isActive ? 'IN PROGRESS' : 'PENDING'}
                                            </span>
                                        </div>
                                        {i < statusFlow.length - 1 && (
                                            <div className="flex-1 h-[3px] mx-2 mb-6 rounded-full"
                                                style={{ background: isDone ? '#ffb43b' : '#e2e8f0' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Main Grid ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: Milestones + Audit Trail */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Freelancer accept/decline banner */}
                            {contract.status === 'Agreement' && isFreelancer && (
                                <div className="rounded-[20px] p-6 border-2 border-[#ffb43b] bg-[#fff8ec]">
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                            <PartyPopper size={24} className="text-[#ffb43b]" />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-lg font-black text-slate-900">New Contract Offer!</h3>
                                            <p className="text-sm text-slate-600 mt-1">Review the milestones below. Do you accept these terms?</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button disabled={!!actionLoading}
                                                onClick={() => act('decline', () => rejectContract(id, contract.freelancerName))}
                                                className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                                Decline
                                            </button>
                                            <button disabled={!!actionLoading}
                                                onClick={() => act('accept', () => acceptContract(id, contract.freelancerName))}
                                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
                                                style={{ background: '#ffb43b' }}>
                                                <CheckCircle size={15} /> Accept Offer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Simple Confirmation Modal — Freelancer */}
                            {confirmSubmit && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                                        <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(to right, #fff8ec, #fff)' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ffb43b, #e09000)' }}>
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
                                                    style={{ background: 'linear-gradient(135deg, #ffb43b, #e09000)' }}>
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

                            {/* Milestones Card */}
                            <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-slate-900">Milestones</h2>
                                    <div className="flex items-center gap-2">
                                        {contract.status === 'Agreement' && isClient && (
                                            <button disabled={!!actionLoading}
                                                onClick={() => act('fund', () => fundContract(id, contract.clientName))}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                                                style={{ background: '#ffb43b' }}>
                                                <Lock size={13} /> {actionLoading === 'fund' ? 'Locking...' : 'Deposit & Lock Funds'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {(contract.milestones || []).map((m, idx) => {
                                        const isLocked = m.status === 'Pending' && idx > 0 && (contract.milestones[idx - 1]?.status !== 'Approved');
                                        return (
                                            <div key={m.id} className={`rounded-[16px] border p-5 transition-all ${m.status === 'Approved' ? 'border-green-200 bg-green-50/50' : m.status === 'Submitted' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 bg-white'}`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        {/* Status icon circle */}
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${m.status === 'Approved' ? 'bg-green-100' : m.status === 'Submitted' ? 'bg-amber-100' : isLocked ? 'bg-slate-100' : 'bg-slate-100'}`}>
                                                            {m.status === 'Approved' ? <CheckCircle size={16} className="text-green-500" />
                                                                : m.status === 'Submitted' ? <Upload size={16} className="text-amber-500" />
                                                                    : isLocked ? <Lock size={14} className="text-slate-400" />
                                                                        : <span className="text-xs font-bold text-slate-400">{idx + 1}</span>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-slate-900 text-sm">{m.title}</h3>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                                {m.status === 'Approved' ? `Released on ${m.approvedAt?.toDate ? m.approvedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`
                                                                    : m.status === 'Submitted' ? 'Under review by Client'
                                                                        : isLocked ? 'Locked until previous milestone approval'
                                                                            : 'Pending'}
                                                            </p>
                                                            {m.evidenceUrl && m.status === 'Submitted' && (
                                                                <a href={m.evidenceUrl} target="_blank" rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1">
                                                                    <ExternalLink size={10} /> View Evidence
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <span className="text-lg font-black text-slate-900">${m.amount?.toLocaleString()}.00</span>
                                                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${milestoneStatusBadge(m.status)}`}>
                                                            {isLocked ? 'LOCKED' : m.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>

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
                                                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${m.aiConfidence === 'high' ? 'bg-green-100 text-green-700' : m.aiConfidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
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

                                                {/* Submit Work — Freelancer only */}
                                                {m.status === 'Pending' && isFreelancer && contract.status !== 'Agreement' && contract.status !== 'Rejected' && !isLocked && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                                        <input value={evidence[m.id] || ''} onChange={e => setEvidence(p => ({ ...p, [m.id]: e.target.value }))}
                                                            placeholder="Evidence URL (GitHub, Figma, Loom...)" className="input flex-1 py-2 text-xs" />
                                                        <button disabled={!!actionLoading}
                                                            onClick={() => {
                                                                const url = evidence[m.id]?.trim();
                                                                if (!url) { toast.error('Please enter an evidence URL'); return; }
                                                                setConfirmSubmit({ milestoneId: m.id, evidenceUrl: url, milestoneTitle: m.title });
                                                            }}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                                                            style={{ background: '#ffb43b' }}>
                                                            <Upload size={12} /> {actionLoading === `sub-${m.id}` ? '...' : 'Submit Work'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Approve / Reject — Client only */}
                                                {m.status === 'Submitted' && isClient && (
                                                    <div className="mt-4 pt-4 border-t border-amber-100 flex gap-2">
                                                        <button disabled={!!actionLoading}
                                                            onClick={() => act(`app-${m.id}`, () => approveMilestone(id, m.id, m.amount, m.title, contract.clientName))}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                                                            style={{ background: '#10b981' }}>
                                                            <CheckCircle size={12} /> {actionLoading === `app-${m.id}` ? '...' : `Approve & Release $${m.amount}`}
                                                        </button>
                                                        <button disabled={!!actionLoading}
                                                            onClick={() => act(`rej-${m.id}`, () => rejectMilestone(id, m.id, m.title, contract.clientName))}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 transition-all">
                                                            <XCircle size={12} /> Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {m.status === 'Submitted' && isFreelancer && (
                                                    <p className="mt-3 text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                                                        <CheckCircle size={12} /> Submitted — awaiting client review
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Audit Trail Card */}
                            <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-slate-900">Audit Trail</h2>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
                                </div>

                                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                                    {[...(contract.auditLog || [])].reverse().map((log, i) => {
                                        const Icon = iconMap[log.icon] || Shield;
                                        const ts = log.timestamp?.toDate ? log.timestamp.toDate() : null;
                                        return (
                                            <div key={log.id || i} className="flex gap-3 items-start">
                                                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                                                    style={{ background: '#fff8ec', border: '2px solid #fef3c7' }}>
                                                    <Icon size={12} style={{ color: '#ffb43b' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 leading-tight">{log.action}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{log.actor}</p>
                                                        </div>
                                                        {ts && (
                                                            <span className="text-[9px] text-slate-300 font-medium whitespace-nowrap shrink-0">
                                                                {ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {log.txHash && (
                                                        <p className="text-[9px] font-mono text-slate-300 mt-1 truncate">hash: {log.txHash}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Review Section — only when Completed */}
                            {contract.status === 'Completed' && (isClient || isFreelancer) && (() => {
                                const myRole = isClient ? 'client' : 'freelancer';
                                const otherRole = isClient ? 'freelancer' : 'client';
                                const alreadyReviewed = isClient ? contract.clientReviewed : contract.freelancerReviewed;
                                const otherReview = reviews[otherRole];
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Star size={16} fill="#ffb43b" stroke="#ffb43b" />
                                                <h3 className="font-black text-slate-900">{alreadyReviewed ? 'Your Review' : `Rate ${isClient ? contract.freelancerName : contract.clientName}`}</h3>
                                            </div>
                                            {alreadyReviewed ? (
                                                <>
                                                    {renderStars(reviews[myRole]?.rating || 0)}
                                                    {reviews[myRole]?.comment && <p className="text-sm text-slate-600 mt-3 italic">"{reviews[myRole].comment}"</p>}
                                                    <p className="text-xs text-emerald-600 font-bold mt-3">✓ Review submitted</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-slate-500 mb-3">How was your experience with <span className="font-semibold text-slate-800">{isClient ? contract.freelancerName : contract.clientName}</span>?</p>
                                                    {renderStars(myRating, true)}
                                                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                                                        placeholder="Share your experience (optional)..." rows={3}
                                                        className="w-full mt-3 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:ring-2 focus:ring-[#ffb43b] outline-none resize-none" />
                                                    <button onClick={handleSubmitReview} disabled={!myRating || reviewSubmitting}
                                                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                                                        style={{ background: '#ffb43b' }}>
                                                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Star size={16} fill="#ffb43b" stroke="#ffb43b" />
                                                <h3 className="font-black text-slate-900">{isClient ? contract.freelancerName : contract.clientName}'s Review</h3>
                                            </div>
                                            {otherReview ? (
                                                <>
                                                    {renderStars(otherReview.rating)}
                                                    {otherReview.comment && <p className="text-sm text-slate-600 mt-3 italic">"{otherReview.comment}"</p>}
                                                    <p className="text-[10px] text-slate-400 mt-3">{otherReview.createdAt?.toDate ? otherReview.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <Star size={28} stroke="#cbd5e1" fill="none" />
                                                    <p className="text-sm text-slate-400 font-medium mt-2">No review yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* RIGHT: Sidebar */}
                        <div className="space-y-4">

                            {/* Vault Status */}
                            <div className="rounded-[20px] p-6 relative overflow-hidden text-white"
                                style={{ background: 'linear-gradient(135deg, #ffb43b 0%, #e8961a 100%)' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-8 -mt-8" />
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} className="text-white/80" />
                                        <span className="text-sm font-bold text-white/90">Vault Status</span>
                                    </div>
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/20 text-white uppercase tracking-wider">Secure</span>
                                </div>

                                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1 relative z-10">Total Vault Value</p>
                                <p className="text-3xl font-black text-white mb-4 relative z-10">
                                    {currencySymbol}{contract.totalValue?.toLocaleString()}.00
                                </p>

                                <div className="mb-4 relative z-10">
                                    <div className="flex justify-between text-[11px] font-semibold text-white/80 mb-1.5">
                                        <span>Locked Funds</span>
                                        <span>{currencySymbol}{totalLocked?.toLocaleString()}.00</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/20">
                                        <div className="h-full rounded-full bg-white transition-all"
                                            style={{ width: `${Math.round((totalLocked / (contract.totalValue || 1)) * 100)}%` }} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <div className="rounded-xl p-3 bg-white/10">
                                        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-1">Released</p>
                                        <p className="text-base font-black text-white">{currencySymbol}{totalReleased?.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-xl p-3 bg-white/10">
                                        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-1">Pending</p>
                                        <p className="text-base font-black text-white">{currencySymbol}{totalLocked?.toLocaleString()}</p>
                                    </div>
                                </div>

                                {contract.paymentMethod === 'razorpay' && (
                                    <div className="mt-3 pt-3 border-t border-white/20 relative z-10 flex justify-between text-[11px] font-semibold text-white/80">
                                        <span className="flex items-center gap-1"><IndianRupee size={10} /> Paid (INR)</span>
                                        <span>₹{((contract.amountInrPaise || 0) / 100).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Freelancer Payout Panel */}
                            {isFreelancer && totalReleased > 0 && (
                                <div className="bg-white rounded-[20px] border-2 border-emerald-200 p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500">
                                            <Banknote size={14} className="text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">Your Earnings</h3>
                                    </div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-500">Total earned</span>
                                        <span className="text-sm font-black text-slate-900">
                                            {contract.paymentMethod === 'razorpay'
                                                ? `₹${Math.round((totalReleased / (contract.totalValue || 1)) * ((contract.amountInrPaise || 0) / 100)).toLocaleString('en-IN')}`
                                                : `${currencySymbol}${totalReleased.toLocaleString()}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs text-slate-500">Milestones approved</span>
                                        <span className="text-xs font-bold text-green-600">
                                            {(contract.milestones || []).filter(m => m.status === 'Approved').length} / {(contract.milestones || []).length}
                                        </span>
                                    </div>
                                    {contract.paymentMethod === 'razorpay' ? (
                                        <button onClick={() => { setPayoutSuccess(null); setPayoutModal(true); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                            <Send size={14} /> Redeem to Bank / UPI
                                        </button>
                                    ) : (
                                        <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <BadgeCheck size={14} className="text-blue-500" />
                                                <p className="text-xs font-bold text-blue-700">Funds sent to your wallet</p>
                                            </div>
                                            <p className="text-[10px] text-blue-600 break-all font-mono">{contract.freelancerWallet || 'Wallet address stored on-chain'}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Parties Involved */}
                            <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <User size={14} className="text-slate-400" />
                                    <h3 className="text-sm font-bold text-slate-700">Parties Involved</h3>
                                </div>
                                {[
                                    { name: contract.clientName, role: 'CLIENT', email: contract.clientEmail, country: contract.clientCountry },
                                    { name: contract.freelancerName, role: 'CONTRACTOR', email: contract.freelancerEmail, country: contract.freelancerCountry },
                                ].map(p => (
                                    <div key={p.role} className="flex items-center gap-3 mb-3 last:mb-0">
                                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-slate-100 shrink-0">
                                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.name}&backgroundColor=e2e8f0`} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{p.role}</p>
                                        </div>
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CheckCircle size={12} className="text-green-500" />
                                        </div>
                                    </div>
                                ))}
                                <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    <MessageSquare size={12} /> Open Chat
                                </button>
                            </div>

                            {/* Escrow Policy */}
                            <div className="rounded-[20px] p-5 text-white" style={{ background: '#1e293b' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                                        <Info size={12} className="text-slate-900" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white">Escrow Policy</h3>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Funds are held securely by EscroX until milestones are mutually approved. Disputes are handled via our 24/7 arbitration board.
                                </p>
                                <button className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors">
                                    LEARN MORE →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payout Modal */}
                {payoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #f0fdf4, #fff)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500">
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
                                        <button onClick={() => setPayoutModal(false)} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#10b981' }}>Done</button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-500 mb-4">Choose how to receive your earnings of <strong className="text-slate-900">₹{Math.round((totalReleased / (contract.totalValue || 1)) * ((contract.amountInrPaise || 0) / 100)).toLocaleString('en-IN')}</strong>.</p>
                                        <div className="grid grid-cols-2 gap-2 mb-5">
                                            {[['upi', '⚡ UPI (Instant)'], ['bank', '🏦 Bank Transfer']].map(([val, label]) => (
                                                <button key={val} onClick={() => setPayoutTo(val)}
                                                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${payoutTo === val ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {payoutTo === 'upi' ? (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">UPI ID</label>
                                                <input className="input" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} disabled={payoutLoading} />
                                                <p className="text-[10px] text-slate-400 mt-1">Funds arrive instantly to your UPI-linked account.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Account Number</label>
                                                    <input className="input" placeholder="Enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} disabled={payoutLoading} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">IFSC Code</label>
                                                    <input className="input" placeholder="e.g. SBIN0001234" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} disabled={payoutLoading} />
                                                </div>
                                                <p className="text-[10px] text-slate-400">Arrives within 1-2 business days via NEFT/IMPS.</p>
                                            </div>
                                        )}
                                        <button onClick={handlePayout} disabled={payoutLoading}
                                            className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
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
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-100">
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
                                <button onClick={() => setDisputeModal(false)} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
