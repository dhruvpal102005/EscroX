'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shield, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const links = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/new-contract', label: 'New Contract' },
    { href: '/integration', label: 'Integration' },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <nav className="navbar fixed top-0 left-0 right-0 z-50 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f5a623' }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900">EscrowX</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(({ href, label }) => (
                        <Link key={href} href={href}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive(href) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}>
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Right: Auth & Web3 */}
                <div className="hidden md:flex items-center gap-4">
                    <ConnectButton showBalance={false} chainStatus="icon" />

                    {user ? (
                        <div className="relative">
                            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ background: '#f5a623' }}>
                                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-slate-900 leading-none">{user.displayName || 'User'}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{profile?.role || 'member'}</p>
                                </div>
                                <ChevronDown size={13} className="text-slate-400" />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 card py-1.5 z-50 shadow-xl border border-slate-100 bg-white rounded-xl">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 capitalize">{profile?.country || ''}</p>
                                    </div>
                                    <button onClick={handleLogout}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-b-xl">
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
                            <Link href="/signup" className="btn-primary text-sm">Get Started →</Link>
                        </div>
                    )}
                </div>

                {/* Mobile toggle */}
                <button className="md:hidden p-2 rounded-lg text-slate-600" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1 shadow-lg rounded-b-2xl">
                    {links.map(({ href, label }) => (
                        <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                            className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${isActive(href) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`}>
                            {label}
                        </Link>
                    ))}

                    <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-3">
                        {/* Mobile Connect Button Container */}
                        <div className="flex justify-center w-full">
                            <ConnectButton showBalance={false} chainStatus="icon" />
                        </div>

                        {user ? (
                            <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                                <LogOut size={16} /> Sign Out
                            </button>
                        ) : (
                            <Link href="/login" onClick={() => setMobileOpen(false)}
                                className="block w-full px-4 py-3 rounded-xl text-sm font-semibold text-center btn-primary">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
