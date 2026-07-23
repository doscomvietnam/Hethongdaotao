import React from 'react';
import {
    Mail, MapPin, Building2, Briefcase, Calendar, Phone,
    KeyRound, LogOut, ShieldCheck, ChevronLeft, Users, Camera, Loader2,
    Pencil, X, Save, CheckCircle2,
} from 'lucide-react';
import type { Employee } from '../../types';
import { uploadImage } from '../../services/storageService';
import { updateEmployee } from '../../services/employeeService';
import { convertGoogleDriveToDirectUrl } from '../../services/mediaHelpers';

interface ProfilePageProps {
    employee: Employee;
    onBack: () => void;
    onLogout: () => void;
    onChangePassword: () => void;
    onEmployeeUpdate?: (emp: Employee) => void;
}

interface EditForm {
    full_name: string;
    phone: string;
    birth_date: string;
    gender: 'Nam' | 'Nữ' | '';
    work_location: string;
}

export default function ProfilePage({ employee, onBack, onLogout, onChangePassword, onEmployeeUpdate }: ProfilePageProps) {
    const [uploading, setUploading] = React.useState(false);
    const [uploadError, setUploadError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Edit state
    const [isEditing, setIsEditing] = React.useState(false);
    const [editForm, setEditForm] = React.useState<EditForm>({
        full_name: '',
        phone: '',
        birth_date: '',
        gender: '',
        work_location: '',
    });
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = React.useState(false);

    const startEdit = () => {
        setEditForm({
            full_name: employee.full_name || '',
            phone: employee.phone || '',
            birth_date: employee.birth_date || '',
            gender: employee.gender || '',
            work_location: employee.work_location || '',
        });
        setSaveError(null);
        setSaveSuccess(false);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        if (!saving) {
            setIsEditing(false);
            setSaveError(null);
        }
    };

    const handleSave = async () => {
        if (!editForm.full_name.trim()) {
            setSaveError('Họ tên không được để trống');
            return;
        }

        setSaving(true);
        setSaveError(null);
        try {
            const payload: Record<string, any> = {
                full_name: editForm.full_name.trim(),
                phone: editForm.phone.trim() || null,
                birth_date: editForm.birth_date || null,
                gender: editForm.gender || null,
                work_location: editForm.work_location.trim() || null,
            };
            await updateEmployee(employee.id, payload);
            onEmployeeUpdate?.({
                ...employee,
                ...payload,
            });
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error('Lỗi cập nhật hồ sơ:', err);
            setSaveError(err?.message || 'Không lưu được thông tin');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        setUploading(true);
        try {
            const { url } = await uploadImage(file, 'avatars');
            await updateEmployee(employee.id, { avatar_url: url });
            onEmployeeUpdate?.({ ...employee, avatar_url: url });
        } catch (err: any) {
            console.error('Lỗi đổi avatar:', err);
            setUploadError(err?.message || 'Không tải được ảnh');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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

    // Read-only info items (admin-managed) — 2x2 grid
    const readOnlyItems = [
        { icon: Mail, label: 'Email', value: employee.email,
          iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', iconRing: 'ring-emerald-500/20' },
        { icon: ShieldCheck, label: 'Vai trò', value: roleLabels[employee.role] || employee.role,
          iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', iconRing: 'ring-amber-500/20' },
        { icon: Building2, label: 'Phòng ban', value: employee.department || '—',
          iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', iconRing: 'ring-blue-500/20' },
        { icon: Briefcase, label: 'Vị trí', value: employee.position || '—',
          iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10', iconRing: 'ring-purple-500/20' },
    ];

    // Editable info items (displayed in view mode)
    const editableItems = [
        { icon: Phone, label: 'Số điện thoại', value: employee.phone || '—',
          iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10', iconRing: 'ring-orange-500/20' },
        { icon: Calendar, label: 'Ngày sinh', value: formatDate(employee.birth_date),
          iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', iconRing: 'ring-amber-500/20' },
        { icon: Users, label: 'Giới tính', value: employee.gender || '—',
          iconColor: 'text-pink-400', iconBg: 'bg-pink-500/10', iconRing: 'ring-pink-500/20' },
        { icon: MapPin, label: 'Nơi làm việc', value: employee.work_location || '—',
          iconColor: 'text-cyan-400', iconBg: 'bg-cyan-500/10', iconRing: 'ring-cyan-500/20' },
    ];

    const inputClasses = "w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm";
    const selectClasses = "w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all appearance-none cursor-pointer shadow-sm";

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
                        <div className="relative group">
                            <button
                                type="button"
                                onClick={() => !uploading && fileInputRef.current?.click()}
                                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-zinc-900 border-4 border-[#09090B] shadow-2xl ring-2 ring-emerald-500/30 overflow-hidden cursor-pointer disabled:cursor-wait hover:ring-emerald-400/70 hover:scale-[1.03] transition-all duration-300"
                                disabled={uploading}
                                title="Đổi ảnh đại diện"
                            >
                                {employee.avatar_url ? (
                                    <img
                                        src={convertGoogleDriveToDirectUrl(employee.avatar_url)}
                                        alt={employee.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const img = e.currentTarget as HTMLImageElement;
                                            img.style.display = 'none';
                                            const fallback = img.nextElementSibling as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <span
                                    className="absolute inset-0 text-3xl font-black text-emerald-400 flex items-center justify-center drop-shadow-lg"
                                    style={{ display: employee.avatar_url ? 'none' : 'flex' }}
                                >
                                    {getInitials(employee.full_name)}
                                </span>

                                {/* Hover/upload overlay (full circle, blur) */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full transition-opacity duration-200 ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {uploading ? (
                                        <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                                    ) : (
                                        <Camera className="w-7 h-7 text-white drop-shadow" />
                                    )}
                                </div>
                            </button>

                            {/* Camera badge ở góc — luôn hiện để báo "có thể click" */}
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-[3px] border-[#09090B] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform pointer-events-none">
                                <Camera className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            {uploadError && (
                                <div className="absolute top-full left-0 mt-3 w-[420px] max-w-[80vw] text-[10px] text-red-300 font-bold leading-relaxed bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 z-10 shadow-2xl">
                                    <p className="text-red-400 mb-1 uppercase tracking-widest text-[11px]">Lỗi tải ảnh</p>
                                    <p className="text-red-200/80 normal-case font-semibold">{uploadError}</p>
                                </div>
                            )}
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

            {/* Info section */}
            <div className="mt-6 bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                        Thông tin cá nhân
                    </h2>
                    {!isEditing && (
                        <button
                            onClick={startEdit}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 transition-all text-[10px] font-black uppercase tracking-widest group"
                        >
                            <Pencil className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                {/* Success message */}
                {saveSuccess && (
                    <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-300">Cập nhật thông tin thành công!</span>
                    </div>
                )}

                {/* Read-only fields (admin-managed) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {readOnlyItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all group"
                        >
                            <div className={`w-11 h-11 rounded-2xl ${item.iconBg} ring-1 ${item.iconRing} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
                                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                    {item.label}
                                </p>
                                <p className="text-sm font-bold text-white mt-1 truncate">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="my-6 border-t border-zinc-800/60" />

                {/* Editable fields */}
                {!isEditing ? (
                    /* View mode */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {editableItems.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all group"
                            >
                                <div className={`w-11 h-11 rounded-2xl ${item.iconBg} ring-1 ${item.iconRing} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
                                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                        {item.label}
                                    </p>
                                    <p className="text-sm font-bold text-white mt-1 truncate">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Edit mode — light background for readability */
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-zinc-100/80 border border-zinc-200 rounded-2xl p-6">
                        {saveError && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] font-bold text-red-600">
                                {saveError}
                            </div>
                        )}

                        {/* Full name */}
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">
                                <Users className="w-3.5 h-3.5 text-emerald-500" />
                                Họ và tên <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                className={inputClasses}
                                placeholder="Nhập họ và tên..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Phone */}
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">
                                    <Phone className="w-3.5 h-3.5 text-orange-500" />
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Nhập số điện thoại..."
                                />
                            </div>

                            {/* Birth date */}
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">
                                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                    Ngày sinh
                                </label>
                                <input
                                    type="date"
                                    value={editForm.birth_date}
                                    onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Gender */}
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">
                                    <Users className="w-3.5 h-3.5 text-pink-500" />
                                    Giới tính
                                </label>
                                <select
                                    value={editForm.gender}
                                    onChange={e => setEditForm({ ...editForm, gender: e.target.value as any })}
                                    className={selectClasses}
                                >
                                    <option value="">— Chọn —</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                </select>
                            </div>

                            {/* Work location */}
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">
                                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                                    Nơi làm việc
                                </label>
                                <input
                                    type="text"
                                    value={editForm.work_location}
                                    onChange={e => setEditForm({ ...editForm, work_location: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Nhập nơi làm việc..."
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5" />
                                )}
                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                            <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-600 hover:text-zinc-800 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-sm"
                            >
                                <X className="w-3.5 h-3.5" />
                                Huỷ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={onChangePassword}
                    className="flex items-center justify-center gap-3 bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <KeyRound className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300 group-hover:text-emerald-400 transition-colors">
                        Đổi mật khẩu
                    </span>
                </button>

                <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-3 bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-5 hover:border-red-500/40 hover:bg-red-500/5 transition-all group"
                >
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LogOut className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300 group-hover:text-red-400 transition-colors">
                        Đăng xuất
                    </span>
                </button>
            </div>
        </div>
    );
}
