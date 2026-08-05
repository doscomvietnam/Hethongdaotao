import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  RotateCcw, ChevronRight, Boxes, TrendingUp, ScrollText,
  Rocket, Layers, Target, Sparkles,
} from 'lucide-react';
import type { Employee } from '../../types';
import {
  getPracticeTopics,
  getPracticeQuestions,
  type PracticeTopic,
  type PracticeCourseRef,
  type PracticeQuestion,
} from '../../services/practiceService';

interface PracticePageProps {
  employee: Employee;
}

// Mỗi lượt luyện tối đa 20 câu ngẫu nhiên (luyện lại để đổi câu)
const ROUND_SIZE = 20;

type Style = { icon: React.ComponentType<{ className?: string }>; text: string; ring: string; grad: string; btn: string; bar: string; soft: string };

const TOPIC_STYLE: Record<string, Style> = {
  noma:       { icon: Boxes,      text: 'text-emerald-400', ring: 'ring-emerald-500/30', grad: 'from-emerald-500/15', btn: 'bg-emerald-500 hover:bg-emerald-400', bar: 'bg-emerald-500', soft: 'bg-emerald-500/10' },
  sale:       { icon: TrendingUp, text: 'text-amber-400',   ring: 'ring-amber-500/30',   grad: 'from-amber-500/15',   btn: 'bg-amber-500 hover:bg-amber-400',     bar: 'bg-amber-500',   soft: 'bg-amber-500/10' },
  norms:      { icon: ScrollText, text: 'text-blue-400',    ring: 'ring-blue-500/30',    grad: 'from-blue-500/15',    btn: 'bg-blue-500 hover:bg-blue-400',       bar: 'bg-blue-500',    soft: 'bg-blue-500/10' },
  onboarding: { icon: Rocket,     text: 'text-violet-400',  ring: 'ring-violet-500/30',  grad: 'from-violet-500/15',  btn: 'bg-violet-500 hover:bg-violet-400',   bar: 'bg-violet-500',  soft: 'bg-violet-500/10' },
};
const FALLBACK: Style = { icon: Dumbbell, text: 'text-zinc-300', ring: 'ring-zinc-700', grad: 'from-zinc-700/20', btn: 'bg-zinc-700 hover:bg-zinc-600', bar: 'bg-zinc-500', soft: 'bg-zinc-800' };
const styleOf = (key: string): Style => TOPIC_STYLE[key] || FALLBACK;

// ─── Topic menu ───────────────────────────────────────────────────────────────

