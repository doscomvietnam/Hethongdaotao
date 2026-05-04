import React from 'react';
import {
    Mail, MapPin, Building2, Briefcase, Calendar,
    KeyRound, LogOut, ShieldCheck, ChevronLeft, Users,
} from 'lucide-react';
import type { Employee } from '../../types';

interface ProfilePageProps {
    employee: Employee;
    onBack: () => void;
    onLogout: () => void;
    onChangePassword: () => void;
}

export default function ProfilePage({ employee, onBack, onLogout, onChangePassword }: ProfilePageProps) {

    const roleLabels: Record<string, string> = {
        admin: 'Quản trị viên',
        manager: 'Quản lý',
        employee: 'Nhân viên',
    };

    const roleBadgeColors: Record<string, string> = {
        admin: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        employee: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };


    const infoItems = [
        { icon: Mail, label: 'Email', value: employee.email },
        { icon: Calendar, label: 'Ngày sinh', value: formatDate(employee.birth_date) },
        { icon: Users, label: 'Giới tính', value: employee.gender || '—' },
        { icon: Building2, label: 'Phòng ban', value: employee.department || '—' },
        { icon: Briefcase, label: 'Vị trí', value: employee.position || '—' },
        { icon: MapPin, label: 'Nơi làm việc', value: employee.work_location || '—' },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest  mb-8 group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Quay lại
            </button>

            {/* Profile header card */}
            <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
                {/* Banner */}
                <div className="h-28 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-zinc-900 relative">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                            backgroundSize: '30px 30px'
                        }}
                    />
                </div>

                {/* Avatar & Name */}
                <div className="px-8 pb-8">
                    <div className="flex items-end gap-6 -mt-10">
                        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-[#09090B] flex items-center justify-center shadow-xl ring-1 ring-zinc-800">
                            <span className="text-2xl font-black  text-emerald-500">
                                {getInitials(employee.full_name)}
                            </span>
                        </div>
                        <div className="flex-1 pb-1">
                            <h1 className="text-xl font-black uppercase  tracking-tight text-white">
                                {employee.full_name}
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest  border ${roleBadgeColors[employee.role]}`}>
                                    <ShieldCheck className="w-3 h-3" />
                                    {roleLabels[employee.role]}
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-widest ">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Đang hoạt động
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info grid */}
            <div className="mt-6 bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40">
                <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 ">
                    Thông tin cá nhân
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {infoItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 hover:border-zinc-700/60 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
                                <item.icon className="w-4 h-4 text-zinc-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ">
                                    {item.label}
                                </p>
                                <p className="text-sm font-bold text-white mt-0.5 truncate">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={onChangePassword}
                    className="flex items-center justify-center gap-3 bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                >
                    <KeyRound className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-black uppercase  tracking-widest text-zinc-400 group-hover:text-emerald-400 transition-colors">
                        Đổi mật khẩu
                    </span>
                </button>

                <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-3 bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-5 hover:border-red-500/30 hover:bg-red-500/5 transition-all group"
                >
                    <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
                    <span className="text-xs font-black uppercase  tracking-widest text-zinc-400 group-hover:text-red-400 transition-colors">
                        Đăng xuất
                    </span>
                </button>
            </div>
        </div>
    );
}
