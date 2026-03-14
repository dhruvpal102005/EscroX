'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';

const links = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/new-contract', label: 'New Contract' },
    { href: '/integration', label: 'Integration' },
];

export default function Navbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <nav className="navbar fixed top-0 left-0 right-0 z-50 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f5a623' }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900">EscrowX</span>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    {links.map(({ href, label }) => (
                        <Link key={href} href={href}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive(href) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <Link href="/dashboard" className="btn-primary text-sm">
                        <span>⚡</span> Open Dashboard
                    </Link>
                </div>

                <button className="md:hidden p-2 rounded-lg text-slate-600" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1">
                    {links.map(({ href, label }) => (
                        <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                            className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${isActive(href) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}
