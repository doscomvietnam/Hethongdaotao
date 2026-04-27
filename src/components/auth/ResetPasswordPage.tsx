import React from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { updatePassword, updateMustChangePassword, getCurrentUser } from '../../services/authService';

interface ResetPasswordPageProps {
    onSuccess: () => void;
}

export default function ResetPasswordPage({ onSuccess }: ResetPasswordPageProps) {
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSuccess, setIsSuccess] = React.useState(false);

    const validate = (): string | null => {
        if (newPassword.length < 6) {
            return 'Mật khẩu phải có tối thiểu 6 ký tự';
        }
        if (newPassword !== confirmPassword) {
            return 'Mật khẩu xác nhận không trùng khớp';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        try {
            await updatePassword(newPassword);

            // Cập nhật must_change_password = false nếu user đã đăng nhập
            const user = await getCurrentUser();
            if (user) {
                try {
                    await updateMustChangePassword(user.id, false);
                } catch {
                    // Không block nếu update flag thất bại
                    console.warn('Không thể cập nhật must_change_password flag');
                }
            }

            setIsSuccess(true);
            // Chuyển về login/dashboard sau 2 giây
            setTimeout(() => onSuccess(), 2000);
        } catch (err: any) {
            setError(err.message || 'Đổi mật khẩu thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090B]">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/3 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
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
                    {!isSuccess ? (
                        <>
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <KeyRound className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <h2 className="text-lg font-black uppercase italic tracking-tight text-white">
                                        Đặt lại mật khẩu
                                    </h2>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có tối thiểu 6 ký tự.
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300 font-medium">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* New password */}
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 italic">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            id="reset-new-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                                            placeholder="Tối thiểu 6 ký tự"
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
                                    {/* Password strength indicator */}
                                    {newPassword.length > 0 && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        newPassword.length < 6
                                                            ? 'w-1/3 bg-red-500'
                                                            : newPassword.length < 10
                                                            ? 'w-2/3 bg-yellow-500'
                                                            : 'w-full bg-emerald-500'
                                                    }`}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold ${
                                                newPassword.length < 6 ? 'text-red-400' : newPassword.length < 10 ? 'text-yellow-400' : 'text-emerald-400'
                                            }`}>
                                                {newPassword.length < 6 ? 'Yếu' : newPassword.length < 10 ? 'Trung bình' : 'Mạnh'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 italic">
                                        Xác nhận mật khẩu
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            id="reset-confirm-password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                            placeholder="Nhập lại mật khẩu mới"
                                            disabled={isLoading}
                                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex={-1}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {/* Match indicator */}
                                    {confirmPassword.length > 0 && (
                                        <p className={`text-[10px] mt-1.5 font-bold ${
                                            newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {newPassword === confirmPassword ? '✓ Mật khẩu trùng khớp' : '✕ Mật khẩu chưa trùng khớp'}
                                        </p>
                                    )}
                                </div>

                                <button
                                    id="reset-submit"
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase italic tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:shadow-none"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang cập nhật...
                                        </>
                                    ) : (
                                        'Đặt lại mật khẩu'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success */
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic tracking-tight text-white mb-3">
                                Đổi mật khẩu thành công!
                            </h3>
                            <p className="text-sm text-zinc-400">
                                Đang chuyển hướng...
                            </p>
                            <div className="mt-4">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
                            </div>
                        </div>
                    )}
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
