'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { user, loginWithGoogle, loginWithEmail } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect whenever auth state resolves to logged-in
    useEffect(() => {
        if (user) router.replace('/dashboard');
    }, [user, router]);

    const handleGoogle = async () => {
        try {
            setError(''); setLoading(true);
            await loginWithGoogle();
            toast.success('Welcome back!');
            // useEffect above handles redirect
        } catch (e) {
            // COOP warnings cause signInWithPopup to reject even on success.
            // Only show error if user is still null after the attempt.
            if (!user) {
                toast.error('Google sign-in failed');
                setError('Google sign-in failed. Please try again.');
            }
        } finally { setLoading(false); }
    };

    const handleEmail = async (e) => {
        e.preventDefault();
        try {
            setError(''); setLoading(true);
            await loginWithEmail(email, password);
            toast.success('Welcome back!');
            // useEffect above handles redirect
        } catch (e) {
            toast.error('Incorrect email or password');
            setError('Incorrect email or password.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-surface flex">
            {/* Left panel */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 p-14"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ffb43b' }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg text-white">EscrowX</span>
                </div>
                <div>
                    <h2 className="text-4xl font-black text-white leading-tight mb-4">
                        Trust is a<br />
                        <span style={{ color: '#ffb43b' }}>Protocol,</span><br />
                        Not a Promise.
                    </h2>
                    <p className="text-slate-400 text-base leading-relaxed mb-10">
                        Programmable cross-border escrow for global freelance work. Funds locked, milestone-verified, auto-released.
                    </p>
                    <div className="flex gap-8">
                        {[['$2.4M+', 'Secured'], ['500+', 'Contracts'], ['40+', 'Countries']].map(([v, l]) => (
                            <div key={l}>
                                <p className="text-2xl font-black text-white">{v}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-slate-600">© 2026 EscrowX</p>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ffb43b' }}>
                            <Shield size={16} className="text-white" />
                        </div>
                        <span className="font-extrabold text-slate-900">EscrowX</span>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 mb-1">Welcome back</h1>
                    <p className="text-slate-400 mb-8">Sign in to your escrow dashboard</p>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-600 bg-red-50 border border-red-200">
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}

                    {/* Google */}
                    <button onClick={handleGoogle} disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all font-semibold text-slate-700 mb-5 text-sm disabled:opacity-60">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.9 19.6-20 0-1.3-.1-2.7-.4-4z" />
                            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
                            <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.2C29.5 35.6 26.9 36.5 24 36.5c-5.3 0-9.7-3.5-11.3-8.3l-6.6 5.1C9.7 39.5 16.3 44 24 44z" />
                            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6L37 39.9c3.6-3.3 5.9-8.2 5.9-13.9 0-1.3-.1-2.7-.4-4z" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">or</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleEmail} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Email</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com" className="input pl-9" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" className="input pl-9 pr-10" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60">
                            {loading ? 'Signing in...' : 'Sign In →'}
                        </button>
                    </form>

                    <p className="text-sm text-center text-slate-400 mt-6">
                        No account yet?{' '}
                        <Link href="/signup" className="font-semibold text-slate-900 hover:underline">
                            Create one for free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
