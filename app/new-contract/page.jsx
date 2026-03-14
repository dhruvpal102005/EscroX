'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { Plus, Trash2, ArrowLeft, Shield, Check } from 'lucide-react';

export default function NewContractPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '', clientName: '', clientCountry: '', freelancerName: '', freelancerCountry: '',
        deadline: '', milestones: [{ title: '', amount: '' }]
    });
    const [submitted, setSubmitted] = useState(false);

    const addMs = () => setForm(f => ({ ...f, milestones: [...f.milestones, { title: '', amount: '' }] }));
    const removeMs = (i) => setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));
    const updateMs = (i, key, value) => setForm(f => {
        const ms = [...f.milestones]; ms[i] = { ...ms[i], [key]: value }; return { ...f, milestones: ms };
    });

    const totalValue = form.milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => router.push('/dashboard'), 2000);
    };

    if (submitted) return (
        <>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-50 border-2 border-green-200">
                        <Check size={36} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Contract Initialized!</h2>
                    <p className="text-slate-400">Redirecting to your dashboard...</p>
                </div>
            </div>
        </>
    );

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16">
                <div className="max-w-2xl mx-auto px-6 py-10">
                    <button onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
                        <ArrowLeft size={15} /> Back to Dashboard
                    </button>

                    <h1 className="text-2xl font-black text-slate-900 mb-1">New Escrow Contract</h1>
                    <p className="text-slate-400 text-sm mb-8">Define parties, milestones, and timeline. Funds lock until each milestone is approved.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card className="p-6">
                            <h2 className="font-bold text-slate-900 mb-4">Contract Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Project Title</label>
                                    <input required className="input" placeholder="e.g. Mobile App Development"
                                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[['Client Name', 'clientName', 'John Doe'], ['Client Country', 'clientCountry', '🇺🇸 USA'],
                                    ['Freelancer Name', 'freelancerName', 'Jane Smith'], ['Freelancer Country', 'freelancerCountry', '🇮🇳 India']
                                    ].map(([label, key, placeholder]) => (
                                        <div key={key}>
                                            <label className="text-xs text-slate-500 font-semibold mb-1.5 block">{label}</label>
                                            <input required className="input" placeholder={placeholder} value={form[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Deadline</label>
                                    <input type="date" required className="input" value={form.deadline}
                                        onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                </div>
                            </div>
                        </Card>

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
                                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                                            style={{ background: '#f5a623' }}>{i + 1}</div>
                                        <input required className="input flex-1 py-2" placeholder="Milestone title"
                                            value={m.title} onChange={e => updateMs(i, 'title', e.target.value)} />
                                        <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-3 bg-slate-50">
                                            <span className="text-slate-400 text-sm">$</span>
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
                                <span className="text-2xl font-black text-slate-900">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </Card>

                        <button type="submit" className="btn-primary w-full justify-center py-4 text-base">
                            <Shield size={17} /> Initialize Escrow Contract
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
