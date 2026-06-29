import * as React from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, GraduationCap, HelpCircle, CalendarClock } from 'lucide-react';
import { AdminModal, ConfirmDialog, Field, TextInput, TextArea } from './AdminModal';
import { ImageUpload } from './ImageUpload';
import {
  getAllCoursesRaw,
  createCourse,
  updateCourse,
  deleteCourse,
  getDistinctDepartments,
  type CourseInput,
} from '../../services/courseService';
import type { Employee } from '../../types';
import {
  createQuiz, createQuestion, updateQuiz, updateQuestion, deleteQuestion,
  getAllQuizzesRaw, getAllQuestionsRaw,
} from '../../services/quizService';
import { Dropdown } from './Dropdown';

interface InlineQuestionDraft {
  id?: string;        // có id = question đã tồn tại trong DB
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

const emptyDraft = (): InlineQuestionDraft => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
});

function letterToCorrect(s: string): 'A' | 'B' | 'C' | 'D' {
  const v = (s || 'A').toUpperCase();
  return (['A', 'B', 'C', 'D'] as const).includes(v as any) ? (v as any) : 'A';
}

const BRANDS = ['Nội bộ', 'Tổng Quan Về Công Ty', 'Đào Tạo Onboarding', 'Nội Quy - Quy Chế', 'Văn Hóa Công Ty', 'Doscom', 'Noma', 'Claude'];
const STATUSES = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Tạm ẩn' },
];
const ALL_DEPT_VALUE = '__ALL_DEPT__';

