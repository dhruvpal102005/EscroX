import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { Code, Zap, Shield } from 'lucide-react';
import IntegrationClient from './IntegrationClient';

const endpoints = [
    {
        method: 'POST', path: '/api/v1/escrow/initiate', color: '#10b981', bg: '#ecfdf5',
        desc: 'Create a new escrow contract from an external marketplace.',
        body: `{\n  "externalId": "fiverr-order-12345",\n  "clientEmail": "client@example.com",\n  "freelancerEmail": "dev@example.com",\n  "totalValue": 1500,\n  "milestones": [\n    { "title": "UI Design", "amount": 500 },\n    { "title": "Development", "amount": 1000 }\n  ]\n}`
    },
    {
        method: 'PATCH', path: '/api/v1/escrow/:id/fund', color: '#f5a623', bg: '#fff8ec',
        desc: 'Lock funds into the escrow vault after collecting client payment.',
        body: `{ "transactionId": "txn_abc123" }`
    },
    {
        method: 'PATCH', path: '/api/v1/escrow/:id/milestone/:mId/submit', color: '#3b54f6', bg: '#eef0ff',
        desc: 'Freelancer submits evidence for a milestone, triggering inspection.',
        body: `{ "evidenceUrl": "https://github.com/your-repo/v1" }`
    },
    {
        method: 'PATCH', path: '/api/v1/escrow/:id/milestone/:mId/release', color: '#8b5cf6', bg: '#f5f3ff',
        desc: 'Client approves milestone — escrow releases payment autonomously.',
        body: null
    },
];

export default function IntegrationPage() {
    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-surface pt-16">
                <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
                    <div className="mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
                            style={{ background: '#fff8ec', color: '#c47d0a', border: '1px solid #fde68a' }}>
                            <Zap size={11} /> Integration API
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Marketplace Integration</h1>
                        <p className="text-slate-500 max-w-2xl text-sm">
                            Connect any freelance marketplace to this Autonomous Escrow Engine. A few API calls enables programmable, trustless cross-border payments.
                        </p>
                    </div>

                    {/* Steps */}
                    <Card className="p-6 mb-8">
                        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                            <Shield size={16} style={{ color: '#f5a623' }} /> Integration Flow
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { step: '1', title: 'Order Created on Marketplace', desc: 'When a client hires a freelancer on your platform, call POST /initiate to register the contract here.' },
                                { step: '2', title: 'Collect Payment', desc: 'Collect client payment via your gateway (Stripe, etc.), then call PATCH /fund to lock funds in escrow.' },
                                { step: '3', title: 'Autonomous Release', desc: 'When milestone is approved, this engine fires the disbursement. Your platform receives a webhook.' },
                            ].map(({ step, title, desc }) => (
                                <div key={step} className="p-4 rounded-2xl bg-surface border border-slate-100">
                                    <div className="text-2xl font-black mb-3" style={{ color: '#f5a623' }}>{step}</div>
                                    <h3 className="font-bold text-slate-900 text-sm mb-1.5">{title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* API Reference with copy buttons (Client Component) */}
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Code size={16} /> API Reference
                    </h2>
                    <IntegrationClient endpoints={endpoints} />
                </div>
            </div>
        </>
    );
}
