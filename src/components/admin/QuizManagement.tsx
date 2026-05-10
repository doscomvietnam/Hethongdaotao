import * as React from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { AdminModal, ConfirmDialog, Field, TextInput, TextArea } from './AdminModal';
import { Dropdown } from './Dropdown';
import {
  getAllQuizzesRaw,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllQuestionsRaw,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type QuizInput,
  type QuestionInput,
} from '../../services/quizService';

const emptyQuiz: QuizInput = { quiz_id: '', course_id: '', quiz_title: '', pass_score: '80', max_attempts: '1', status: 'active' };
const emptyQuestion = (quizId: string): QuestionInput => ({
  question_id: '',
  quiz_id: quizId,
  course_id: '',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  status: 'active',
});

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

interface QuizManagementProps {
  onDataChanged?: () => void | Promise<void>;
}

export default function QuizManagement({ onDataChanged }: QuizManagementProps = {}) {
  // ── State for the two views ──────────────────────────────────────────
  const [view, setView] = React.useState<'quizzes' | 'questions'>('quizzes');
  const [activeQuiz, setActiveQuiz] = React.useState<any | null>(null);

  return view === 'quizzes' ? (
    <QuizListView
      onOpenQuestions={(quiz) => { setActiveQuiz(quiz); setView('questions'); }}
      onDataChanged={onDataChanged}
    />
  ) : (
    <QuestionListView quiz={activeQuiz} onBack={() => setView('quizzes')} onDataChanged={onDataChanged} />
  );
}

interface InlineQuestionDraft {
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

function QuizListView({ onOpenQuestions, onDataChanged }: { onOpenQuestions: (quiz: any) => void; onDataChanged?: () => void | Promise<void> }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<QuizInput>(emptyQuiz);
  const [drafts, setDrafts] = React.useState<InlineQuestionDraft[]>(
    Array.from({ length: 10 }, () => emptyDraft())
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setRows(await getAllQuizzesRaw()); }
    catch (e: any) { alert('Không tải được: ' + (e?.message || e)); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return rows;
    return rows.filter(r => normalize(r.quiz_id || '').includes(q) || normalize(r.quiz_title || '').includes(q) || normalize(r.course_id || '').includes(q));
  }, [rows, search]);

  const openNew = () => {
    setForm({ ...emptyQuiz, quiz_id: `Q_${Date.now().toString(36).toUpperCase()}` });
    setDrafts(Array.from({ length: 10 }, () => emptyDraft()));
    setEditing({});
    setError(null);
  };

