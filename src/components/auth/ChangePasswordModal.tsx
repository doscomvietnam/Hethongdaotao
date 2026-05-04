import React from 'react';
import { X, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { updatePassword, updateMustChangePassword } from '../../services/authService';

interface ChangePasswordModalProps {
    authUserId: string;
    isForced: boolean; // true nếu must_change_password = true (không cho đóng)
    onSuccess: () => void;
    onClose: () => void;
}

export default function ChangePasswordModal({ authUserId, isForced, onSuccess, onClose }: ChangePasswordModalProps) {
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
            await updateMustChangePassword(authUserId, false);

            setIsSuccess(true);
            setTimeout(() => onSuccess(), 1500);
        } catch (err: any) {
            setError(err.message || 'Đổi mật khẩu thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    // Chặn đóng modal nếu forced
    const handleClose = () => {
        if (isForced) return;
        onClose();
    };

    // Chặn click bên ngoài modal nếu forced
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (isForced) return;
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md mx-4 bg-zinc-950 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/60">
                {/* Close button (chỉ hiện khi không forced) */}
                {!isForced && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {!isSuccess ? (
                    <>
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase  tracking-tight text-white">
                                        Đổi mật khẩu
                                    </h2>
                                    {isForced && (
                                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest ">
                                            Bắt buộc đổi trước khi tiếp tục
                                        </p>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                {isForced
                                    ? 'Đây là lần đăng nhập đầu tiên. Bạn cần đổi mật khẩu để đảm bảo an toàn tài khoản.'
                                    : 'Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có tối thiểu 6 ký tự.'
                                }
                            </p>
                        </div>

                        {/* Forced warning */}
                        {isForced && (
                            <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-300 font-medium">
                                    Bạn không thể bỏ qua bước này. Vui lòng đặt mật khẩu mới.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New password */}
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 ">
                                    Mật khẩu mới
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        id="change-new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                                        placeholder="Tối thiểu 6 ký tự"
                                        disabled={isLoading}
                                        autoFocus
                                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
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
                                {/* Strength */}
                                {newPassword.length > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-300 ${
                                                newPassword.length < 6 ? 'w-1/3 bg-red-500'
                                                : newPassword.length < 10 ? 'w-2/3 bg-yellow-500'
                                                : 'w-full bg-emerald-500'
                                            }`} />
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
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 ">
                                    Xác nhận mật khẩu
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        id="change-confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                        placeholder="Nhập lại mật khẩu mới"
                                        disabled={isLoading}
                                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
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
                                {confirmPassword.length > 0 && (
                                    <p className={`text-[10px] mt-1.5 font-bold ${
                                        newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {newPassword === confirmPassword ? '✓ Mật khẩu trùng khớp' : '✕ Mật khẩu chưa trùng khớp'}
                                    </p>
                                )}
                            </div>

                            <button
                                id="change-password-submit"
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase  tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:shadow-none mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang cập nhật...
                                    </>
                                ) : (
                                    'Xác nhận đổi mật khẩu'
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
                        <h3 className="text-lg font-black uppercase  tracking-tight text-white mb-3">
                            Đổi mật khẩu thành công!
                        </h3>
                        <p className="text-sm text-zinc-400">
                            {isForced ? 'Đang chuyển đến hệ thống...' : 'Mật khẩu đã được cập nhật.'}
                        </p>
                        <div className="mt-4">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
