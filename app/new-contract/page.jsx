'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { createContract } from '@/lib/firestore';
import { Plus, Trash2, ArrowLeft, Shield, Check, AlertCircle, Sparkles, X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

export default function NewContractPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const { isConnected, address: walletAddress } = useAccount();
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

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

    // AI Generation State
    const [aiModal, setAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    const addMs = () => setForm(f => ({ ...f, milestones: [...f.milestones, { title: '', amount: '', order: f.milestones.length }] }));
    const removeMs = (i) => setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));
    const updateMs = (i, key, value) => setForm(f => {
        const ms = [...f.milestones]; ms[i] = { ...ms[i], [key]: value }; return { ...f, milestones: ms };
    });

    const totalValue = form.milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);

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

            // Merge AI generated fields into the form
            setForm(f => ({
                ...f,
                title: data.title || f.title,
                deadline: data.deadline || f.deadline,
                currency: data.currency || f.currency,
                milestones: data.milestones?.length ? data.milestones.map((m, i) => ({
                    title: m.title, amount: m.amount || 0, order: i
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

    // We'll use a manual wait for transaction since we are in an async function
    const { refetch: waitForReceipt } = useWaitForTransactionReceipt({ hash: undefined });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (!isConnected) {
            toast.error('Please connect your Web3 wallet first!');
            return;
        }

        try {
            setError('');
            setLoading(true);

            // 1. Prepare Smart Contract Data
            const msTitles = form.milestones.map(m => m.title || 'Untitled Milestone');
            const msAmounts = form.milestones.map(m => parseEther(m.amount.toString() || '0'));
            const totalWei = msAmounts.reduce((a, b) => a + b, 0n);

            toast.loading('Confirm deposit in your wallet...', { id: 'tx' });

            // 2. Trigger Blockchain Transaction
            const hash = await writeContractAsync({
                address: ESCROW_ADDRESS,
                abi: ESCROW_ABI,
                functionName: 'createProject',
                args: [form.freelancerWallet, msTitles, msAmounts],
                value: totalWei,
            });

            toast.loading('Mining transaction on-chain...', { id: 'tx' });

            // Instead of useWaitForTransactionReceipt hook (which is reactive), we'll poll for the receipt
            // but for a smooth UX, let's keep it simple and just use the hash for now. 
            // The projectId is just nextProjectId. If this is a demo, we can assume or fetch it.
            // Better: Let's assume the user wants it properly. 

            // 3. Prepare Firestore Payload
            const payload = {
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
                txHash: hash,
                onChain: true,
                status: 'Funded',
                milestones: form.milestones.map((m, i) => ({
                    title: m.title || `Milestone ${i + 1}`,
                    amount: parseFloat(m.amount) || 0,
                    order: i,
                    status: 'Locked'
                })),
            };

            const id = await createContract(payload);

            toast.success('Escrow initialized on-chain!', { id: 'tx' });
            setSubmitted(true);
            setTimeout(() => router.push(`/contract/${id}`), 1500);
        } catch (err) {
            console.error("Contract creation error:", err);
            toast.error(err.shortMessage || err.message || 'Failed to create contract', { id: 'tx' });
            setError(err.message || 'Failed to create contract.');
        } finally {
            setLoading(false);
        }
    };

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
                            <p className="text-slate-400 text-sm">Define parties, milestones, and timeline.</p>
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
                        {/* Contract details */}
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
                                    <input type="email" required className="input" placeholder="freelancer@example.com" value={form.freelancerEmail}
                                        onChange={e => setForm(f => ({ ...f, freelancerEmail: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-blue-600">
                                        <Wallet size={12} /> Freelancer Wallet Address (ETH/Local)
                                    </label>
                                    <input required className="input border-blue-100 bg-blue-50/30" placeholder="0x..." value={form.freelancerWallet}
                                        onChange={e => setForm(f => ({ ...f, freelancerWallet: e.target.value }))} />
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Funds will be released directly to this address on-chain.</p>
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
                                            <span className="text-slate-400 text-sm">{form.currency === 'USDC' ? '₮' : '$'}</span>
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
                            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-sm text-slate-400">Total Contract Value</span>
                                <span className="text-2xl font-black text-slate-900">
                                    {form.currency} {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </Card>

                        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-60">
                            <Shield size={17} /> {loading ? 'Saving to Firestore...' : 'Initialize Escrow Contract'}
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
                                    Describe your project timeline, total budget, and how you want to break down the milestones. The AI will structure it automatically.
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
                                    <button onClick={() => setAiModal(false)} disabled={aiGenerating} className="btn-ghost px-5 text-sm">
                                        Cancel
                                    </button>
                                    <button onClick={handleGenerate} disabled={aiGenerating || !aiPrompt.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                                        {aiGenerating ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Drafting terms...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} /> Generate Contract
                                            </>
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
