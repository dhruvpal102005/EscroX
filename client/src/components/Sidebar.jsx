import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, FileText, Zap, Globe } from 'lucide-react';

const navItems = [
    { to: '/', icon: Globe, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/new-contract', icon: FileText, label: 'New Contract' },
    { to: '/integration', icon: Zap, label: 'Integration' },
];

const Sidebar = () => {
    return (
        <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 z-50"
            style={{ background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
            {/* Logo */}
            <div className="mb-10">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center neon-glow"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <Shield size={22} className="text-white" />
                </div>
            </div>

            <nav className="flex flex-col items-center gap-2 flex-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        title={label}
                        className={({ isActive }) =>
                            `w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative
              ${isActive
                                ? 'bg-blue-500/20 text-blue-400 neon-glow'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`
                        }
                    >
                        <Icon size={20} />
                        {/* Tooltip */}
                        <span className="absolute left-14 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                            {label}
                        </span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
