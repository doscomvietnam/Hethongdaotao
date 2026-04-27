import React from 'react';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertTriangle, Mail, Lock, ArrowRight } from 'lucide-react';
import { loginWithValidation } from '../../services/authService';
import type { Employee } from '../../types';
import type { User } from '@supabase/supabase-js';

interface LoginPageProps {
    onLoginSuccess: (user: User, employee: Employee, mustChangePassword: boolean) => void;
    onForgotPassword: () => void;
}

export default function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }
        if (!password) {
            setError('Vui lòng nhập mật khẩu');
            return;
        }

        setIsLoading(true);

        try {
            const result = await loginWithValidation(email, password);

            if (result.success === false) {
                setError(result.message);
                return;
            }

            onLoginSuccess(result.user, result.employee, result.mustChangePassword);
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không xác định');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090B]">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
                {/* Glow orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/3 blur-[120px]" />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/[0.02] blur-[100px]" />
            </div>

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">
                        DOSCOM
                    </h1>
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1">
                        Academy Platform
                    </p>
                </div>

                {/* Card */}
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40">
                    <div className="mb-8">
                        <h2 className="text-lg font-black uppercase italic tracking-tight text-white">
                            Đăng nhập hệ thống
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold italic">
                            Truy cập nội bộ doanh nghiệp
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300 font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 italic">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                    disabled={isLoading}
                                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 italic">
                                Mật khẩu
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot password link */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                disabled={isLoading}
                                className="text-xs text-emerald-500/70 hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest italic disabled:opacity-50"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase italic tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:shadow-none group"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang xác thực...
                                </>
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">
                            Hệ thống bảo mật nội bộ
                        </p>
                    </div>
                    <p className="text-[10px] text-zinc-700 font-medium">
                        © 2026 Doscom Enterprise. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
