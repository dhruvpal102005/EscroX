'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
    Code, Terminal, Copy, Check, Zap, Globe,
    Shield, Briefcase, Database, Lock, Key,
    ChevronRight, Book, Layers, Box, Cpu,
    ArrowRight, Info, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_KEY = 'ESCROX_HACK_2026';

const SECTIONS = [
    { id: 'intro', label: 'Introduction', icon: Book },
    { id: 'auth', label: 'Authentication', icon: Lock },
    { id: 'create', label: 'Create Escrow', icon: Box },
    { id: 'approve', label: 'Approve Milestone', icon: Zap },
    { id: 'status', label: 'Get Status', icon: Database },
    { id: 'webhooks', label: 'Webhooks', icon: Globe },
];

export default function IntegrationPage() {
    const [activeSection, setActiveSection] = useState('intro');
    const [activeTab, setActiveTab] = useState('javascript');
    const [copied, setCopied] = useState('');

    const handleCopy = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(''), 2000);
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.5, rootMargin: '-10% 0px -70% 0px' }
        );

        SECTIONS.forEach((section) => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) {
            window.scrollTo({
                top: el.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    };

    const CodeTabs = ({ snippets }) => (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex gap-4">
                    {Object.keys(snippets).map(lang => (
                        <button
                            key={lang}
                            onClick={() => setActiveTab(lang)}
                            className={`text-[10px] font-bold uppercase tracking-widest py-2 px-1 border-b-2 transition-all ${activeTab === lang ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => handleCopy(snippets[activeTab], 'code')}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                >
                    {copied === 'code' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
            </div>
            <div className="p-6 overflow-x-auto font-mono text-sm leading-relaxed text-slate-300 custom-scrollbar">
                <pre><code>{snippets[activeTab]}</code></pre>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Sidebar */}
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 border-r border-slate-100 hidden lg:block overflow-y-auto px-6 py-10">
                <div className="mb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Documentation</h3>
                    <nav className="space-y-1">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => scrollTo(s.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeSection === s.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
                                    }`}
                            >
                                <s.icon size={16} />
                                {s.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <Key size={14} className="text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">API Key</span>
                    </div>
                    <div className="font-mono text-[11px] break-all bg-white/10 p-3 rounded-xl border border-white/10 mb-4 select-all">
                        {API_KEY}
                    </div>
                    <button className="w-full py-2 rounded-lg bg-blue-600 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all">
                        Rotate Key
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-24 pb-32 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto">

                {/* Intro Section */}
                <section id="intro" className="scroll-mt-32 mb-24">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 mb-6 uppercase tracking-wider">
                        <Cpu size={12} /> Infrastucture v1.0
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 mb-8 tracking-tight leading-[1.1]">
                        Programmable<br />
                        <span className="text-blue-600">Finance Engine.</span>
                    </h1>
                    <p className="text-xl text-slate-600 leading-relaxed max-w-3xl font-medium">
                        EscroX exposes its autonomous milestone-based escrow engine as a standard REST API.
                        Build your own marketplace, freelance platform, or gig economy app with secure, automated fund auditing.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                        <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 transition-all">
                            <Layers className="text-blue-500 mb-4" size={24} />
                            <h4 className="font-bold text-slate-900 mb-2">Product to Infrastructure</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">We provide the plumbing for trust. You focus on building the best user experience for your workers and clients.</p>
                        </div>
                        <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 transition-all">
                            <Globe className="text-blue-500 mb-4" size={24} />
                            <h4 className="font-bold text-slate-900 mb-2">Global Adaptability</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">Support for on-chain crypto payments and fiat bridges means you can operate across borders without friction.</p>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-100 mb-24" />

                {/* Auth Section */}
                <section id="auth" className="scroll-mt-32 mb-24">
                    <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Authentication</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Every request to the EscroX API must include your secret API Key in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">x-api-key</code> header.
                        Keep this key secure and never expose it in client-side code.
                    </p>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4 items-start mb-8">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h5 className="font-bold text-amber-900 text-sm mb-1">Security Warning</h5>
                            <p className="text-xs text-amber-700 leading-relaxed">If your API key is compromised, rotate it immediately from this portal to invalidate all current permissions.</p>
                        </div>
                    </div>

                    <CodeTabs snippets={{
                        javascript: `
// Standard Authentication Header
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_API_KEY'
};
                        `.trim(),
                        curl: `
curl -H "x-api-key: YOUR_API_KEY" \\
     -X GET https://escrox.vercel.app/api/v1/escrow/status/{id}
                        `.trim()
                    }} />
                </section>

                <hr className="border-slate-100 mb-24" />

                {/* Create Section */}
                <section id="create" className="scroll-mt-32 mb-24">
                    <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Create Escrow</h2>
                    <p className="text-slate-600 mb-10 leading-relaxed">
                        Initialize a new escrow contract programmatically. This generates a unique Escrow Vault with its own
                        milestone tracking and audit trail.
                    </p>

                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Endpoint Specification</h4>
                    <div className="overflow-x-auto mb-10">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 font-bold text-slate-400 border-r border-slate-50 pr-4 uppercase tracking-tighter">Field</th>
                                    <th className="py-4 px-4 font-bold text-slate-400 uppercase tracking-tighter">Type</th>
                                    <th className="py-4 px-4 font-bold text-slate-400 uppercase tracking-tighter">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-50">
                                    <td className="py-4 font-mono font-bold text-blue-600 border-r border-slate-50 pr-4">clientData</td>
                                    <td className="py-4 px-4 text-slate-500 font-medium">Object</td>
                                    <td className="py-4 px-4 text-slate-900 font-semibold">Contains <code className="text-[11px] text-blue-500 bg-blue-50 px-1 rounded">name</code> and <code className="text-[11px] text-blue-500 bg-blue-50 px-1 rounded">email</code> of the payer.</td>
                                </tr>
                                <tr className="border-b border-slate-50">
                                    <td className="py-4 font-mono font-bold text-blue-600 border-r border-slate-50 pr-4">contractData</td>
                                    <td className="py-4 px-4 text-slate-500 font-medium">Object</td>
                                    <td className="py-4 px-4 text-slate-900 font-semibold">Title, value, currency, and milestone array.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <CodeTabs snippets={{
                        javascript: `
const response = await fetch('/api/v1/escrow/create', {
  method: 'POST',
  headers: { 'x-api-key': 'KEY' },
  body: JSON.stringify({
    clientData: { name: 'Acme Corp', email: 'billing@acme.com' },
    freelancerData: { name: 'Bob Dev', email: 'bob@dev.sh' },
    contractData: {
      title: 'Backend API Design',
      totalValue: 1200,
      currency: 'USD',
      milestones: [
        { title: 'Draft', amount: 400, order: 0 },
        { title: 'Release', amount: 800, order: 1 }
      ]
    }
  })
});
                        `.trim(),
                        python: `
import requests

url = "https://escrox.vercel.app/api/v1/escrow/create"
payload = {
    "clientData": {"name": "Acme", "email": "a@acme.co"},
    "contractData": {"title": "API Build", "totalValue": 1000}
}
headers = {"x-api-key": "KEY"}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
                        `.trim()
                    }} />
                </section>

                <hr className="border-slate-100 mb-24" />

                {/* Approve Section */}
                <section id="approve" className="scroll-mt-32 mb-24">
                    <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Approve Milestone</h2>
                    <p className="text-slate-600 mb-10 leading-relaxed">
                        Programmatically release funds for a specific milestone. This should be called once work is verified
                        either by your own internal logic or manual client intervention.
                    </p>

                    <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden mb-12 shadow-2xl shadow-blue-200">
                        <Zap className="absolute top-[-20px] right-[-20px] opacity-10" size={120} />
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            Endpoint URL
                        </h4>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl font-mono text-sm border border-white/20 select-all">
                            <span className="font-black text-blue-200">POST</span> /api/v1/escrow/approve
                        </div>
                    </div>

                    <CodeTabs snippets={{
                        javascript: `
// Approve Milestone ID 'm_123'
await fetch('/api/v1/escrow/approve', {
  method: 'POST',
  headers: { 'x-api-key': 'KEY' },
  body: JSON.stringify({
    contractId: 'escrow_abc',
    milestoneId: 'm_123',
    approverName: 'Admin Panel'
  })
});
                        `.trim()
                    }} />
                </section>

                <hr className="border-slate-100 mb-24" />

                {/* Status Section */}
                <section id="status" className="scroll-mt-32 mb-24">
                    <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Get Status</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Fetch the real-time status of any escrow contract, including the full audit log and milestone completion status.
                    </p>

                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4 mb-10">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                            <Info className="text-blue-500" size={20} />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">Use this to sync your own database with EscroX internal state.</p>
                    </div>

                    <CodeTabs snippets={{
                        curl: `
curl -H "x-api-key: KEY" \\
     https://escrox.vercel.app/api/v1/escrow/status/ESCROW_ID
                        `.trim()
                    }} />
                </section>

                <hr className="border-slate-100 mb-24" />

                {/* Footer/CTA */}
                <section className="bg-slate-900 rounded-[40px] p-12 text-center text-white">
                    <h2 className="text-3xl font-black mb-6 tracking-tight font-outfit">Ready to scale trust?</h2>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto font-medium">
                        Join 500+ developers building secure marketplaces with the EscroX programmable escrow engine.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-8 py-4 rounded-2xl bg-blue-600 font-bold hover:bg-blue-500 transition-all flex items-center gap-2 justify-center">
                            Get Started Now <ArrowRight size={18} />
                        </button>
                        <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all">
                            Join Discord
                        </button>
                    </div>
                </section>

            </main>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 4px;
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                section {
                    scroll-behavior: smooth;
                }
            `}</style>
        </div>
    );
}
