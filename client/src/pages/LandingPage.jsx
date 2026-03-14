import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Check, Lock, Globe, Zap, ChevronDown } from 'lucide-react';

const steps = [
    { icon: '🤝', label: 'Agreement', desc: 'Both parties agree on terms & milestones' },
    { icon: '💰', label: 'Buyer Pays', desc: 'Client funds the escrow vault' },
    { icon: '📦', label: 'Work Delivered', desc: 'Freelancer submits evidence' },
    { icon: '✅', label: 'Inspection', desc: 'Client reviews & approves' },
    { icon: '🚀', label: 'Funds Released', desc: 'Auto-disbursement to freelancer' },
];

const features = [
    { icon: Lock, color: '#f5a623', bg: '#fff8ec', title: 'Autonomous Vault', desc: 'Funds locked in a transparent ledger — no intermediary can touch them.' },
    { icon: Globe, color: '#3b54f6', bg: '#eef0ff', title: 'Cross-Border Ready', desc: 'Works globally. Standardised proof of completion across jurisdictions.' },
    { icon: Check, color: '#10b981', bg: '#ecfdf5', title: 'Evidence-Based Release', desc: 'Payment triggers only when verified work evidence is submitted & approved.' },
    { icon: Zap, color: '#8b5cf6', bg: '#f5f3ff', title: 'Marketplace API', desc: 'One POST call from any marketplace to initialise a programmable escrow.' },
];

const LandingPage = () => {
    return (
        <div className="bg-white">
            {/* ── HERO ────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-screen">
                {/* Left */}
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
                        style={{ background: '#fff8ec', color: '#c47d0a', border: '1px solid #fde68a' }}>
                        <Shield size={12} />
                        Programmable Cross-Border Escrow
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6 text-slate-900">
                        Autonomous<br />
                        <span style={{ color: '#f5a623' }}>Escrow</span> Engine<br />
                        for Global Work.
                    </h1>

                    <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-md">
                        Securing cross-border freelance payments with programmable finance. Funds are locked, milestone-verified, and released autonomously — no banks, no fraud, no disputes.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <Link to="/dashboard" className="btn-primary text-base px-7 py-3">
                            <span>⚡</span> Open Dashboard
                            <ArrowRight size={16} />
                        </Link>
                        <Link to="/new-contract" className="btn-outline text-base px-7 py-3">
                            Start Escrow
                        </Link>
                    </div>

                    {/* Social proof */}
                    <div className="flex items-center gap-8 mt-12 pt-12 border-t border-slate-100">
                        {[['$2.4M+', 'Secured in Escrow'], ['500+', 'Contracts Created'], ['40+', 'Countries']].map(([num, label]) => (
                            <div key={label}>
                                <p className="text-2xl font-black text-slate-900">{num}</p>
                                <p className="text-sm text-slate-400">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — floating UI cards */}
                <div className="relative hidden lg:block h-[520px]">
                    {/* Decorative squiggle */}
                    <svg className="absolute top-12 left-8 w-56 h-32 text-brand opacity-60" viewBox="0 0 200 80" fill="none">
                        <path d="M10 40 C40 10, 80 70, 120 40 C160 10, 190 60, 200 40" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>

                    {/* Background decorative blob */}
                    <div className="absolute top-8 right-0 w-80 h-80 rounded-3xl" style={{ background: 'linear-gradient(135deg, #fef9ec 0%, #eff6ff 100%)' }} />

                    {/* Funds Released card */}
                    <div className="float-card absolute top-6 right-4 p-4 w-52 z-10">
                        <p className="text-xs text-slate-400 font-medium mb-3">Funds released</p>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-base">👤</div>
                            <div className="flex-1 h-1 bg-slate-100 rounded-full">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full w-3/4" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-base">✅</div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                            <Check size={14} style={{ color: '#16a34a' }} />
                            <span className="text-xs font-semibold text-green-700">Confirmed</span>
                        </div>
                    </div>

                    {/* Center collage */}
                    <div className="absolute top-20 left-16 grid grid-cols-2 gap-3 z-10">
                        {['🧑‍💼', '👩‍💻', '👨‍🎨', '👩‍🔬'].map((emoji, i) => (
                            <div key={i} className="w-28 h-28 rounded-2xl flex items-center justify-center text-5xl"
                                style={{ background: ['#fef9ec', '#eff6ff', '#f0fdf4', '#fdf2fa'][i], border: '2px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                                {emoji}
                            </div>
                        ))}
                    </div>

                    {/* Send / Start Escrow card */}
                    <div className="float-card absolute bottom-16 left-16 p-5 w-52 z-20">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Start Escrow</p>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #3b54f6, #7c3aed)' }}>
                            <Shield size={22} className="text-white" />
                        </div>
                        <Link to="/new-contract" className="btn-primary w-full justify-center text-sm py-2.5">
                            Create Contract
                        </Link>
                    </div>

                    {/* Decorative stars */}
                    <div className="absolute bottom-32 right-12 text-3xl">✦</div>
                    <div className="absolute bottom-48 right-24 text-lg" style={{ color: '#f5a623' }}>✦</div>
                </div>
            </section>

            {/* ── 5-STEP FLOW ──────────────────────────────── */}
            <section className="bg-slate-900 py-20">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-black text-white mb-3">The 5-Step Autonomous Flow</h2>
                        <p className="text-slate-400">Inspired by Escrow.com's proven trust model, built for the global digital economy.</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-0">
                        {steps.map((step, i) => (
                            <React.Fragment key={step.label}>
                                <div className="flex-1 flex flex-col items-center text-center px-4">
                                    <div className="w-14 h-14 rounded-2xl text-2xl flex items-center justify-center mb-4"
                                        style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        {step.icon}
                                    </div>
                                    <p className="font-bold text-white text-sm mb-1">{step.label}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="hidden md:flex items-center mt-7 text-slate-600 text-xl">→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────── */}
            <section className="py-24 max-w-7xl mx-auto px-6 md:px-12">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Why EscrowX?</h2>
                    <p className="text-slate-500">The only programmable escrow built for borderless digital work.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map(({ icon: Icon, color, bg, title, desc }) => (
                        <div key={title} className="card card-hover p-6">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: bg }}>
                                <Icon size={22} style={{ color }} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2 text-sm">{title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────── */}
            <section className="pb-24 px-6 md:px-12">
                <div className="max-w-4xl mx-auto text-center py-16 px-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                    <h2 className="text-4xl font-black text-white mb-4">Ready to secure your payments?</h2>
                    <p className="text-slate-400 mb-10 text-lg">Create an escrow contract in minutes. Your funds, your rules, your proof.</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/new-contract" className="btn-primary text-base px-8 py-3.5">
                            Start Escrow Now →
                        </Link>
                        <Link to="/integration" className="btn-ghost text-white border-white/20 text-base px-8 py-3.5" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
                            Integration API
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 py-8 px-12 flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f5a623' }}>
                        <Shield size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-slate-700">EscrowX</span>
                </div>
                <p className="text-sm text-slate-400">© 2026 EscrowX · Programmable Cross-Border Escrow</p>
            </footer>
        </div>
    );
};

export default LandingPage;
