import * as React from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, Users, AlertCircle, RefreshCw, Eye, EyeOff, Copy, CheckCircle2, Mail } from 'lucide-react';
import { AdminModal, ConfirmDialog, Field, TextInput } from './AdminModal';
import { Dropdown } from './Dropdown';
import { ImageUpload } from './ImageUpload';
import {
  getAllEmployees,
  createEmployeeWithAuth,
  generateRandomPassword,
  updateEmployee,
  deleteEmployee,
  type EmployeeInput,
  type CreateEmployeeWithAuthResult,
} from '../../services/employeeService';
import type { Employee } from '../../types';

const ROLES = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'manager', label: 'Quản lý' },
  { value: 'employee', label: 'Nhân viên' },
];

const emptyForm: EmployeeInput = {
  email: '',
  full_name: '',
  role: 'employee',
  department: '',
  position: '',
  phone: '',
  birth_date: '',
  gender: undefined,
  work_location: '',
  employment_status: 'active',
  must_change_password: true,
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

interface EmployeeManagementProps {
  onDataChanged?: () => void | Promise<void>;
  currentEmployee?: Employee;
}

export default function EmployeeManagement({ onDataChanged, currentEmployee }: EmployeeManagementProps) {
  const [rows, setRows] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<EmployeeInput>(emptyForm);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Modal hiện credentials sau khi tạo xong
  const [createdResult, setCreatedResult] = React.useState<CreateEmployeeWithAuthResult | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Employee | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setRows(await getAllEmployees()); }
    catch (e: any) { alert('Không tải được: ' + (e?.message || e)); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const isManager = currentEmployee?.role === 'manager';
  const managerDept = currentEmployee?.department || '';

  const filtered = React.useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter(r => {
      // Manager chỉ thấy nhân viên cùng phòng ban
      if (isManager && managerDept && r.department !== managerDept) return false;
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (!q) return true;
      return (
        normalize(r.full_name || '').includes(q) ||
        normalize(r.email || '').includes(q) ||
        normalize(r.department || '').includes(q) ||
        normalize(r.position || '').includes(q)
      );
    });
  }, [rows, search, roleFilter, isManager, managerDept]);

  const openNew = () => {
    setForm({
      ...emptyForm,
      // Manager: tự động điền phòng ban
      department: isManager ? managerDept : '',
    });
    setPassword('Doscom@2026');
    setShowPassword(false);
    setEditing({});
    setError(null);
  };

  const openEdit = (row: Employee) => {
    setForm({
      id: row.id,
      auth_user_id: row.auth_user_id || null,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      department: row.department || '',
      position: row.position || '',
      phone: row.phone || '',
      avatar_url: row.avatar_url || '',
      birth_date: row.birth_date || '',
      gender: row.gender,
      work_location: row.work_location || '',
      employment_status: row.employment_status,
      must_change_password: row.must_change_password,
    });
    setEditing(row);
    setError(null);
  };

  const closeModal = () => { if (!saving) { setEditing(null); setError(null); } };
  const isEditMode = editing && editing.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim()) { setError('Email bắt buộc'); return; }
    if (!form.full_name.trim()) { setError('Họ tên bắt buộc'); return; }
    if (!isEditMode && (!password || password.length < 6)) { setError('Mật khẩu ít nhất 6 ký tự'); return; }

    // Sanitize department: nếu user chọn "Khác..." nhưng chưa nhập gì → bỏ trống
    const cleanedForm = {
      ...form,
      department: form.department === '__custom__' ? '' : form.department,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        const { id, ...rest } = cleanedForm;
        await updateEmployee(editing.id, rest);
        await refresh();
        await onDataChanged?.();
        setEditing(null);
      } else {
        const result = await createEmployeeWithAuth(cleanedForm, password);
        await refresh();
        await onDataChanged?.();
        setEditing(null);
        setCreatedResult(result); // mở modal credentials
      }
    } catch (e: any) {
      console.error('[EmployeeManagement] Save error:', e);
      const details = [e?.message, e?.details, e?.hint, e?.code].filter(Boolean).join(' — ');
      let userMsg = details || 'Không lưu được nhân viên';
      if (/row-level security/i.test(userMsg) || e?.code === '42501') {
        userMsg = `RLS chặn thao tác. Chạy file supabase/fix_employees_rls.sql trên Supabase SQL Editor để cấp quyền admin. Chi tiết: ${userMsg}`;
      }
      setError(userMsg);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      await refresh();
      await onDataChanged?.();
      setDeleteTarget(null);
    } catch (e: any) { alert('Không xóa được: ' + (e?.message || e)); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800/50 w-full sm:w-[320px] focus-within:ring-2 focus-within:ring-emerald-500/20">
            <Search className="w-4 h-4 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email, phòng ban..." className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase tracking-[0.05em]" />
          </div>
          <Dropdown
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: 'Tất cả vai trò' },
              ...ROLES.map(r => ({ value: r.value, label: r.label })),
            ]}
            className="min-w-[180px]"
          />
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{filtered.length} nhân viên</span>
        </div>
        <button onClick={openNew} className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Thêm nhân viên
        </button>
      </div>

      <div className="rounded-[2rem] border border-zinc-900 overflow-hidden bg-[#0C0C0E]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/50">
                {['Họ tên', 'Email', 'Vai trò', 'Phòng ban', 'Vị trí', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-4 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-700 text-xs font-bold uppercase tracking-widest">
                  <Users className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  Chưa có nhân viên nào
                </td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-4 text-sm font-bold text-zinc-200 whitespace-nowrap">{row.full_name}</td>
                  <td className="px-4 py-4 text-xs font-mono font-bold text-zinc-400 max-w-[200px] truncate" title={row.email}>{row.email}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                      row.role === 'admin' ? 'bg-amber-500/10 text-amber-500' :
                      row.role === 'manager' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-zinc-900 text-zinc-400'
                    }`}>{ROLES.find(r => r.value === row.role)?.label || row.role}</span>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-zinc-400 whitespace-nowrap">{row.department || '—'}</td>
                  <td className="px-4 py-4 text-xs font-bold text-zinc-400 max-w-[180px] truncate" title={row.position || ''}>{row.position || '—'}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${row.employment_status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>{row.employment_status === 'active' ? 'Đang làm' : 'Đã nghỉ'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={editing !== null}
        onClose={closeModal}
        title={isEditMode ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
        subtitle={isEditMode ? form.email : 'Tạo bản ghi nhân viên'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-50">Huỷ</button>
            <button type="submit" form="employee-form" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'ĐANG LƯU...' : isEditMode ? 'CẬP NHẬT' : 'TẠO MỚI'}
            </button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">{error}</div>}

          {!isEditMode && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Tự động tạo tài khoản đăng nhập</p>
                <p className="text-[10px] text-emerald-200/70 font-bold leading-relaxed">
                  Khi bấm <strong>TẠO MỚI</strong>, hệ thống sẽ đồng thời tạo tài khoản Supabase Auth với email + mật khẩu bên dưới. Mật khẩu sẽ hiển thị 1 lần để bạn copy gửi nhân viên.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Email" required hint={isEditMode ? 'Sửa email sẽ đồng bộ cập nhật tài khoản đăng nhập' : 'Dùng để đăng nhập — có thể sửa lại sau'}>
              <TextInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Họ và tên" required>
              <TextInput value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
          </div>

          {!isEditMode && (
            <Field label="Mật khẩu khởi tạo" required hint="Tối thiểu 6 ký tự — bấm icon làm mới để sinh mật khẩu mới">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="pr-12 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
                    title={showPassword ? 'Ẩn' : 'Hiện'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setPassword(generateRandomPassword(12)); setShowPassword(true); }}
                  className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-colors"
                  title="Sinh mật khẩu ngẫu nhiên"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </Field>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Vai trò" required>
              <Dropdown
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v as any })}
                options={
                  isManager
                    ? ROLES.filter(r => r.value !== 'admin').map(r => ({ value: r.value, label: r.label }))
                    : ROLES.map(r => ({ value: r.value, label: r.label }))
                }
                className="w-full"
              />
            </Field>
            <Field label="Phòng ban">
              {isManager ? (
                /* Manager: phòng ban cố định = phòng ban của manager */
                <TextInput value={managerDept} disabled />
              ) : (
              (() => {
                const HIDDEN_DEPTS = ['Chủ tịch'];
                const existingDepts = Array.from(
                  new Set(rows.map(r => r.department).filter((d): d is string => !!d && d.trim() !== '' && !HIDDEN_DEPTS.includes(d)))
                ).sort((a, b) => a.localeCompare(b, 'vi'));
                const currentVal = form.department || '';
                const isCustom = currentVal !== '' && !existingDepts.includes(currentVal);
                const showCustomInput = isCustom && currentVal !== '__custom__';
                const dropdownValue = showCustomInput ? '__custom__' : currentVal;

                return (
                  <div className="space-y-2">
                    <Dropdown
                      value={dropdownValue}
                      onChange={(v) => {
                        if (v === '__custom__') {
                          setForm({ ...form, department: '__custom__' });
                          setTimeout(() => {
                            const input = document.getElementById('dept-custom-input');
                            if (input) (input as HTMLInputElement).focus();
                          }, 100);
                        } else {
                          setForm({ ...form, department: v });
                        }
                      }}
                      options={[
                        { value: '', label: '— Chọn phòng ban —' },
                        ...existingDepts.map(d => ({ value: d, label: d })),
                        { value: '__custom__', label: '＋ Nhập phòng ban khác...' },
                      ]}
                      className="w-full"
                    />
                    {(dropdownValue === '__custom__' || showCustomInput) && (
                      <TextInput
                        id="dept-custom-input"
                        placeholder="Nhập tên phòng ban mới..."
                        value={currentVal === '__custom__' ? '' : currentVal}
                        onChange={e => setForm({ ...form, department: e.target.value || '__custom__' })}
                      />
                    )}
                  </div>
                );
              })()
              )}
            </Field>
            <Field label="Vị trí">
              <TextInput value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Số điện thoại">
              <TextInput value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Ngày sinh">
              <TextInput type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
            </Field>
            <Field label="Giới tính">
              <Dropdown
                value={form.gender || ''}
                onChange={(v) => setForm({ ...form, gender: (v || undefined) as any })}
                options={[
                  { value: '', label: '—' },
                  { value: 'Nam', label: 'Nam' },
                  { value: 'Nữ', label: 'Nữ' },
                ]}
                className="w-full"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nơi làm việc">
              <TextInput value={form.work_location} onChange={e => setForm({ ...form, work_location: e.target.value })} />
            </Field>
            <Field label="Trạng thái">
              <Dropdown
                value={form.employment_status || 'active'}
                onChange={(v) => setForm({ ...form, employment_status: v as any })}
                options={[
                  { value: 'active', label: 'Đang làm' },
                  { value: 'inactive', label: 'Đã nghỉ' },
                ]}
                className="w-full"
              />
            </Field>
          </div>

          <Field label="Ảnh đại diện" hint="Tải file ảnh từ máy hoặc dán URL">
            <ImageUpload
              value={form.avatar_url || ''}
              onChange={url => setForm({ ...form, avatar_url: url })}
              folder="avatars"
              shape="square"
            />
          </Field>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa nhân viên"
        message={`Xóa nhân viên "${deleteTarget?.full_name}" (${deleteTarget?.email})? Tài khoản auth tương ứng (nếu có) sẽ KHÔNG bị xóa — bạn cần xóa thủ công qua Supabase Dashboard.`}
        confirmLabel="XÓA"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Modal hiển thị credentials sau khi tạo xong */}
      <CredentialsModal result={createdResult} onClose={() => setCreatedResult(null)} />
    </div>
  );
}

// ============================================================
// CredentialsModal — hiện email + password 1 lần sau khi tạo
// ============================================================
function CredentialsModal({
  result,
  onClose,
}: {
  result: CreateEmployeeWithAuthResult | null;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = React.useState<'email' | 'password' | 'both' | null>(null);

  const copy = async (text: string, field: 'email' | 'password' | 'both') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      alert('Không copy được — hãy chọn và copy thủ công.');
    }
  };

  return (
    <AdminModal
      open={!!result}
      onClose={onClose}
      title="Tạo nhân viên thành công"
      subtitle="Lưu lại thông tin đăng nhập — sẽ KHÔNG hiển thị lại"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 transition-all"
        >
          Đã lưu — Đóng
        </button>
      }
    >
      {result && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200/90 font-bold leading-relaxed">
              Tài khoản đã được tạo. Hãy <strong>copy</strong> và gửi cho nhân viên qua kênh an toàn (Lark, email cá nhân, v.v.).
            </p>
          </div>

          {result.needsEmailConfirm && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Cần xác minh email</p>
                <p className="text-[10px] text-amber-200/70 font-bold leading-relaxed">
                  Supabase đang bật "Confirm email". Nhân viên cần kiểm tra hộp thư <code className="font-mono">{result.email}</code> và bấm link xác minh trước khi đăng nhập. Nếu muốn bỏ bước này, vào Supabase → Authentication → Sign In/Up → tắt "Confirm email".
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email đăng nhập
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.email}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 font-mono select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copy(result.email, 'email')}
                  className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-emerald-500/20 border border-zinc-800 text-zinc-400 hover:text-emerald-500 flex items-center justify-center"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Mật khẩu khởi tạo</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.password}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-black tracking-wider select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copy(result.password, 'password')}
                  className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-emerald-500/20 border border-zinc-800 text-zinc-400 hover:text-emerald-500 flex items-center justify-center"
                  title="Copy mật khẩu"
                >
                  {copiedField === 'password' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => copy(`Email: ${result.email}\nMật khẩu: ${result.password}`, 'both')}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-black text-zinc-300 uppercase tracking-widest inline-flex items-center justify-center gap-2"
            >
              {copiedField === 'both' ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Đã copy cả 2</> : <><Copy className="w-3.5 h-3.5" /> Copy cả email + mật khẩu</>}
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
