import * as React from 'react';
import {
  BarChart3, Save, Loader2, CheckCircle2,
  Users, GraduationCap, Box, HelpCircle, FileText, Tag,
} from 'lucide-react';
import { Field, TextInput, Select } from './AdminModal';
import { supabase } from '../../services/supabaseClient';

const SETTINGS_KEY = 'lms_system_settings';

interface SystemSettings {
  default_pass_score: string;
  default_max_attempts: string;
  app_name: string;
  primary_brand: string;
  enable_video_gate: 'yes' | 'no';
}

const DEFAULTS: SystemSettings = {
  default_pass_score: '80',
  default_max_attempts: '1',
  app_name: 'Doscom Academy',
  primary_brand: 'Doscom',
  enable_video_gate: 'no',
};

function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

function saveSettings(s: SystemSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

interface CountStats {
  employees: number;
  courses: number;
  products: number;
  quizzes: number;
  questions: number;
  progress: number;
}

export default function SystemSettings() {
  const [stats, setStats] = React.useState<CountStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [form, setForm] = React.useState<SystemSettings>(DEFAULTS);
  const [saving, setSaving] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);
  React.useEffect(() => { setForm(loadSettings()); }, []);

  const refreshStats = React.useCallback(async () => {
    setLoadingStats(true);
    try {
      const tables = ['employees', 'courses', 'products', 'quizzes', 'quiz_questions', 'training_progress'] as const;
      const results = await Promise.all(
        tables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }))
      );
      setStats({
        employees: results[0].count || 0,
        courses: results[1].count || 0,
        products: results[2].count || 0,
        quizzes: results[3].count || 0,
        questions: results[4].count || 0,
        progress: results[5].count || 0,
      });
    } catch (e) {
      console.error('Stats error:', e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  React.useEffect(() => { refreshStats(); }, [refreshStats]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      saveSettings(form);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    if (!confirm('Khôi phục về mặc định?')) return;
    setForm(DEFAULTS);
    saveSettings(DEFAULTS);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2400);
  };

  const STAT_CARDS = [
    { label: 'Nhân viên', value: stats?.employees, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Khóa học', value: stats?.courses, icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Sản phẩm', value: stats?.products, icon: Box, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Quiz', value: stats?.quizzes, icon: HelpCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Câu hỏi', value: stats?.questions, icon: FileText, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Tiến độ học', value: stats?.progress, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ── Section 1: System Overview ──────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 bg-emerald-500 rounded-full" />
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Tổng quan hệ thống</h3>
          </div>
          <button onClick={refreshStats} disabled={loadingStats} className="text-[10px] font-black text-zinc-500 hover:text-emerald-500 uppercase tracking-widest disabled:opacity-50">
            {loadingStats ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map((s, i) => (
            <div key={i} className="bg-[#0C0C0E] border border-zinc-900 rounded-2xl p-5 space-y-3 hover:border-zinc-800 transition-all">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-black text-white font-mono tabular-nums">
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-zinc-700" /> : (s.value ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Default Settings ─────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-emerald-500 rounded-full" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Tham số & cấu hình mặc định</h3>
        </div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest pl-4">Lưu trên trình duyệt — áp dụng cho các form thêm mới khóa học / quiz</p>

        <form onSubmit={handleSave} className="rounded-[2rem] border border-zinc-900 bg-[#0C0C0E] p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Tên hệ thống" hint="Hiển thị trên header / sidebar">
              <TextInput value={form.app_name} onChange={e => setForm({ ...form, app_name: e.target.value })} placeholder="VD: Doscom Academy" />
            </Field>
            <Field label="Nhóm đào tạo chính" hint="Mặc định khi tạo khóa học/sản phẩm mới">
              <Select value={form.primary_brand} onChange={e => setForm({ ...form, primary_brand: e.target.value })}>
                <option value="Doscom">Doscom</option>
                <option value="Noma">Noma</option>
                <option value="Nội bộ">Nội bộ</option>
                <option value="Claude">Claude</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="Điểm đạt mặc định (%)" hint="0-100">
              <TextInput type="number" min="0" max="100" value={form.default_pass_score} onChange={e => setForm({ ...form, default_pass_score: e.target.value })} />
            </Field>
            <Field label="Số lượt làm tối đa">
              <TextInput type="number" min="1" value={form.default_max_attempts} onChange={e => setForm({ ...form, default_max_attempts: e.target.value })} />
            </Field>
            <Field label="Bắt buộc xem video trước quiz">
              <Select value={form.enable_video_gate} onChange={e => setForm({ ...form, enable_video_gate: e.target.value as any })}>
                <option value="no">Không</option>
                <option value="yes">Có</option>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
            <button type="button" onClick={handleReset} className="text-[10px] font-black text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors">
              Khôi phục mặc định
            </button>
            <div className="flex items-center gap-3">
              {savedFlash && (
                <span className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ LƯU
                </span>
              )}
              <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu cấu hình
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ── Section 3: Brands (read-only) ────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-emerald-500 rounded-full" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Danh sách nhóm đào tạo</h3>
        </div>
        <div className="rounded-[2rem] border border-zinc-900 bg-[#0C0C0E] p-8">
          <div className="flex flex-wrap gap-3">
            {['Doscom', 'Noma', 'Nội bộ', 'Claude'].map(b => (
              <div key={b} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-black text-zinc-200 uppercase tracking-widest">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-5">Thêm/xóa nhóm đào tạo cần sửa trong source code <code className="font-mono text-emerald-500">src/types.ts</code></p>
        </div>
      </section>

      {/* ── Section 4: Info ─────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-emerald-500 rounded-full" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Thông tin ứng dụng</h3>
        </div>
        <div className="rounded-[2rem] border border-zinc-900 bg-[#0C0C0E] p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoRow label="Phiên bản" value="1.0.0" />
          <InfoRow label="Môi trường" value={import.meta.env.MODE || 'production'} />
          <InfoRow label="Backend" value="Supabase" />
        </div>
      </section>

    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-zinc-200 font-mono">{value}</p>
    </div>
  );
}

// Helper: re-exported so other forms can read defaults
export function getDefaultSettings(): SystemSettings {
  return loadSettings();
}
