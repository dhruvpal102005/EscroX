import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';

const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = [
        { to: '/', label: 'Home', end: true },
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/new-contract', label: 'New Contract' },
        { to: '/integration', label: 'Integration' },
    ];

    return (
        <nav className="navbar fixed top-0 left-0 right-0 z-50 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ffb43b' }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900">EscrowX</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(({ to, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-3">
                    <Link to="/dashboard" className="btn-primary text-sm">
                        <span>⚡</span> Open Dashboard
                    </Link>
                </div>

                {/* Mobile toggle */}
                <button className="md:hidden p-2 rounded-lg text-slate-600" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1">
                    {links.map(({ to, label, end }) => (
                        <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `block px-4 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