function TopicCard({ topic, onPick }: { topic: PracticeTopic; onPick: () => void }) {
  const s = styleOf(topic.key);
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={onPick}
      className={`group relative overflow-hidden text-left bg-[#0C0C0E] border border-zinc-900 rounded-[2rem] p-7 transition-all duration-500 hover:border-zinc-700 hover:-translate-y-0.5`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${s.grad} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
      <div className="relative z-10 space-y-5">
        <div className={`w-14 h-14 rounded-2xl ${s.soft} ring-1 ${s.ring} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${s.text}`} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{topic.label}</h3>
          <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">{topic.description}</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${s.text}`}>
            <Layers className="w-3.5 h-3.5" /> {topic.questionCount} câu
            {topic.source === 'course' && topic.courses.length > 1 && (
              <span className="text-zinc-600"> · {topic.courses.length} khóa</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
            Luyện <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Course sub-picker (chủ đề khóa học có nhiều khóa) ──────────────────────────

function CoursePicker({
  topic, onPickAll, onPickCourse, onBack,
}: {
  topic: PracticeTopic;
  onPickAll: () => void;
  onPickCourse: (c: PracticeCourseRef) => void;
  onBack: () => void;
}) {
  const s = styleOf(topic.key);
  const Icon = s.icon;
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Chủ đề khác
      </button>

      <header className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${s.soft} ring-1 ${s.ring} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${s.text}`} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">{topic.label}</h1>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">Chọn nội dung muốn ôn</p>
        </div>
      </header>

      <div className="grid gap-3">
        <button
          onClick={onPickAll}
          className={`group flex items-center justify-between gap-4 p-5 rounded-2xl border-2 border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all text-left`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${s.soft} ring-1 ${s.ring} flex items-center justify-center flex-shrink-0`}>
              <Sparkles className={`w-5 h-5 ${s.text}`} />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-tight">Tất cả {topic.label}</p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Trộn ngẫu nhiên toàn bộ · {topic.questionCount} câu</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
        </button>

        {topic.courses.map((c) => (
          <button
            key={c.courseId}
            onClick={() => onPickCourse(c)}
            className="group flex items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-zinc-900 ring-1 ring-zinc-800 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-sm font-black text-zinc-200 tracking-tight truncate">{c.name}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{c.questionCount} câu</span>
              <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Practice session ───────────────────────────────────────────────────────────

interface SessionProps {
  topic: PracticeTopic;
  subtitle: string;
  questions: PracticeQuestion[];
  onExit: () => void;
  onRestart: () => void;
}

function PracticeSession({ topic, subtitle, questions, onExit, onRestart }: SessionProps) {
  const s = styleOf(topic.key);
  const [idx, setIdx] = React.useState(0);
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [finished, setFinished] = React.useState(false);

  const total = questions.length;
  const q = questions[idx];
  const answered = chosen !== null;
  const isLast = idx === total - 1;

  const pick = (i: number) => {
    if (answered) return;
    setChosen(i);
    if (i === q.correctIndex) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (isLast) { setFinished(true); return; }
    setIdx((v) => v + 1);
    setChosen(null);
  };

  // ── Kết quả lượt luyện ──
  if (finished) {
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    const great = pct >= 80;
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center ring-1 ${s.ring} ${s.soft}`}>
            {great ? <CheckCircle2 className={`w-12 h-12 ${s.text}`} /> : <RotateCcw className={`w-12 h-12 ${s.text}`} />}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Hoàn thành lượt luyện</h2>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">{topic.label}{subtitle ? ` · ${subtitle}` : ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Đúng / Tổng</p>
              <p className="text-4xl font-black font-mono text-white">{correctCount}<span className="text-zinc-600 text-xl">/{total}</span></p>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Tỉ lệ đúng</p>
              <p className={`text-4xl font-black font-mono ${s.text}`}>{pct}%</p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 font-bold">
            Đây là chế độ luyện tập — <span className="text-zinc-400">không tính điểm</span>, ôn bao nhiêu lần cũng được.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={onRestart} className={`w-full h-14 rounded-2xl ${s.btn} text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all`}>
              <RotateCcw className="w-4 h-4" /> Luyện lại lượt mới
            </button>
            <button onClick={onExit} className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
              Đổi chủ đề
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((idx + (answered ? 1 : 0)) / total) * 100;

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Thoát
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{topic.label}{subtitle ? ` · ${subtitle}` : ''}</p>
            <p className="text-lg font-black text-white font-mono leading-none mt-0.5">{idx + 1}<span className="text-zinc-700 text-sm">/{total}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${s.soft} ring-1 ${s.ring}`}>
            <CheckCircle2 className={`w-4 h-4 ${s.text}`} />
            <span className={`text-sm font-black font-mono ${s.text}`}>{correctCount}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
        <motion.div animate={{ width: `${progress}%` }} className={`h-full ${s.bar} rounded-full`} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="space-y-6">
          <div className="flex items-start gap-2">
            <div className={`w-0.5 h-5 ${s.bar} rounded-full mt-1 flex-shrink-0`} />
            <h2 className="text-xl font-black text-white leading-snug tracking-tight">{q.questionText}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isChosen = i === chosen;
              let cls = 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/50';
              if (answered) {
                if (isCorrect) cls = 'bg-emerald-500/15 border-emerald-500 text-emerald-300';
                else if (isChosen) cls = 'bg-red-500/15 border-red-500 text-red-300';
                else cls = 'bg-zinc-950 border-zinc-900 text-zinc-600 opacity-60';
              }
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={answered}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${cls} ${answered ? 'cursor-default' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm flex-shrink-0 ${
                    answered && isCorrect ? 'bg-emerald-500 text-white'
                    : answered && isChosen ? 'bg-red-500 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {answered && isCorrect ? <CheckCircle2 className="w-5 h-5" />
                      : answered && isChosen ? <XCircle className="w-5 h-5" />
                      : String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm font-bold tracking-tight leading-tight flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${chosen === q.correctIndex ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-red-500/10 border-red-500/25'}`}
              >
                {chosen === q.correctIndex ? (
                  <><CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Chính xác!</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><span className="text-xs font-black text-red-400 uppercase tracking-widest">Chưa đúng — đáp án: {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}</span></>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Next */}
      <div className="pt-2">
        <button
          onClick={next}
          disabled={!answered}
          className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
            !answered ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : `${s.btn} text-white`
          }`}
        >
          {isLast ? <>Xem kết quả <Target className="w-5 h-5" /></> : <>Câu tiếp theo <ChevronRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

type SessionCfg = { topic: PracticeTopic; subtitle: string; quizIds?: string[]; bankType?: 'general' | 'onboarding' };

export default function PracticePage({ employee }: PracticePageProps) {
  const [topics, setTopics] = React.useState<PracticeTopic[] | null>(null);
  const [pickerTopic, setPickerTopic] = React.useState<PracticeTopic | null>(null);
  const [session, setSession] = React.useState<SessionCfg | null>(null);
  const [questions, setQuestions] = React.useState<PracticeQuestion[] | null>(null);
  const [round, setRound] = React.useState(0); // đổi mỗi lượt → remount PracticeSession
  const [loadingQ, setLoadingQ] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getPracticeTopics(employee.department || '', employee.role)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [employee.department, employee.role]);

  const loadingRef = React.useRef(false);
  const loadQuestions = React.useCallback(async (cfg: SessionCfg) => {
    if (loadingRef.current) return; // chặn double-tap tạo 2 request
    loadingRef.current = true;
    setLoadingQ(true);
    setError(null);
    try {
      const all = await getPracticeQuestions({ quizIds: cfg.quizIds, bankType: cfg.bankType });
      if (!all.length) {
        setError('Chủ đề này chưa có câu hỏi để luyện.');
        setSession(null);
        setQuestions(null);
        return;
      }
      setQuestions(all.slice(0, ROUND_SIZE));
      setSession(cfg);
      setRound((r) => r + 1);
    } catch {
      setError('Không tải được câu hỏi. Vui lòng thử lại.');
      setSession(null);
      setQuestions(null);
    } finally {
      loadingRef.current = false;
      setLoadingQ(false);
    }
  }, []);

  // Chọn 1 chủ đề từ menu
  const handlePickTopic = (topic: PracticeTopic) => {
    if (topic.source === 'course' && topic.courses.length > 1) {
      setPickerTopic(topic);
      return;
    }
    if (topic.source === 'bank') {
      void loadQuestions({ topic, subtitle: '', bankType: topic.bankType });
    } else {
      void loadQuestions({ topic, subtitle: '', quizIds: topic.quizIds });
    }
  };

  const exitSession = () => { setSession(null); setQuestions(null); };
  const restartSession = () => { if (session) void loadQuestions(session); };

  // ── Loading câu hỏi (kiểm trước để "Luyện lại" hiện spinner thay vì kẹt màn cũ) ──
  if (loadingQ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Đang tải câu hỏi...</p>
        </div>
      </div>
    );
  }

  // ── Đang luyện ──
  if (session && questions) {
    return (
      <div className="animate-in fade-in duration-300">
        <PracticeSession
          key={round}
          topic={session.topic}
          subtitle={session.subtitle}
          questions={questions}
          onExit={exitSession}
          onRestart={restartSession}
        />
      </div>
    );
  }

  // ── Sub-picker khóa học ──
  if (pickerTopic) {
    return (
      <CoursePicker
        topic={pickerTopic}
        onBack={() => setPickerTopic(null)}
        onPickAll={() => { void loadQuestions({ topic: pickerTopic, subtitle: 'Tất cả', quizIds: pickerTopic.quizIds }); setPickerTopic(null); }}
        onPickCourse={(c) => { void loadQuestions({ topic: pickerTopic, subtitle: c.name, quizIds: [c.quizId] }); setPickerTopic(null); }}
      />
    );
  }

  // ── Menu chủ đề ──
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/30 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Luyện tập</h1>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/25">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-xs font-black text-red-400 uppercase tracking-widest">{error}</span>
        </div>
      )}

      {topics === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-[2rem] bg-zinc-900/40 border border-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="py-20 text-center">
          <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm font-black text-zinc-600 uppercase tracking-widest">Chưa có nội dung luyện tập cho phòng ban của bạn</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topics.map((t) => (
            <TopicCard key={t.key} topic={t} onPick={() => handlePickTopic(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
