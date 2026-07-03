import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, CheckCircle2, XCircle, Trophy, Clock,
  AlertTriangle, EyeOff, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import type { OnboardingTestSession } from '../../types';
import { getOrCreateOnboardingTest, submitOnboardingTest } from '../../services/onboardingTestService';
import { pushOnboardingTestToLark } from '../../services/larkSyncService';

const QUIZ_DURATION = 600; // 10 phút

interface OnboardingTestViewProps {
  employeeId: string;
  onBack: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#09090B] z-[60] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Đang tải bài kiểm tra...</p>
      </div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-[#09090B] z-[60] flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="w-24 h-24 mx-auto rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
          <AlertTriangle size={48} className="text-amber-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Không thể tải bài kiểm tra</h2>
          <p className="text-sm text-zinc-400 font-bold leading-relaxed">{message}</p>
        </div>
        <Button onClick={onBack} className="w-full h-14 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-widest text-xs border-none">
          Quay lại
        </Button>
      </div>
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({ session, timeSpent, onBack }: { session: OnboardingTestSession; timeSpent: number; onBack: () => void }) {
  const passed = session.passed ?? false;
  const score = session.scorePercent ?? 0;
  const correct = session.correctCount ?? 0;
  const total = session.totalQuestions;
  const threshold = session.passThreshold;

  return (
    <div className="min-h-screen bg-[#09090B] p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: passed ? 5 : 0 }}
            className={`w-28 h-28 mx-auto rounded-[2rem] flex items-center justify-center border-2 ${passed ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}
          >
            {passed ? <Trophy size={52} /> : <XCircle size={52} />}
          </motion.div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              {passed ? 'ONBOARDING HOÀN TẤT!' : 'CHƯA ĐẠT YÊU CẦU'}
            </h1>
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-2">Kiểm tra Onboarding dành cho nhân viên mới</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${passed ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {passed ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {passed ? 'Kết quả đã được ghi nhận' : 'Không đạt ngưỡng tối thiểu'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Điểm số', value: `${score}%`, color: passed ? 'text-blue-400' : 'text-red-400' },
            { label: 'Đúng / Tổng', value: `${correct}/${total}`, color: 'text-white', sub: `/${total}` },
            { label: 'Thời gian', value: formatTime(timeSpent), color: 'text-zinc-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-2">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
              <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Ngưỡng đạt</span>
          <span className="text-sm font-black text-zinc-400">{threshold}/{total} câu ({Math.round(threshold / total * 100)}%)</span>
        </div>

        {/* Chi tiết từng câu */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Chi tiết từng câu</h2>
          {session.questions.map((q, i) => (
            <div key={q.id} className={`p-4 rounded-2xl border ${q.isCorrect ? 'bg-violet-500/5 border-blue-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-start gap-3">
                {q.isCorrect
                  ? <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-zinc-300 leading-snug">
                    <span className="text-zinc-600 mr-1">Câu {i + 1}.</span>
                    {q.questionText}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${q.employeeAnswer === q.correctOptionIndex ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>
                      Bạn chọn: {q.employeeAnswer != null && q.employeeAnswer >= 0 ? String.fromCharCode(65 + q.employeeAnswer) + '. ' + q.options[q.employeeAnswer] : '(Không trả lời)'}
                    </span>
                    {!q.isCorrect && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 uppercase tracking-widest">
                        Đáp án: {String.fromCharCode(65 + q.correctOptionIndex)}. {q.options[q.correctOptionIndex]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onBack} className="w-full h-14 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-widest text-xs border-none hover:bg-zinc-700">
          Quay lại
        </Button>
      </div>
    </div>
  );
}

// ─── Already Submitted ────────────────────────────────────────────────────────

function AlreadySubmittedScreen({ session, onBack }: { session: OnboardingTestSession; onBack: () => void }) {
  const [showDetail, setShowDetail] = React.useState(false);
  if (showDetail) return <ResultScreen session={session} timeSpent={session.timeSeconds ?? 0} onBack={onBack} />;

  const passed = session.passed ?? false;
  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-600 hover:text-white font-black text-[10px] uppercase tracking-widest group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay lại
        </button>
        <div className="text-center space-y-4">
          <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center border-2 ${passed ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
            {passed ? <Trophy size={48} /> : <XCircle size={48} />}
          </div>
          <h1 className="text-2xl font-black text-white uppercase">Đã hoàn thành Onboarding</h1>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Điểm</p>
            <p className={`text-3xl font-black font-mono ${passed ? 'text-blue-400' : 'text-red-400'}`}>{session.scorePercent}%</p>
          </div>
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Đúng</p>
            <p className="text-3xl font-black font-mono text-white">{session.correctCount}<span className="text-zinc-600 text-lg">/{session.totalQuestions}</span></p>
          </div>
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Thời gian</p>
            <p className="text-3xl font-black font-mono text-zinc-300">{formatTime(session.timeSeconds ?? 0)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowDetail(true)} className="flex-1 h-12 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-widest text-xs border-none hover:bg-zinc-700">
            Xem chi tiết đáp án
          </Button>
          <Button onClick={onBack} className="flex-1 h-12 rounded-2xl bg-blue-500/10 text-blue-400 font-black uppercase tracking-widest text-xs border border-blue-500/20 hover:bg-blue-500/20">
            Quay lại menu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Screen ──────────────────────────────────────────────────────────────

function QuizScreen({ session, onSubmit, onBack, submitting }: {
  session: OnboardingTestSession;
  onSubmit: (answers: Record<number, number>, timeSpent: number) => Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [tabSwitchCount, setTabSwitchCount] = React.useState(0);
  const [showTabWarning, setShowTabWarning] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(QUIZ_DURATION);
  const startTimeRef = React.useRef(Date.now());
  const deadlineRef = React.useRef(Date.now() + QUIZ_DURATION * 1000);
  const lastSwitchRef = React.useRef(0);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;

  const questions = session.questions;
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const currentAnswered = selectedOption !== null && !(currentIdx in answers);
  const allAnswered = answeredCount + (currentAnswered ? 1 : 0) === total;

  React.useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        const finalAnswers: Record<number, number> = {};
        questions.forEach((_, i) => { finalAnswers[i] = answersRef.current[i] ?? -1; });
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
        onSubmit(finalAnswers, timeSpent);
        return;
      }
      setTimeLeft(remaining);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const handler = () => {
      if (!document.hidden) return;
      const now = Date.now();
      if (now - lastSwitchRef.current < 500) return;
      lastSwitchRef.current = now;
      setTabSwitchCount(p => p + 1);
      setShowTabWarning(true);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const handleForceSubmit = async () => {
    const finalAnswers: Record<number, number> = {};
    questions.forEach((_, i) => { finalAnswers[i] = answersRef.current[i] ?? -1; });
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    setShowTabWarning(false);
    await onSubmit(finalAnswers, timeSpent);
  };

  const handleNext = () => {
    if (selectedOption === null) return;
    setAnswers(prev => ({ ...prev, [currentIdx]: selectedOption }));
    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(answers[currentIdx + 1] ?? null);
    }
  };

  const handlePrev = () => {
    if (currentIdx === 0) return;
    setAnswers(prev => ({ ...prev, [currentIdx]: selectedOption ?? -1 }));
    setCurrentIdx(currentIdx - 1);
    setSelectedOption(answers[currentIdx - 1] ?? null);
  };

  const handleSubmit = async () => {
    const finalAnswers: Record<number, number> = {};
    questions.forEach((_, i) => { finalAnswers[i] = answers[i] ?? -1; });
    if (selectedOption !== null) finalAnswers[currentIdx] = selectedOption;
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    await onSubmit(finalAnswers, timeSpent);
  };

  const MAX_VIOLATIONS = 3;
  const mustForceSubmit = tabSwitchCount >= MAX_VIOLATIONS;
  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / total) * 100;

  if (showTabWarning) {
    return (
      <div className="fixed inset-0 bg-[#09090B] z-[70] flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg w-full text-center space-y-8">
          <div className="w-24 h-24 mx-auto rounded-[2rem] bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
            <EyeOff size={48} className="text-red-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-red-500 uppercase">CẢNH BÁO VI PHẠM</h2>
            <p className="text-sm text-zinc-400 font-bold leading-relaxed">
              {mustForceSubmit
                ? <><span className="text-red-500">{MAX_VIOLATIONS} lần</span> vi phạm. Bài sẽ <span className="text-white">tự động nộp</span> ngay.</>
                : <>Còn <span className="text-amber-400">{MAX_VIOLATIONS - tabSwitchCount} lần</span> nữa bài sẽ bị tự động nộp.</>
              }
            </p>
          </div>
          <Button onClick={mustForceSubmit ? handleForceSubmit : () => setShowTabWarning(false)}
            className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-none ${mustForceSubmit ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
            {mustForceSubmit ? 'Xem kết quả' : 'Quay lại bài kiểm tra'}
          </Button>
        </motion.div>
      </div>
    );
  }

  if (showExitConfirm) {
    return (
      <div className="fixed inset-0 bg-[#09090B] z-[70] flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg w-full text-center space-y-8">
          <div className="w-24 h-24 mx-auto rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
            <AlertTriangle size={48} className="text-amber-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-amber-500 uppercase">Xác nhận thoát?</h2>
            <p className="text-sm text-zinc-400 font-bold">Bài kiểm tra sẽ được lưu lại, bạn có thể làm tiếp sau.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setShowExitConfirm(false)} className="w-full h-14 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-widest text-xs border-none">
              Tiếp tục làm bài
            </Button>
            <button onClick={onBack} className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
              Thoát & làm sau
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#09090B] z-[60] flex flex-col p-5 md:p-8 overflow-hidden">
      {/* Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-6">
        <button onClick={() => setShowExitConfirm(true)} className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Thoát
        </button>
        <div className="flex items-center gap-4">
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
              <EyeOff className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-black text-red-500 uppercase">{tabSwitchCount} VP</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Câu hỏi</p>
            <p className="text-lg font-black text-white font-mono">{currentIdx + 1}<span className="text-zinc-700 text-sm">/{total}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${timeLeft <= 60 ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-zinc-900 border-zinc-800'}`}>
            <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-red-500' : 'text-blue-400'}`} />
            <span className={`text-sm font-black font-mono ${timeLeft <= 60 ? 'text-red-500' : 'text-zinc-100'}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full mb-6">
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-black text-zinc-700 uppercase">Đã trả lời: {answeredCount}/{total}</span>
          <span className="text-[9px] font-black text-zinc-700 uppercase">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto w-full flex-1 overflow-y-auto pb-4 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <Badge className="bg-blue-500/10 text-blue-400 border-none px-3 py-1 tracking-[0.15em] uppercase font-black text-[8px]">
                  Onboarding
                </Badge>
              </div>
              <h2 className="text-xl font-black text-white leading-snug uppercase tracking-tight">
                {currentQ.questionText}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${selectedOption === idx
                    ? 'bg-blue-500 border-violet-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.15)] scale-[1.01]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-violet-500/40 hover:bg-zinc-900/50'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm flex-shrink-0 transition-all ${selectedOption === idx ? 'bg-white text-blue-500 rotate-[8deg]' : 'bg-zinc-800 text-blue-400'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-tight leading-tight">{opt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full pt-4 flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex-none px-5 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest disabled:opacity-30 hover:bg-zinc-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {currentIdx < total - 1 ? (
          <Button onClick={handleNext} disabled={selectedOption === null}
            className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-sm border-none flex items-center justify-center gap-3 ${selectedOption === null ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.2)]'}`}>
            Câu tiếp theo <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}
            className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-sm border-none flex items-center justify-center gap-3 ${!allAnswered || submitting ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.2)]'}`}>
            {submitting ? 'Đang lưu...' : `Nộp bài (${answeredCount}/${total})`}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingTestView({ employeeId, onBack }: OnboardingTestViewProps) {
  const [session, setSession] = React.useState<OnboardingTestSession | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    getOrCreateOnboardingTest(employeeId).then(({ session: s, error: e }) => {
      if (e || !s) setError(e || 'Lỗi không xác định.');
      else setSession(s);
      setLoading(false);
    });
  }, [employeeId]);

  const handleSubmit = async (answers: Record<number, number>, timeSpent: number) => {
    if (!session) return;
    setSubmitting(true);
    const { result, error: e } = await submitOnboardingTest(session.testId, answers, timeSpent);
    if (e || !result) {
      alert(e || 'Nộp bài thất bại. Vui lòng thử lại.');
      setSubmitting(false);
      return;
    }
    // Đổ điểm onboarding lên Lark cùng cột Điểm quizz (fire-and-forget)
    void pushOnboardingTestToLark(employeeId, result.scorePercent, result.passed, timeSpent);
    const { session: updated } = await getOrCreateOnboardingTest(employeeId);
    setSession(updated);
    setSubmitting(false);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onBack={onBack} />;
  if (!session) return <ErrorScreen message="Không tải được bài kiểm tra." onBack={onBack} />;
  if (session.status === 'submitted') return <AlreadySubmittedScreen session={session} onBack={onBack} />;

  return <QuizScreen session={session} onSubmit={handleSubmit} onBack={onBack} submitting={submitting} />;
}
