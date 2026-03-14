'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Lock, User, Globe, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const roles = [
    { value: 'client', label: '💼 Client', desc: 'I hire freelancers & fund escrow' },
    { value: 'freelancer', label: '👩‍💻 Freelancer', desc: 'I deliver work & receive payments' },
];

export default function SignupPage() {
    const { user, signupWithEmail, loginWithGoogle } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1 = role, 2 = details
    const [role, setRole] = useState('');
    const [form, setForm] = useState({ name: '', email: '', password: '', country: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect whenever auth resolves to logged-in (handles COOP popup quirks)
    useEffect(() => {
        if (user) router.replace('/dashboard');
    }, [user, router]);

    const handleGoogle = async () => {
        if (!role) {
            toast.error('Please select a role first');
            setError('Please select a role first.');
            return;
        }
        try {
            setError(''); setLoading(true);
            await loginWithGoogle(role);
            toast.success('Account created!');
        } catch {
            if (!user) {
                toast.error('Google sign-up failed');
                setError('Google sign-up failed.');
            }
        } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role) {
            toast.error('Please select a role');
            setError('Please select a role.');
            return;
        }
        try {
            setError(''); setLoading(true);
            await signupWithEmail(form.email, form.password, form.name, role, form.country);
            toast.success('Account created successfully!');
            // useEffect handles redirect
        } catch (err) {
            const msg = err.message?.includes('email-already-in-use') ? 'This email is already registered.' : 'Sign-up failed. Please try again.';
            toast.error(msg);
            setError(msg);
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-surface flex">
            {/* Left panel */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 p-14"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f5a623' }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg text-white">EscrowX</span>
                </div>
                <div>
                    <h2 className="text-4xl font-black text-white leading-tight mb-4">
                        Join the future<br />of <span style={{ color: '#f5a623' }}>trustless</span><br />payments.
                    </h2>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Whether you are a client protecting your investment or a freelancer ensuring you get paid —EscrowX has you covered.
                    </p>
                    <div className="space-y-3">
                        {['Milestone-based payment protection', 'Immutable audit trail on every contract', 'Cross-border, multi-currency support'].map(f => (
                            <div key={f} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500 text-white text-xs">✓</div>
                                <span className="text-slate-300 text-sm">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-slate-600">© 2026 EscrowX</p>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h1 className="text-3xl font-black text-slate-900 mb-1">Create account</h1>
                    <p className="text-slate-400 mb-8">Start securing your payments today</p>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-600 bg-red-50 border border-red-200">
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}

                    {/* Step 1 — Role */}
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-slate-600 mb-3">I am joining as a...</p>
                        <div className="grid grid-cols-2 gap-3">
                            {roles.map(r => (
                                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                                    className="p-4 rounded-xl border-2 text-left transition-all"
                                    style={{ borderColor: role === r.value ? '#f5a623' : '#e2e8f0', background: role === r.value ? '#fff8ec' : '#fff' }}>
                                    <p className="font-bold text-slate-900 text-sm">{r.label}</p>
                                    <p className="text-xs text-slate-400 mt-1 leading-tight">{r.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Google */}
                    <button onClick={handleGoogle} disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all font-semibold text-slate-700 mb-5 text-sm disabled:opacity-60">
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
                        <span className="text-xs text-slate-400 font-medium">or fill in details</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { icon: User, key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
                            { icon: Globe, key: 'country', label: 'Country', type: 'text', placeholder: '🇮🇳 India' },
                            { icon: Mail, key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
                        ].map(({ icon: Icon, key, label, type, placeholder }) => (
                            <div key={key}>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{label}</label>
                                <div className="relative">
                                    <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input required type={type} placeholder={placeholder} value={form[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="input pl-9" />
                                </div>
                            </div>
                        ))}

                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input required type={showPass ? 'text' : 'password'} minLength={6} placeholder="Min. 6 characters"
                                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input pl-9 pr-10" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60">
                            {loading ? 'Creating account...' : 'Create Account →'}
                        </button>
                    </form>

                    <p className="text-sm text-center text-slate-400 mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-slate-900 hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