  const updateDraft = (idx: number, patch: Partial<InlineQuestionDraft>) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };
  const addDraftSlot = () => setDrafts(prev => [...prev, emptyDraft()]);
  const removeDraftSlot = (idx: number) => setDrafts(prev => prev.filter((_, i) => i !== idx));

  const openEdit = (row: any) => {
    setForm({
      quiz_id: row.quiz_id || '',
      course_id: row.course_id || '',
      quiz_title: row.quiz_title || '',
      pass_score: row.pass_score || '80',
      max_attempts: row.max_attempts || '1',
      status: row.status || 'active',
    });
    setEditing(row);
    setError(null);
  };

  const closeModal = () => { if (!saving) { setEditing(null); setError(null); } };
  const isEditMode = editing && editing.quiz_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.quiz_id.trim()) { setError('Mã quiz bắt buộc'); return; }
    if (!form.quiz_title.trim()) { setError('Tiêu đề quiz bắt buộc'); return; }

    // Validate inline questions ở chế độ tạo mới
    let validQuestions: InlineQuestionDraft[] = [];
    if (!isEditMode) {
      validQuestions = drafts.filter(d => d.question_text.trim());
      for (const [i, q] of validQuestions.entries()) {
        if (!q.option_a.trim() || !q.option_b.trim()) {
          setError(`Câu ${i + 1}: cần ít nhất 2 đáp án (A và B)`); return;
        }
      }
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const { quiz_id, ...rest } = form;
        await updateQuiz(quiz_id, rest);
      } else {
        await createQuiz(form);
        // Bulk insert câu hỏi
        for (const [i, q] of validQuestions.entries()) {
          await createQuestion({
            question_id: `${form.quiz_id}_Q${String(i + 1).padStart(2, '0')}`,
            quiz_id: form.quiz_id,
            course_id: form.course_id || null,
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
      await refresh();
      await onDataChanged?.();
      setEditing(null);
    } catch (e: any) { setError(e?.message || 'Không lưu được'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuiz(deleteTarget.quiz_id);
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã, tiêu đề..." className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase tracking-[0.05em]" />
          </div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{filtered.length} quiz</span>
        </div>
        <button onClick={openNew} className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Thêm quiz
        </button>
      </div>

      <div className="rounded-[2rem] border border-zinc-900 overflow-hidden bg-[#0C0C0E]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/50">
                {['Mã quiz', 'Tiêu đề', 'Khóa học', 'Điểm đạt', 'Số lượt', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-700 text-xs font-bold uppercase tracking-widest">
                  <HelpCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  Chưa có quiz nào
                </td></tr>
              ) : filtered.map(row => (
                <tr key={row.quiz_id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-500 whitespace-nowrap">{row.quiz_id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-200">{row.quiz_title}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-400 whitespace-nowrap">{row.course_id || '—'}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-300 tabular-nums">{row.pass_score}%</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-300 tabular-nums">{row.max_attempts}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${row.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>{row.status === 'active' ? 'Hoạt động' : 'Ẩn'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => onOpenQuestions(row)} className="px-3 h-9 rounded-xl bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                        Câu hỏi <ChevronRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => openEdit(row)} className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(row)} className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
        title={isEditMode ? 'Sửa quiz' : 'Thêm quiz mới'}
        subtitle={isEditMode ? `Mã: ${form.quiz_id}` : 'Tạo bài kiểm tra + câu hỏi trong 1 lần'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-50">Huỷ</button>
            <button type="submit" form="quiz-form" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'ĐANG LƯU...' : isEditMode ? 'CẬP NHẬT' : `TẠO QUIZ${!isEditMode && drafts.filter(d => d.question_text.trim()).length > 0 ? ` + ${drafts.filter(d => d.question_text.trim()).length} CÂU HỎI` : ''}`}
            </button>
          </>
        }
      >
        <form id="quiz-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">{error}</div>}

          {!isEditMode && !form.course_id && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300 leading-relaxed">
              ⚠️ Quiz không có <span className="text-amber-400">Mã khóa học liên kết</span> sẽ KHÔNG hiển thị cho nhân viên (vì hệ thống chỉ render quiz qua trang chi tiết khóa học). Để nhân viên làm được, hãy điền course_id.
            </div>
          )}

          {/* ── Thông tin quiz ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Mã quiz" required hint="Không trùng — VD: Q_NOIBO_01">
              <TextInput value={form.quiz_id} onChange={e => setForm({ ...form, quiz_id: e.target.value })} disabled={!!isEditMode} placeholder="Q_..." required />
            </Field>
            <Field label="Mã khóa học liên kết" hint="VD: C_NOIBO_S01 — bắt buộc nếu muốn nhân viên làm được">
              <TextInput value={form.course_id || ''} onChange={e => setForm({ ...form, course_id: e.target.value })} placeholder="C_..." />
            </Field>
          </div>
          <Field label="Tiêu đề quiz" required>
            <TextInput value={form.quiz_title} onChange={e => setForm({ ...form, quiz_title: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Điểm đạt (%)">
              <TextInput type="number" min="0" max="100" value={form.pass_score} onChange={e => setForm({ ...form, pass_score: e.target.value })} />
            </Field>
            <Field label="Số lượt làm tối đa">
              <TextInput type="number" min="1" value={form.max_attempts} onChange={e => setForm({ ...form, max_attempts: e.target.value })} />
            </Field>
            <Field label="Trạng thái">
              <Dropdown
                value={form.status || 'active'}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'inactive', label: 'Tạm ẩn' },
                ]}
                className="w-full"
              />
            </Field>
          </div>

          {/* ── Câu hỏi inline (chỉ ở chế độ tạo mới) ─────────────── */}
          {!isEditMode && (
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Danh sách câu hỏi</h3>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                    Nhập tối thiểu 1 câu — slot trống sẽ được bỏ qua
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDraftSlot}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-black text-emerald-400 uppercase tracking-widest inline-flex items-center gap-2"
                >
                  + Thêm slot
                </button>
              </div>

              <div className="space-y-4">
                {drafts.map((d, idx) => (
                  <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Câu {idx + 1}</span>
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftSlot(idx)}
                          className="text-[10px] font-black text-zinc-500 hover:text-red-400 uppercase tracking-widest"
                        >
                          Xoá slot
                        </button>
                      )}
                    </div>

                    <Field label="Nội dung câu hỏi">
                      <TextArea
                        value={d.question_text}
                        onChange={e => updateDraft(idx, { question_text: e.target.value })}
                        rows={2}
                        placeholder="Để trống nếu không dùng slot này"
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(['A', 'B', 'C', 'D'] as const).map(letter => {
                        const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                        const isCorrect = d.correct_answer === letter;
                        return (
                          <div key={letter} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateDraft(idx, { correct_answer: letter })}
                              title={isCorrect ? 'Đáp án đúng' : 'Bấm để đánh dấu là đáp án đúng'}
                              className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black uppercase transition-all ${
                                isCorrect
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
                      Đáp án đúng: <span className="text-emerald-500">{d.correct_answer}</span> — bấm chữ A/B/C/D bên trái để đổi
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa quiz"
        message={`Xóa quiz "${deleteTarget?.quiz_title}" (${deleteTarget?.quiz_id})? Câu hỏi liên quan có thể bị mất tham chiếu.`}
        confirmLabel="XÓA"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

function QuestionListView({ quiz, onBack, onDataChanged }: { quiz: any; onBack: () => void; onDataChanged?: () => void | Promise<void> }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<QuestionInput>(emptyQuestion(quiz?.quiz_id || ''));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!quiz) return;
    setLoading(true);
    try { setRows(await getAllQuestionsRaw(quiz.quiz_id)); }
    catch (e: any) { alert('Không tải được: ' + (e?.message || e)); }
    finally { setLoading(false); }
  }, [quiz]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => {
    setForm({ ...emptyQuestion(quiz.quiz_id), question_id: `QQ_${Date.now().toString(36).toUpperCase()}`, course_id: quiz.course_id || '' });
    setEditing({});
    setError(null);
  };

  const openEdit = (row: any) => {
    setForm({
      question_id: row.question_id || '',
      quiz_id: row.quiz_id || quiz.quiz_id,
      course_id: row.course_id || '',
      question_text: row.question_text || '',
      option_a: row.option_a || '',
      option_b: row.option_b || '',
      option_c: row.option_c || '',
      option_d: row.option_d || '',
      correct_answer: (row.correct_answer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D',
      status: row.status || 'active',
    });
    setEditing(row);
    setError(null);
  };

  const closeModal = () => { if (!saving) { setEditing(null); setError(null); } };
  const isEditMode = editing && editing.question_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.question_id.trim()) { setError('Mã câu hỏi bắt buộc'); return; }
    if (!form.question_text.trim()) { setError('Nội dung câu hỏi bắt buộc'); return; }
    if (!form.option_a.trim() || !form.option_b.trim()) { setError('Cần ít nhất 2 đáp án (A và B)'); return; }

    setSaving(true);
    try {
      if (isEditMode) {
        const { question_id, ...rest } = form;
        await updateQuestion(question_id, rest);
      } else {
        await createQuestion(form);
      }
      await refresh();
      await onDataChanged?.();
      setEditing(null);
    } catch (e: any) { setError(e?.message || 'Không lưu được'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuestion(deleteTarget.question_id);
      await refresh();
      await onDataChanged?.();
      setDeleteTarget(null);
    } catch (e: any) { alert('Không xóa được: ' + (e?.message || e)); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-emerald-500 uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại danh sách quiz
          </button>
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{quiz?.quiz_title}</h3>
            <span className="text-[10px] font-mono font-bold text-emerald-500 tracking-widest">{quiz?.quiz_id}</span>
          </div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{rows.length} câu hỏi</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Thêm câu hỏi
        </button>
      </div>

      <div className="rounded-[2rem] border border-zinc-900 overflow-hidden bg-[#0C0C0E]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/50">
                {['Mã', 'Câu hỏi', 'Đáp án đúng', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-zinc-700 text-xs font-bold uppercase tracking-widest">
                  <HelpCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  Chưa có câu hỏi nào — bấm "Thêm câu hỏi" để bắt đầu
                </td></tr>
              ) : rows.map(row => (
                <tr key={row.question_id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-500 whitespace-nowrap">{row.question_id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-200 max-w-[400px]">{row.question_text}</td>
                  <td className="px-6 py-4"><span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg uppercase tracking-widest">{row.correct_answer}</span></td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${row.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>{row.status === 'active' ? 'Hoạt động' : 'Ẩn'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(row)} className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(row)} className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
        title={isEditMode ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
        subtitle={isEditMode ? `Mã: ${form.question_id}` : `Cho quiz: ${quiz?.quiz_title}`}
        size="xl"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-50">Huỷ</button>
            <button type="submit" form="question-form" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'ĐANG LƯU...' : isEditMode ? 'CẬP NHẬT' : 'TẠO MỚI'}
            </button>
          </>
        }
      >
        <form id="question-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Mã câu hỏi" required>
              <TextInput value={form.question_id} onChange={e => setForm({ ...form, question_id: e.target.value })} disabled={!!isEditMode} required />
            </Field>
            <Field label="Đáp án đúng" required>
              <Dropdown
                value={form.correct_answer}
                onChange={(v) => setForm({ ...form, correct_answer: v as any })}
                options={[
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                  { value: 'C', label: 'C' },
                  { value: 'D', label: 'D' },
                ]}
                className="w-full"
              />
            </Field>
          </div>
          <Field label="Nội dung câu hỏi" required>
            <TextArea value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} rows={3} required />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Đáp án A" required>
              <TextInput value={form.option_a} onChange={e => setForm({ ...form, option_a: e.target.value })} required />
            </Field>
            <Field label="Đáp án B" required>
              <TextInput value={form.option_b} onChange={e => setForm({ ...form, option_b: e.target.value })} required />
            </Field>
            <Field label="Đáp án C">
              <TextInput value={form.option_c} onChange={e => setForm({ ...form, option_c: e.target.value })} />
            </Field>
            <Field label="Đáp án D">
              <TextInput value={form.option_d} onChange={e => setForm({ ...form, option_d: e.target.value })} />
            </Field>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa câu hỏi"
        message={`Xóa câu hỏi "${deleteTarget?.question_text?.slice(0, 80)}..."?`}
        confirmLabel="XÓA"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
