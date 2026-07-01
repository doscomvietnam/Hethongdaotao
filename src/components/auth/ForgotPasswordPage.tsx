import React from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle2, Send, KeyRound, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { resetPasswordForEmail, verifyRecoveryOtp, updatePassword, updateMustChangePassword, getCurrentUser } from '../../services/authService';

interface ForgotPasswordPageProps {
    onBackToLogin: () => void;
}

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
    const [step, setStep] = React.useState<Step>('email');
    const [email, setEmail] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Bước 1: Gửi email
    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            await resetPasswordForEmail(email);
        } catch {
            // Luôn tiếp tục để tránh tiết lộ email có tồn tại không
        } finally {
            setIsLoading(false);
            setStep('otp');
        }
    };

    // Bước 2: Xác nhận OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            await verifyRecoveryOtp(email, otp);
            setStep('password');
        } catch (err: any) {
            setError(err.message || 'Mã không đúng, vui lòng thử lại');
        } finally {
            setIsLoading(false);
        }
    };

    // Bước 3: Đặt mật khẩu mới
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) { setError('Mật khẩu phải có tối thiểu 6 ký tự'); return; }
        if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
        setIsLoading(true);
        setError(null);
        try {
            await updatePassword(newPassword);
            const user = await getCurrentUser();
            if (user) {
                try { await updateMustChangePassword(user.id, false); } catch { /* không block */ }
            }
            setStep('done');
        } catch (err: any) {
            setError(err.message || 'Đặt mật khẩu thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090B]">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '60px 60px' }}
                />
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/3 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-zinc-800/60 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden">
                        <img src="/logo.png" alt="Doscom Academy" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white">DOSCOM</h1>
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1">Academy Platform</p>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40">

                    {/* Bước 1: Nhập email */}
                    {step === 'email' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-lg font-black uppercase tracking-tight text-white">Quên mật khẩu</h2>
                                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                                    Nhập email của bạn. Chúng tôi sẽ gửi <strong className="text-zinc-300">mã xác nhận</strong> đến email.
                                </p>
                            </div>
                            <form onSubmit={handleSendEmail} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Email đăng ký</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="email" value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            autoFocus disabled={isLoading}
                                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading || !email.trim()}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:shadow-none">
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Đang gửi...</> : <><Send className="w-4 h-4" />Gửi mã xác nhận</>}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Bước 2: Nhập mã OTP */}
                    {step === 'otp' && (
                        <>
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-white">Nhập mã xác nhận</h2>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Mã xác nhận đã gửi về <strong className="text-zinc-300">{email}</strong>.<br />
                                    Kiểm tra cả hộp thư spam nếu không thấy.
                                </p>
                            </div>
                            {error && (
                                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-300 font-medium">{error}</div>
                            )}
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Mã xác nhận</label>
                                    <input
                                        type="text" value={otp}
                                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }}
                                        placeholder="00000000"
                                        autoFocus maxLength={8} inputMode="numeric"
                                        disabled={isLoading}
                                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-4 text-center text-2xl font-black text-white tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                                    />
                                </div>
                                <button type="submit" disabled={isLoading || otp.length < 6}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:shadow-none">
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Đang xác nhận...</> : <>Xác nhận mã</>}
                                </button>
                                <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                                    className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-bold">
                                    Gửi lại mã
                                </button>
                            </form>
                        </>
                    )}

                    {/* Bước 3: Đặt mật khẩu mới */}
                    {step === 'password' && (
                        <>
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <KeyRound className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-white">Đặt mật khẩu mới</h2>
                                </div>
                                <p className="text-xs text-zinc-500">Mật khẩu phải có tối thiểu 6 ký tự.</p>
                            </div>
                            {error && (
                                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-300 font-medium">{error}</div>
                            )}
                            <form onSubmit={handleSetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Mật khẩu mới</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                                            placeholder="Tối thiểu 6 ký tự"
                                            autoFocus disabled={isLoading}
                                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {newPassword.length > 0 && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${newPassword.length < 6 ? 'w-1/3 bg-red-500' : newPassword.length < 10 ? 'w-2/3 bg-yellow-500' : 'w-full bg-emerald-500'}`} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${newPassword.length < 6 ? 'text-red-400' : newPassword.length < 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                {newPassword.length < 6 ? 'Yếu' : newPassword.length < 10 ? 'Trung bình' : 'Mạnh'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Xác nhận mật khẩu</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                            placeholder="Nhập lại mật khẩu mới"
                                            disabled={isLoading}
                                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                        />
                                    </div>
                                    {confirmPassword.length > 0 && (
                                        <p className={`text-[10px] mt-1.5 font-bold ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {newPassword === confirmPassword ? '✓ Mật khẩu trùng khớp' : '✕ Chưa trùng khớp'}
                                        </p>
                                    )}
                                </div>
                                <button type="submit" disabled={isLoading}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:shadow-none mt-2">
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Đang cập nhật...</> : 'Xác nhận đặt lại mật khẩu'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Hoàn thành */}
                    {step === 'done' && (
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-3">Đổi mật khẩu thành công!</h3>
                            <p className="text-sm text-zinc-400">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                        </div>
                    )}

                    {/* Back to login */}
                    {step !== 'password' && (
                        <button onClick={onBackToLogin}
                            className="w-full mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest py-3">
                            <ArrowLeft className="w-4 h-4" />
                            {step === 'done' ? 'Đăng nhập ngay' : 'Quay lại đăng nhập'}
                        </button>
                    )}
                </div>

                <div className="text-center mt-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Hệ thống bảo mật nội bộ</p>
                    </div>
                    <p className="text-[10px] text-zinc-700 font-medium">© 2026 Doscom Enterprise. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
