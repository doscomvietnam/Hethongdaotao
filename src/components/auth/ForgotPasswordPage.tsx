import React from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { resetPasswordForEmail } from '../../services/authService';

interface ForgotPasswordPageProps {
    onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
    const [email, setEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSent, setIsSent] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) return;

        setIsLoading(true);

        try {
            await resetPasswordForEmail(email);
            setIsSent(true);
        } catch {
            // Luôn hiển thị thành công để tránh tiết lộ email
            setIsSent(true);
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
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-zinc-800/60 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden">
                        <img src="/logo.png" alt="Doscom Academy" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-3xl font-black uppercase  tracking-tight text-white">
                        DOSCOM
                    </h1>
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1">
                        Academy Platform
                    </p>
                </div>

                {/* Card */}
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40">
                    {!isSent ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-lg font-black uppercase  tracking-tight text-white">
                                    Quên mật khẩu
                                </h2>
                                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                                    Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
                                    Liên kết sẽ được gửi về hộp thư trong vài phút.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 ">
                                        Email đăng ký
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            autoComplete="email"
                                            disabled={isLoading}
                                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50 font-medium"
                                        />
                                    </div>
                                </div>

                                <button
                                    id="forgot-submit"
                                    type="submit"
                                    disabled={isLoading || !email.trim()}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-black text-sm uppercase  tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:shadow-none group"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Gửi liên kết đặt lại
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success state */
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-black uppercase  tracking-tight text-white mb-3">
                                Email đã được gửi
                            </h3>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-2">
                                Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
                            </p>
                            <p className="text-xs text-zinc-600">
                                Kiểm tra cả hộp thư spam nếu không thấy email.
                            </p>
                        </div>
                    )}

                    {/* Back to login */}
                    <button
                        onClick={onBackToLogin}
                        className="w-full mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest  py-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại đăng nhập
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] ">
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
