'use client';
import { useState } from 'react';
import Card from '@/components/Card';
import { Copy, CheckCircle } from 'lucide-react';

export default function IntegrationClient({ endpoints }) {
    const [copied, setCopied] = useState(null);
    const copy = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopied(key); setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div className="space-y-4">
            {endpoints.map(({ method, path, desc, body, color, bg }, i) => (
                <Card key={i} className="p-5">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: bg, color }}>{method}</span>
                            <code className="text-sm font-mono text-slate-700">{path}</code>
                        </div>
                        <button onClick={() => copy(path, i)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            {copied === i ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{desc}</p>
                    {body && (
                        <pre className="text-xs text-slate-600 p-4 rounded-xl overflow-x-auto bg-slate-50 border border-slate-100">{body}</pre>
                    )}
                </Card>
            ))}
        </div>
    );
}
