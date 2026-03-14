'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, ArrowLeft, Shield, Check, AlertCircle, Sparkles, X, Wallet, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWriteContract, useAccount, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { localhost } from 'wagmi/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

export default function NewContractPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const { isConnected, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { switchChainAsync } = useSwitchChain();
    const publicClient = usePublicClient();

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

    const [form, setForm] = useState({
        title: '', clientName: '', clientCountry: '',
        freelancerName: '', freelancerEmail: '', freelancerCountry: '',
        freelancerWallet: '',
        deadline: '', currency: 'USD',
        milestones: [{ title: '', amount: '', order: 0 }]
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('wallet');

    // AI Generation State
    const [aiModal, setAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    // Auto-fill client name and country from logged-in user's profile
    useEffect(() => {
        if (profile || user) {
            setForm(f => ({
                ...f,
                clientName: f.clientName || profile?.displayName || user?.displayName || '',
                clientCountry: f.clientCountry || profile?.country || ''
            }));
        }
    }, [profile, user]);

    const addMs = () => setForm(f => ({ ...f, milestones: [...f.milestones, { title: '', amount: '', order: f.milestones.length }] }));
    const removeMs = (i) => setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));
    const updateMs = (i, key, value) => setForm(f => {
        const ms = [...f.milestones]; ms[i] = { ...ms[i], [key]: value }; return { ...f, milestones: ms };
    });

    // ── Multi-currency ETH rates ──────────────────────────────────────────
    const [ethRates, setEthRates] = useState({});
    const totalValue = form.milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
    const currentRate = ethRates[form.currency] || 0;
    const totalWei = currentRate ? parseEther(((totalValue / currentRate) * 1.005).toFixed(18)) : 0n;
    const totalInrPaise = Math.round(totalValue * 83 * 100);

    const fetchPrice = async () => {
        try {
            const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH');
            const data = await res.json();
            const rates = data.data.rates;
            setEthRates({
                USD: parseFloat(rates.USD),
                EUR: parseFloat(rates.EUR),
                GBP: parseFloat(rates.GBP),
                INR: parseFloat(rates.INR),
                USDC: parseFloat(rates.USDC),
            });
        } catch {
            setEthRates({ USD: 2500, EUR: 2300, GBP: 1900, INR: 210000, USDC: 2500 });
        }
    };

    useEffect(() => {
        fetchPrice();
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    // Inject Razorpay checkout script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, []);

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiGenerating(true);
        setAiError('');
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI generation failed');
            setForm(f => ({
                ...f,
                title: data.title || f.title,
                deadline: data.deadline || f.deadline,
                currency: data.currency || f.currency,
                milestones: data.milestones?.length ? data.milestones.map((m, i) => ({
                    title: m.title || '', amount: m.amount !== undefined ? m.amount.toString() : '', order: i
                })) : f.milestones
            }));
            toast('Contract magically drafted! ✨', { icon: '🤖' });
            setAiModal(false);
            setAiPrompt('');
        } catch (err) {
            setAiError(err.message);
        } finally {
            setAiGenerating(false);
        }
    };

    // ── Shared Firestore save helper (subcollections) ─────────────────────
    const saveToFirestore = async ({ txHash, onChain, onChainId, pm }) => {
        const contractRef = await addDoc(collection(db, 'contracts'), {
            clientUid: user.uid,
            clientName: form.clientName || '',
            clientEmail: user.email || '',
            clientCountry: form.clientCountry || '',
            freelancerName: form.freelancerName || '',
            freelancerEmail: form.freelancerEmail || '',
            freelancerCountry: form.freelancerCountry || '',
            freelancerWallet: form.freelancerWallet || '',
            title: form.title || '',
            totalValue: totalValue || 0,
            currency: form.currency || 'USD',
            deadline: form.deadline || '',
            txHash,
            onChain,
            onChainId,
            paymentMethod: pm,
            status: 'Verification',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const cid = contractRef.id;

        for (let i = 0; i < form.milestones.length; i++) {
            const m = form.milestones[i];
            await addDoc(collection(db, 'contracts', cid, 'milestones'), {
                title: m.title || `Milestone ${i + 1}`,
                amount: parseFloat(m.amount) || 0,
                order: i,
                status: 'Pending',
                evidenceUrl: null,
                createdAt: serverTimestamp(),
            });
        }

        await addDoc(collection(db, 'contracts', cid, 'auditLog'), {
            action: pm === 'wallet'
                ? `Escrow funded on-chain via Web3 wallet. ${totalValue} ${form.currency} locked.`
                : `Fiat payment via Razorpay. Escrow funded.`,
            actor: `${form.clientName || 'Client'} (Client)`,
            icon: 'shield',
            timestamp: serverTimestamp(),
            txHash,
        });

        return cid;
    };

    // ── Wallet (ETH) submit ───────────────────────────────────────────────
    const handleWalletSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (!isConnected) { toast.error('Please connect your Web3 wallet first!'); return; }

        try {
            setError('');
            setLoading(true);

            if (chainId !== localhost.id) {
                toast.loading('Switching to Local Testnet...', { id: 'tx' });
                await switchChainAsync({ chainId: localhost.id });
            }

            // Read nextProjectId before creating so we know what ID we'll get
            const nextId = await publicClient.readContract({
                address: ESCROW_ADDRESS,
                abi: ESCROW_ABI,
                functionName: 'nextProjectId',
            });
            const onChainProjectId = Number(nextId);

            const msTitles = form.milestones.map(m => m.title || 'Untitled Milestone');
            const msAmountsUSD = form.milestones.map(m => BigInt(Math.round(parseFloat(m.amount) * 100)));

            toast.loading('Confirm deposit in your wallet...', { id: 'tx' });
            const hash = await writeContractAsync({
                chainId: localhost.id,
                address: ESCROW_ADDRESS,
                abi: ESCROW_ABI,
                functionName: 'createProject',
                args: [form.freelancerWallet, msTitles, msAmountsUSD],
                value: totalWei,
            });

            toast.loading('Mining transaction on-chain...', { id: 'tx' });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'reverted') {
                throw new Error('Transaction reverted. Check wallet balance and freelancer address.');
            }

            toast.loading('Saving to database...', { id: 'tx' });
            const id = await saveToFirestore({ txHash: hash, onChain: true, onChainId: onChainProjectId, pm: 'wallet' });

            toast.success('Escrow initialized on-chain! 🎉', { id: 'tx' });
            setSubmitted(true);
            sendNotification(form.freelancerEmail, "You've been invited to a new project! 🚀", 'new_contract', {
                freelancerName: form.freelancerName,
                clientName: form.clientName,
                title: form.title,
                amount: totalValue,
                id: id,
                milestones: form.milestones
            });
            setTimeout(() => router.push(`/contract/${id}`), 1500);
        } catch (err) {
            console.error(err);
            toast.error(err.shortMessage || err.message || 'Failed to create contract', { id: 'tx' });
            setError(err.shortMessage || err.message || 'Failed to create contract.');
        } finally {
            setLoading(false);
        }
    };

    // ── Razorpay submit ───────────────────────────────────────────────────
    const handleRazorpaySubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (totalInrPaise < 100) { toast.error('Total value must be at least ₹1'); return; }

        try {
            setError('');
            setLoading(true);
            toast.loading('Creating payment order...', { id: 'rzp' });

            const orderRes = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_inr: totalInrPaise }),
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

            toast.dismiss('rzp');

            await new Promise((resolve, reject) => {
                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: 'EscroX',
                    description: `Escrow: ${form.title || 'New Contract'}`,
                    order_id: orderData.orderId,
                    theme: { color: '#f5a623' },
                    prefill: { name: form.clientName, email: user.email || '' },
                    handler: async (response) => {
                        try {
                            toast.loading('Verifying payment & minting escrow tokens...', { id: 'rzp' });

                            const verifyRes = await fetch('/api/payment-success', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_signature: response.razorpay_signature,
                                    amount_inr: totalInrPaise,
                                    formData: {
                                        clientUid: user.uid,
                                        clientName: form.clientName,
                                        clientEmail: user.email,
                                        clientCountry: form.clientCountry,
                                        freelancerName: form.freelancerName,
                                        freelancerEmail: form.freelancerEmail,
                                        freelancerCountry: form.freelancerCountry,
                                        freelancerWallet: form.freelancerWallet,
                                        title: form.title,
                                        currency: form.currency,
                                        deadline: form.deadline,
                                        milestones: form.milestones,
                                    },
                                }),
                            });

                            const verifyData = await verifyRes.json();
                            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

                            toast.success('Fiat payment verified! Escrow funded! 🎉', { id: 'rzp' });
                            setSubmitted(true);
                            sendNotification(form.freelancerEmail, "You've been invited to a new project! 🚀", 'new_contract', {
                                freelancerName: form.freelancerName,
                                clientName: form.clientName,
                                title: form.title,
                                amount: totalValue,
                                id: verifyData.contractId,
                                milestones: form.milestones
                            });
                            setTimeout(() => router.push(`/contract/${verifyData.contractId}`), 1500);
                            resolve();
                        } catch (err) { reject(err); }
                    },
                    modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
                };

                if (typeof window === 'undefined' || !window.Razorpay) {
                    reject(new Error('Razorpay SDK not loaded. Refresh and try again.'));
                    return;
                }
                new window.Razorpay(options).open();
            });

        } catch (err) {
            if (err.message !== 'Payment cancelled') {
                toast.error(err.message || 'Payment failed', { id: 'rzp' });
                setError(err.message || 'Payment failed.');
            } else {
                toast.dismiss('rzp');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = paymentMethod === 'razorpay' ? handleRazorpaySubmit : handleWalletSubmit;

    // ── Currency symbol helper ────────────────────────────────────────────
    const currencySymbol = { USD: '$', EUR: '€', GBP: '£', INR: '₹', USDC: '₮' }[form.currency] || '$';

    if (submitted) return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-50 border-2 border-green-200">
                        <Check size={36} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Contract Initialized!</h2>
                    <p className="text-slate-400">Redirecting to contract page...</p>
                </div>
            </div>
        </AuthGuard>
    );

    return (
        <AuthGuard>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16 relative">
                <div className="max-w-2xl mx-auto px-6 py-10">
                    <button onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
                        <ArrowLeft size={15} /> Back to Dashboard
                    </button>

                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 mb-1">New Escrow Contract</h1>
                            <p className="text-slate-400 text-sm">Define parties, milestones, and funding.</p>
                        </div>
                        <button onClick={() => setAiModal(true)} type="button"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-transform hover:scale-105 shadow-md shadow-fuchsia-200"
                            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                            <Sparkles size={16} /> Draft with AI
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-600 bg-red-50 border border-red-200">
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Contract Details */}
                        <Card className="p-6">
                            <h2 className="font-bold text-slate-900 mb-4">Contract Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Project Title</label>
                                    <input required className="input" placeholder="e.g. Mobile App Development"
                                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        ['Client Name', 'clientName', 'John Doe'],
                                        ['Client Country', 'clientCountry', '🇺🇸 USA'],
                                        ['Freelancer Name', 'freelancerName', 'Jane Smith'],
                                        ['Freelancer Country', 'freelancerCountry', '🇮🇳 India'],
                                    ].map(([label, key, placeholder]) => (
                                        <div key={key}>
                                            <label className="text-xs text-slate-500 font-semibold mb-1.5 block">{label}</label>
                                            <input required className="input" placeholder={placeholder} value={form[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Freelancer Email</label>
                                    <input type="email" required className="input" placeholder="freelancer@example.com"
                                        value={form.freelancerEmail} onChange={e => setForm(f => ({ ...f, freelancerEmail: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-blue-600">
                                        <Wallet size={12} /> Freelancer Wallet Address
                                        {paymentMethod === 'razorpay' && (
                                            <span className="text-[10px] font-normal text-slate-400 ml-1">(optional for fiat)</span>
                                        )}
                                    </label>
                                    <input
                                        required={paymentMethod === 'wallet'}
                                        className="input border-blue-100 bg-blue-50/30"
                                        placeholder="0x..."
                                        value={form.freelancerWallet}
                                        onChange={e => setForm(f => ({ ...f, freelancerWallet: e.target.value }))} />
                                    <p className="text-[10px] text-slate-400 mt-1 italic">
                                        {paymentMethod === 'razorpay'
                                            ? 'Optional — simulated token release will be used for fiat payments.'
                                            : 'Funds will be released directly to this address on-chain.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Deadline</label>
                                        <input type="date" required className="input" value={form.deadline}
                                            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Currency</label>
                                        <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                                            {['USD', 'EUR', 'GBP', 'INR', 'USDC'].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Milestones */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-slate-900">Milestones</h2>
                                <button type="button" onClick={addMs} className="btn-ghost text-xs">
                                    <Plus size={13} /> Add Milestone
                                </button>
                            </div>
                            <div className="space-y-3">
                                {form.milestones.map((m, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                                            style={{ background: '#f5a623' }}>{i + 1}</div>
                                        <input required className="input flex-1 py-2" placeholder="Milestone title"
                                            value={m.title} onChange={e => updateMs(i, 'title', e.target.value)} />
                                        <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-3 bg-slate-50">
                                            <span className="text-slate-400 text-sm">{currencySymbol}</span>
                                            <input required type="number" min="1" className="w-24 py-2.5 bg-transparent text-sm text-slate-900 outline-none"
                                                placeholder="0" value={m.amount} onChange={e => updateMs(i, 'amount', e.target.value)} />
                                        </div>
                                        {form.milestones.length > 1 && (
                                            <button type="button" onClick={() => removeMs(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-end">
                                <div className="flex justify-between items-center w-full mb-1">
                                    <span className="text-sm text-slate-400">Total Contract Value</span>
                                    <span className="text-2xl font-black text-slate-900">
                                        {form.currency} {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {currentRate > 0 && paymentMethod === 'wallet' && totalValue > 0 && (
                                    <p className="text-xs text-blue-500 font-medium">
                                        ≈ {((totalValue / currentRate) * 1.005).toFixed(4)} ETH (@ {currencySymbol}{currentRate.toLocaleString()}/ETH)
                                    </p>
                                )}
                                {paymentMethod === 'razorpay' && totalValue > 0 && (
                                    <p className="text-xs font-medium" style={{ color: '#00a854' }}>
                                        ≈ ₹{(totalValue * 83).toLocaleString('en-IN')} INR · {Math.round(totalValue)} EscroTokens minted
                                    </p>
                                )}
                            </div>
                        </Card>

                        {/* Payment Method Toggle */}
                        <Card className="p-6">
                            <h2 className="font-bold text-slate-900 mb-1">Payment Method</h2>
                            <p className="text-xs text-slate-400 mb-4">Choose how to fund this escrow contract.</p>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Wallet Option */}
                                <button type="button" onClick={() => setPaymentMethod('wallet')}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'wallet'
                                        ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                                        : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    {paymentMethod === 'wallet' && (
                                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                            <Check size={9} className="text-white" />
                                        </span>
                                    )}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'wallet' ? 'bg-blue-500' : 'bg-slate-100'}`}>
                                        <Wallet size={20} className={paymentMethod === 'wallet' ? 'text-white' : 'text-slate-400'} />
                                    </div>
                                    <span className={`text-sm font-bold ${paymentMethod === 'wallet' ? 'text-blue-600' : 'text-slate-600'}`}>Web3 Wallet</span>
                                    <span className="text-[10px] text-slate-400">MetaMask · ETH on-chain</span>
                                </button>

                                {/* Razorpay Option */}
                                <button type="button" onClick={() => setPaymentMethod('razorpay')}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'razorpay'
                                        ? 'border-[#00a854] bg-green-50 shadow-sm shadow-green-100'
                                        : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    {paymentMethod === 'razorpay' && (
                                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00a854] flex items-center justify-center">
                                            <Check size={9} className="text-white" />
                                        </span>
                                    )}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'razorpay' ? 'bg-[#00a854]' : 'bg-slate-100'}`}>
                                        <IndianRupee size={20} className={paymentMethod === 'razorpay' ? 'text-white' : 'text-slate-400'} />
                                    </div>
                                    <span className={`text-sm font-bold ${paymentMethod === 'razorpay' ? 'text-[#00a854]' : 'text-slate-600'}`}>Razorpay</span>
                                    <span className="text-[10px] text-slate-400">UPI · Card · Netbanking</span>
                                </button>
                            </div>

                            {paymentMethod === 'razorpay' && (
                                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
                                    <IndianRupee size={13} className="text-green-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-green-700 leading-snug">
                                        Pay in INR via UPI, Card, or Netbanking. Our backend verifies the payment and converts it to <strong>EscroTokens</strong> (1 USD = 1 token) — no crypto wallet needed!
                                    </p>
                                </div>
                            )}
                            {paymentMethod === 'wallet' && !isConnected && (
                                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-700">Connect your MetaMask wallet (top-right) before submitting.</p>
                                </div>
                            )}
                        </Card>

                        <button type="submit" disabled={loading}
                            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-60"
                            style={paymentMethod === 'razorpay' ? { background: '#00a854' } : {}}>
                            {paymentMethod === 'razorpay'
                                ? <><IndianRupee size={17} /> {loading ? 'Processing payment...' : `Pay ₹${(totalValue * 83).toLocaleString('en-IN')} with Razorpay`}</>
                                : <><Shield size={17} /> {loading ? 'Initializing escrow...' : 'Initialize Escrow Contract'}</>
                            }
                        </button>
                    </form>
                </div>

                {/* AI Draft Modal */}
                {aiModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between"
                                style={{ background: 'linear-gradient(to right, #fdf4ff, #fff)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">AI Contract Drafter</h3>
                                </div>
                                <button onClick={() => !aiGenerating && setAiModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-500 mb-4">
                                    Describe your project, budget, and milestone breakdown. The AI will structure it automatically.
                                </p>
                                {aiError && (
                                    <div className="mb-4 p-3 rounded-xl text-xs text-red-600 bg-red-50 border border-red-100 flex items-center gap-2">
                                        <AlertCircle size={14} /> {aiError}
                                    </div>
                                )}
                                <textarea
                                    className="w-full h-32 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none"
                                    placeholder="e.g. I need a Shopify website built in 30 days for 1500 USD. First milestone is design for 500. Second is development for 1000."
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    disabled={aiGenerating}
                                />
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={() => setAiModal(false)} disabled={aiGenerating} className="btn-ghost px-5 text-sm">Cancel</button>
                                    <button onClick={handleGenerate} disabled={aiGenerating || !aiPrompt.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                                        {aiGenerating ? (
                                            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Drafting...</>
                                        ) : (
                                            <><Sparkles size={16} /> Generate Contract</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