const emptyForm: CourseInput = {
  course_id: '',
  course_name: '',
  brand: 'Doscom',
  category: '',
  department: '',
  course_type: 'training',
  product_id: '',
  thumbnail_url: '',
  slide_url: '',
  video_url: '',
  quiz_id: '',
  is_required: 'no',
  pass_score: '80',
  max_attempts: '1',
  status: 'active',
  start_date: '',
  end_date: '',
  video_duration_seconds: '',
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

interface CourseManagementProps {
  onDataChanged?: () => void | Promise<void>;
  currentEmployee?: Employee;
}

export default function CourseManagement({ onDataChanged, currentEmployee }: CourseManagementProps) {
  const isManager = currentEmployee?.role === 'manager';
  const managerDept = currentEmployee?.department || '';
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [brandFilter, setBrandFilter] = React.useState<string>('all');
  const [departments, setDepartments] = React.useState<string[]>([]);

  const [editing, setEditing] = React.useState<any | null>(null); // null = closed, {} = new, row = edit
  const [form, setForm] = React.useState<CourseInput>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Inline quiz creation/edit
  const [includeQuiz, setIncludeQuiz] = React.useState(false);
  const [existingQuizId, setExistingQuizId] = React.useState<string>(''); // có giá trị = quiz đã tồn tại
  const [quizMeta, setQuizMeta] = React.useState({ quiz_title: '', pass_score: '80', max_attempts: '1' });
  const [drafts, setDrafts] = React.useState<InlineQuestionDraft[]>(
    Array.from({ length: 10 }, () => emptyDraft())
  );
  const [deletedQuestionIds, setDeletedQuestionIds] = React.useState<string[]>([]);
  const [loadingQuiz, setLoadingQuiz] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [hasDeadline, setHasDeadline] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCoursesRaw();
      setRows(data);
    } catch (e: any) {
      console.error(e);
      alert('Không tải được danh sách khóa học: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  // Tải distinct phòng ban từ employees để dùng trong dropdown
  React.useEffect(() => {
    getDistinctDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const filtered = React.useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter(r => {
      // Manager: chỉ thấy khóa học phòng ban mình + khóa học chung (department = null)
      if (isManager && managerDept && r.department && r.department !== managerDept) return false;
      if (brandFilter !== 'all' && r.brand !== brandFilter) return false;
      if (!q) return true;
      return (
        normalize(r.course_id || '').includes(q) ||
        normalize(r.course_name || '').includes(q) ||
        normalize(r.category || '').includes(q) ||
        normalize(r.brand || '').includes(q) ||
        normalize(r.department || '').includes(q)
      );
    });
  }, [rows, search, brandFilter, isManager, managerDept]);

  // Manager chỉ được sửa/xóa khóa học thuộc phòng ban mình (khóa chung = chỉ xem)
  const canEditRow = (row: any) => {
    if (!isManager) return true; // Admin: full quyền
    return row.department === managerDept;
  };

  const resetQuizState = () => {
    setIncludeQuiz(false);
    setExistingQuizId('');
    setQuizMeta({ quiz_title: '', pass_score: '80', max_attempts: '1' });
    setDrafts(Array.from({ length: 10 }, () => emptyDraft()));
    setDeletedQuestionIds([]);
  };

  const openNew = () => {
    setForm({
      ...emptyForm,
      course_id: `C_${Date.now().toString(36).toUpperCase()}`,
      // Manager: tự động gán phòng ban
      department: isManager ? managerDept : '',
    });
    resetQuizState();
    setHasDeadline(false);
    setEditing({});
    setError(null);
  };

  const updateDraft = (idx: number, patch: Partial<InlineQuestionDraft>) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };
  const addDraftSlot = () => setDrafts(prev => [...prev, emptyDraft()]);
  const removeDraftSlot = (idx: number) => {
    setDrafts(prev => {
      const target = prev[idx];
      // Nếu là question đã có trong DB → đánh dấu xoá để delete khi save
      if (target?.id) {
        setDeletedQuestionIds(d => [...d, target.id!]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Load quiz + questions cho course đang edit
  const loadExistingQuiz = React.useCallback(async (quizId: string) => {
    setLoadingQuiz(true);
    try {
      const [allQuizzes, questions] = await Promise.all([
        getAllQuizzesRaw(),
        getAllQuestionsRaw(quizId),
      ]);
      const quiz = allQuizzes.find((q: any) => q.quiz_id === quizId);
      if (!quiz) {
        // Quiz_id ghi trong course nhưng quiz đã bị xoá — fallback: show trống cho user setup lại
        setIncludeQuiz(false);
        setExistingQuizId('');
        return;
      }
      setExistingQuizId(quiz.quiz_id);
      setIncludeQuiz(true);
      setQuizMeta({
        quiz_title: quiz.quiz_title || '',
        pass_score: quiz.pass_score || '80',
        max_attempts: quiz.max_attempts || '1',
      });
      const loadedDrafts: InlineQuestionDraft[] = (questions || []).map((q: any) => ({
        id: q.question_id,
        question_text: q.question_text || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_answer: letterToCorrect(q.correct_answer),
      }));
      // Đảm bảo luôn có ít nhất 1 slot trống ở cuối để admin thêm dễ
      if (loadedDrafts.length === 0) loadedDrafts.push(emptyDraft());
      setDrafts(loadedDrafts);
      setDeletedQuestionIds([]);
    } catch (e) {
      console.error('Lỗi load quiz:', e);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  const openEdit = (row: any) => {
    setForm({
      course_id: row.course_id || '',
      course_name: row.course_name || '',
      brand: row.brand || 'Doscom',
      category: row.category || '',
      department: row.department || '',
      course_type: row.course_type || 'training',
      product_id: row.product_id || '',
      thumbnail_url: row.thumbnail_url || '',
      slide_url: row.slide_url || '',
      video_url: row.video_url || '',
      quiz_id: row.quiz_id || '',
      is_required: row.is_required || 'no',
      pass_score: row.pass_score || '80',
      max_attempts: row.max_attempts || '1',
      status: row.status || 'active',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      video_duration_seconds: row.video_duration_seconds ?? '',
    });
    resetQuizState();
    setHasDeadline(!!(row.start_date || row.end_date));
    setEditing(row);
    setError(null);
    // Nếu course có quiz_id → load quiz + questions
    if (row.quiz_id) {
      loadExistingQuiz(row.quiz_id);
    }
  };

  const closeModal = () => { if (!saving) { setEditing(null); setError(null); } };

  const isEditMode = editing && editing.course_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.course_id.trim()) { setError('Mã khóa học bắt buộc'); return; }
    if (!form.course_name.trim()) { setError('Tên khóa học bắt buộc'); return; }
    if (!form.brand) { setError('Nhóm đào tạo bắt buộc'); return; }
    if (!form.category.trim()) { setError('Danh mục bắt buộc'); return; }

    // Validate deadline
    if (hasDeadline) {
      if (!form.end_date) { setError('Ngày kết thúc bắt buộc khi bật thời hạn'); return; }
      if (form.start_date && form.end_date && form.start_date > form.end_date) {
        setError('Ngày bắt đầu phải trước ngày kết thúc'); return;
      }
    }
    // Xoá dates nếu tắt deadline
    if (!hasDeadline) {
      form.start_date = null;
      form.end_date = null;
    }

    // Validate quiz inline (khi bật toggle, kể cả tạo mới và edit)
    let validQuestions: InlineQuestionDraft[] = [];
    let derivedQuizId = '';
    if (includeQuiz) {
      if (!quizMeta.quiz_title.trim()) { setError('Tiêu đề quiz bắt buộc'); return; }
      validQuestions = drafts.filter(d => d.question_text.trim());
      if (validQuestions.length === 0) { setError('Quiz cần ít nhất 1 câu hỏi'); return; }
      for (const [i, q] of validQuestions.entries()) {
        if (!q.option_a.trim() || !q.option_b.trim()) {
          setError(`Câu ${i + 1}: cần ít nhất 2 đáp án (A và B)`); return;
        }
      }
      derivedQuizId = existingQuizId || `Q_${form.course_id.replace(/^C_/, '')}`;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        // ── Edit course ─────────────────────────────────────────────
        const courseToUpdate = includeQuiz
          ? { ...form, quiz_id: derivedQuizId }
          : form;
        const { course_id, ...rest } = courseToUpdate;
        await updateCourse(course_id, rest);

        if (includeQuiz) {
          if (existingQuizId) {
            // Cập nhật quiz đã có
            await updateQuiz(existingQuizId, {
              quiz_title: quizMeta.quiz_title.trim(),
              pass_score: quizMeta.pass_score || '80',
              max_attempts: quizMeta.max_attempts || '1',
            });
          } else {
            // Quiz lần đầu được thêm cho course đã tồn tại
            await createQuiz({
              quiz_id: derivedQuizId,
              course_id: form.course_id,
              quiz_title: quizMeta.quiz_title.trim(),
              pass_score: quizMeta.pass_score || '80',
              max_attempts: quizMeta.max_attempts || '1',
              status: 'active',
            });
          }

          // Diff câu hỏi
          // 1. Xoá các câu user đã bấm Xoá
          for (const id of deletedQuestionIds) {
            await deleteQuestion(id);
          }
          // 2. Update/Insert
          for (const [i, q] of validQuestions.entries()) {
            const payload = {
              question_text: q.question_text.trim(),
              option_a: q.option_a.trim(),
              option_b: q.option_b.trim(),
              option_c: q.option_c.trim(),
              option_d: q.option_d.trim(),
              correct_answer: q.correct_answer,
            };
            if (q.id) {
              await updateQuestion(q.id, payload);
            } else {
              await createQuestion({
                question_id: `${derivedQuizId}_Q${Date.now().toString(36)}_${i}`,
                quiz_id: derivedQuizId,
                course_id: form.course_id,
                ...payload,
                status: 'active',
              });
            }
          }
        }
      } else {
        // ── Create course ──────────────────────────────────────────
        const courseToCreate = includeQuiz
          ? { ...form, quiz_id: derivedQuizId }
          : form;
        await createCourse(courseToCreate);

        if (includeQuiz) {
          await createQuiz({
            quiz_id: derivedQuizId,
            course_id: form.course_id,
            quiz_title: quizMeta.quiz_title.trim(),
            pass_score: quizMeta.pass_score || '80',
            max_attempts: quizMeta.max_attempts || '1',
            status: 'active',
          });
          for (const [i, q] of validQuestions.entries()) {
            await createQuestion({
              question_id: `${derivedQuizId}_Q${String(i + 1).padStart(2, '0')}`,
              quiz_id: derivedQuizId,
              course_id: form.course_id,
              question_text: q.question_text.trim(),
              option_a: q.option_a.trim(),
              option_b: q.option_b.trim(),
              option_c: q.option_c.trim(),
              option_d: q.option_d.trim(),
              correct_answer: q.correct_answer,
              status: 'active',
            });
          }
        }
      }
      await refresh();
      await onDataChanged?.();
      setEditing(null);
    } catch (e: any) {
      console.error('[CourseManagement] Save error:', e);
      // Bóc tách thông tin lỗi Supabase để hiện rõ nguyên nhân
      const details = [e?.message, e?.details, e?.hint, e?.code]
        .filter(Boolean)
        .join(' — ');
      let userMsg = details || 'Không lưu được khóa học';
      // Nhận diện lỗi RLS quen thuộc
      if (/row-level security/i.test(userMsg) || e?.code === '42501') {
        userMsg = `RLS chặn thao tác. Chạy file supabase/fix_admin_rls.sql trên Supabase SQL Editor để cấp quyền admin/manager. Chi tiết: ${userMsg}`;
      }
      setError(userMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteTarget.course_id);
      await refresh();
      await onDataChanged?.();
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      alert('Không xóa được: ' + (e?.message || e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800/50 w-full sm:w-[320px] focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <Search className="w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, danh mục..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase tracking-[0.05em]"
            />
          </div>
          <Dropdown
            value={brandFilter}
            onChange={setBrandFilter}
            options={[
              { value: 'all', label: 'Tất cả nhóm đào tạo' },
              ...BRANDS.map(b => ({ value: b, label: b })),
            ]}
            className="min-w-[200px]"
          />
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{filtered.length} kết quả</span>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Thêm khóa học
        </button>
      </div>

      {/* Table */}
      <div className="rounded-[2rem] border border-zinc-900 overflow-hidden bg-[#0C0C0E]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/50">
                {['Mã', 'Tên khóa học', 'Nhóm đào tạo', 'Phòng ban', 'Danh mục', 'Thời hạn', 'Loại nội dung', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-3 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-20 text-center">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-700 text-xs font-bold uppercase tracking-widest">
                  <GraduationCap className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  Chưa có khóa học nào
                </td></tr>
              ) : filtered.map(row => {
                const types: string[] = [];
                if (row.video_url) types.push('Video');
                if (row.slide_url) types.push('Slide');
                if (row.quiz_id) types.push('Quiz');
                return (
                  <tr key={row.course_id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                    <td className="px-3 py-4 text-xs font-mono font-bold text-emerald-500 whitespace-nowrap">{row.course_id}</td>
                    <td className="px-3 py-4 text-sm font-bold text-zinc-200 max-w-[220px] truncate" title={row.course_name}>{row.course_name}</td>
                    <td className="px-3 py-4"><span className="inline-block whitespace-nowrap text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-lg">{row.brand}</span></td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {row.department ? (
                        <span className="inline-block whitespace-nowrap text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">{row.department}</span>
                      ) : (
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tất cả</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-xs font-bold text-zinc-400 max-w-[160px] truncate" title={row.category}>{row.category}</td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {row.end_date ? (() => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const end = new Date(row.end_date); end.setHours(0, 0, 0, 0);
                        const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
                        if (days < 0) return <span className="inline-block whitespace-nowrap text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg">Quá hạn</span>;
                        if (days <= 2) return <span className="inline-block whitespace-nowrap text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">Còn {days}d</span>;
                        return <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">{new Date(row.end_date).toLocaleDateString('vi-VN')}</span>;
                      })() : (
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{types.length ? types.join(' + ') : '—'}</td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${row.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                        }`}>{row.status === 'active' ? 'Hoạt động' : 'Ẩn'}</span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {canEditRow(row) ? (
                          <>
                            <button onClick={() => openEdit(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-all" title="Sửa">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all" title="Xóa">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Chỉ xem</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AdminModal
        open={editing !== null}
        onClose={closeModal}
        title={isEditMode ? 'Sửa khóa học' : 'Thêm khóa học mới'}
        subtitle={isEditMode ? `Mã: ${form.course_id}` : 'Nhập thông tin khóa học mới'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50">Huỷ</button>
            <button type="submit" form="course-form" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 transition-all disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving
                ? 'ĐANG LƯU...'
                : isEditMode
                  ? includeQuiz
                    ? `CẬP NHẬT KHÓA HỌC + QUIZ`
                    : 'CẬP NHẬT'
                  : includeQuiz
                    ? `TẠO KHÓA HỌC + QUIZ${drafts.filter(d => d.question_text.trim()).length > 0 ? ` + ${drafts.filter(d => d.question_text.trim()).length} CÂU` : ''}`
                    : 'TẠO KHÓA HỌC'}
            </button>
          </>
        }
      >
        <form id="course-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Mã khóa học">
              <TextInput value={form.course_id} disabled placeholder="C_..." required />
            </Field>
            <Field label="Trạng thái">
              <Dropdown
                value={form.status || 'active'}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUSES.map(s => ({ value: s.value, label: s.label }))}
                className="w-full"
              />
            </Field>
          </div>

          <Field label="Tên khóa học" required>
            <TextInput value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} placeholder="VD: Quy trình R&D sản phẩm" required />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nhóm đào tạo" required>
              <Dropdown
                value={form.brand}
                onChange={(v) => setForm({ ...form, brand: v })}
                options={BRANDS.map(b => ({ value: b, label: b }))}
                className="w-full"
              />
            </Field>
            <Field label="Danh mục" required hint="VD: Quy trình, Sản Phẩm, Tài liệu đào tạo">
              <TextInput value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Quy trình" required />
            </Field>
          </div>

          <Field
            label="Phòng ban được giao"
            hint={isManager
              ? `Bạn chỉ có thể tạo khóa học cho phòng ban "${managerDept}".`
              : "Để 'Tất cả' nếu khóa học áp dụng cho mọi nhân viên. Khi chọn 1 phòng ban, hệ thống sẽ tự gửi thông báo cho nhân viên phòng đó."
            }
          >
            {isManager ? (
              <TextInput value={managerDept} disabled />
            ) : (
              <Dropdown
                value={form.department || ALL_DEPT_VALUE}
                onChange={(v) => setForm({ ...form, department: v === ALL_DEPT_VALUE ? '' : v })}
                options={[
                  { value: ALL_DEPT_VALUE, label: 'Tất cả phòng ban', hint: 'Mọi nhân viên đều thấy + nhận thông báo' },
                  ...departments
                    .filter(d => d.trim().toLowerCase() !== 'chủ tịch')
                    .map(d => ({ value: d, label: d })),
                ]}
                className="w-full"
              />
            )}
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Mã sản phẩm liên kết" hint="Để trống nếu không gắn sản phẩm">
              <TextInput value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: e.target.value })} placeholder="P_..." />
            </Field>
            <Field label="Mã quiz liên kết" hint="Để trống nếu không có bài kiểm tra">
              <TextInput value={form.quiz_id || ''} onChange={e => setForm({ ...form, quiz_id: e.target.value })} placeholder="Q_..." />
            </Field>
          </div>

          <Field label="Ảnh thumbnail" hint="Tải lên file ảnh hoặc dán URL (Google Drive, Unsplash...)">
            <ImageUpload
              value={form.thumbnail_url || ''}
              onChange={url => setForm({ ...form, thumbnail_url: url })}
              folder="course-thumbnails"
              shape="wide"
            />
          </Field>

          <Field label="URL Video" hint="Hỗ trợ YouTube (youtu.be/...) và Google Drive (/d/<id>/view)">
            <TextInput value={form.video_url || ''} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
          </Field>

          <Field
            label="Thời lượng video (giây) — tùy chọn"
            hint="Không bắt buộc. YouTube/MP4 tự detect. Google Drive: user sẽ tự bấm 'Đã xem xong' để mark 100%. Chỉ điền nếu muốn ghi đè (VD: 300 = 5 phút)."
          >
            <TextInput
              type="number"
              min="1"
              value={form.video_duration_seconds == null ? '' : String(form.video_duration_seconds)}
              onChange={e => setForm({ ...form, video_duration_seconds: e.target.value })}
              placeholder="Để trống = auto"
            />
          </Field>

          <Field label="URL Slide / Tài liệu" hint="Google Drive, Lark, hoặc file public khác — sẽ render qua iframe">
            <TextInput value={form.slide_url || ''} onChange={e => setForm({ ...form, slide_url: e.target.value })} placeholder="https://..." />
          </Field>

          {/* ── Thời hạn khóa học ──────────────────────────────────── */}
          <div className="pt-5 border-t border-zinc-900 space-y-4">
            <button
              type="button"
              onClick={() => {
                const next = !hasDeadline;
                setHasDeadline(next);
                if (!next) setForm({ ...form, start_date: '', end_date: '' });
              }}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${hasDeadline
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${hasDeadline ? 'bg-amber-500/20' : 'bg-zinc-900'
                }`}>
                <CalendarClock className={`w-5 h-5 ${hasDeadline ? 'text-amber-400' : 'text-zinc-500'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-white uppercase tracking-tight">
                  {hasDeadline ? 'Có thời hạn' : 'Không thời hạn'}
                </p>
                <p className="text-[10px] text-zinc-500 font-bold tracking-wide mt-1">
                  {hasDeadline
                    ? 'Nhân viên phải hoàn thành trước ngày kết thúc. Hệ thống sẽ thông báo trước 2 ngày.'
                    : 'Bấm để đặt thời hạn cho khóa học này.'}
                </p>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${hasDeadline ? 'bg-amber-500' : 'bg-zinc-800'
                }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${hasDeadline ? 'translate-x-5' : 'translate-x-0'
                  }`} />
              </div>
            </button>

            {hasDeadline && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02]">
                <Field label="Ngày bắt đầu" hint="Ngày khóa học bắt đầu (tùy chọn)">
                  <TextInput
                    type="date"
                    value={form.start_date || ''}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                  />
                </Field>
                <Field label="Ngày kết thúc" required hint="Nhân viên phải hoàn thành trước ngày này">
                  <TextInput
                    type="date"
                    value={form.end_date || ''}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    required={hasDeadline}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Bắt buộc">
              <Dropdown
                value={form.is_required || 'no'}
                onChange={(v) => setForm({ ...form, is_required: v })}
                options={[
                  { value: 'no', label: 'Không' },
                  { value: 'yes', label: 'Có' },
                ]}
                className="w-full"
              />
            </Field>
            <Field label="Điểm đạt (%)">
              <TextInput type="number" min="0" max="100" value={form.pass_score} onChange={e => setForm({ ...form, pass_score: e.target.value })} />
            </Field>
            <Field label="Số lượt làm tối đa">
              <TextInput type="number" min="1" value={form.max_attempts} onChange={e => setForm({ ...form, max_attempts: e.target.value })} />
            </Field>
          </div>

          {/* ── Inline quiz section (cả tạo mới và edit) ─────────────── */}
          <div className="pt-5 border-t border-zinc-900 space-y-4">
            <button
              type="button"
              onClick={() => {
                // Edit mode + đã có quiz: không cho tắt (tránh xoá nhầm)
                if (isEditMode && existingQuizId) return;
                setIncludeQuiz(v => !v);
              }}
              disabled={isEditMode && !!existingQuizId}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${includeQuiz
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50'
                } ${isEditMode && existingQuizId ? 'cursor-default' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${includeQuiz ? 'bg-emerald-500/20' : 'bg-zinc-900'
                }`}>
                <HelpCircle className={`w-5 h-5 ${includeQuiz ? 'text-emerald-400' : 'text-zinc-500'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-white uppercase tracking-tight">
                  {existingQuizId
                    ? `Quiz đã liên kết: ${existingQuizId}`
                    : includeQuiz
                      ? 'Đang thêm quiz cùng khóa học'
                      : isEditMode ? 'Khóa học chưa có quiz — bấm để thêm' : 'Có muốn thêm quiz cho khóa học này không?'}
                </p>
                <p className="text-[10px] text-zinc-500 font-bold tracking-wide mt-1">
                  {existingQuizId
                    ? 'Sửa metadata quiz và câu hỏi bên dưới. Để xoá quiz, dùng Supabase Table Editor.'
                    : includeQuiz
                      ? 'Bạn có thể nhập tới 10 câu hỏi (hoặc nhiều hơn). Quiz sẽ tự liên kết với khóa học.'
                      : 'Bấm để mở form quiz + 10 câu hỏi inline.'}
                </p>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${includeQuiz ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${includeQuiz ? 'translate-x-5' : 'translate-x-0'
                  }`} />
              </div>
            </button>

            {includeQuiz && loadingQuiz ? (
              <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] flex items-center justify-center gap-3 text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Đang tải quiz và câu hỏi...
              </div>
            ) : includeQuiz && (
              <div className="space-y-5 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-3">
                    <Field label="Tiêu đề quiz" required>
                      <TextInput
                        value={quizMeta.quiz_title}
                        onChange={e => setQuizMeta({ ...quizMeta, quiz_title: e.target.value })}
                        placeholder={`VD: Bài kiểm tra ${form.course_name || 'khóa học'}`}
                        required={includeQuiz}
                      />
                    </Field>
                  </div>
                  <Field label="Điểm đạt (%)">
                    <TextInput
                      type="number" min="0" max="100"
                      value={quizMeta.pass_score}
                      onChange={e => setQuizMeta({ ...quizMeta, pass_score: e.target.value })}
                    />
                  </Field>
                  <Field label="Số lượt làm tối đa">
                    <TextInput
                      type="number" min="1"
                      value={quizMeta.max_attempts}
                      onChange={e => setQuizMeta({ ...quizMeta, max_attempts: e.target.value })}
                    />
                  </Field>
                  <Field label={existingQuizId ? 'Mã quiz' : 'Mã quiz (tự sinh)'} hint={existingQuizId ? 'Quiz đã liên kết với khóa học' : 'Khóa học sẽ tự liên kết với quiz này'}>
                    <TextInput
                      value={existingQuizId || `Q_${form.course_id.replace(/^C_/, '')}`}
                      disabled
                    />
                  </Field>
                </div>

                {/* 10 câu hỏi slot */}
                <div className="pt-4 border-t border-emerald-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Danh sách câu hỏi</h4>
                      <p className="text-[10px] text-zinc-500 font-bold tracking-wide mt-1">
                        Nhập tối thiểu 1 câu — slot trống sẽ được bỏ qua
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addDraftSlot}
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                    >
                      + Thêm slot
                    </button>
                  </div>

                  <div className="space-y-3">
                    {drafts.map((d, idx) => (
                      <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Câu {idx + 1}</span>
                          {drafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDraftSlot(idx)}
                              className="text-[10px] font-black text-zinc-500 hover:text-red-400 uppercase tracking-widest"
                            >
                              Xoá
                            </button>
                          )}
                        </div>
                        <TextArea
                          value={d.question_text}
                          onChange={e => updateDraft(idx, { question_text: e.target.value })}
                          rows={2}
                          placeholder="Nội dung câu hỏi (để trống nếu không dùng slot này)"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(['A', 'B', 'C', 'D'] as const).map(letter => {
                            const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                            const isCorrect = d.correct_answer === letter;
                            return (
                              <div key={letter} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateDraft(idx, { correct_answer: letter })}
                                  title={isCorrect ? 'Đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black uppercase transition-all ${isCorrect
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                      : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400 border border-zinc-800'
                                    }`}
                                >
                                  {letter}
                                </button>
                                <TextInput
                                  value={d[key]}
                                  onChange={e => updateDraft(idx, { [key]: e.target.value })}
                                  placeholder={`Đáp án ${letter}`}
                                  className="flex-1"
                                />
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                          Đáp án đúng: <span className="text-emerald-500">{d.correct_answer}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa khóa học"
        message={`Bạn chắc chắn muốn xóa "${deleteTarget?.course_name}" (${deleteTarget?.course_id})? Hành động này không thể hoàn tác.`}
        confirmLabel="XÓA"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
