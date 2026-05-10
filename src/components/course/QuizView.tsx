import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  Trophy, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  Target,
  EyeOff
} from 'lucide-react';
import { Quiz, QuizQuestion } from '../../types';
import { Button, Badge, Progress } from '../ui';

interface QuizResult {
  score: number;
  passed: boolean;
  answers?: number[];
}

interface QuizViewProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
  onExit: () => void;
  /** Lưu kết quả + thoát về danh mục khóa học (dùng cho nút "Thoát" ở result screen) */
  onFinishAndExit?: (result: QuizResult) => void;
  attempts: number;
}

export const QuizView = ({ quiz, onComplete, onExit, onFinishAndExit, attempts }: QuizViewProps) => {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [answers, setAnswers] = React.useState<number[]>([]);
  const [isFinished, setIsFinished] = React.useState(false);
  const [shuffledQuestions] = React.useState(() => {
    return [...quiz.questions].sort(() => Math.random() - 0.5);
  });

  // ── Countdown Timer (10 minutes) ──────────────────────────────────────
  const QUIZ_DURATION = 600; // 10 minutes in seconds
  const [timeLeft, setTimeLeft] = React.useState(QUIZ_DURATION);
  const answersRef = React.useRef<number[]>([]);

  // Keep ref in sync with answers state
  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  React.useEffect(() => {
    if (isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit: fill remaining answers with -1 (unanswered)
          const currentAnswers = answersRef.current;
          const remaining = shuffledQuestions.length - currentAnswers.length;
          const finalAnswers = [...currentAnswers, ...Array(remaining).fill(-1)];
          
          // Calculate score with final answers
          let correctCount = 0;
          finalAnswers.forEach((ans: number, idx: number) => {
            if (ans === shuffledQuestions[idx].correctAnswer) correctCount++;
          });
          const score = Math.round((correctCount / shuffledQuestions.length) * 100);
          const passed = score >= quiz.passScore;
          onComplete({ score, passed, answers: finalAnswers });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, shuffledQuestions, quiz.passScore, onComplete]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Tab switch detection ──────────────────────────────────────────────
  const [tabSwitchCount, setTabSwitchCount] = React.useState(0);
  const [showTabWarning, setShowTabWarning] = React.useState(false);

  React.useEffect(() => {
    if (isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setShowTabWarning(true);
      }
    };

    const handleBlur = () => {
      setTabSwitchCount(prev => prev + 1);
      setShowTabWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isFinished]);

  const currentQuestion = shuffledQuestions[currentIdx];
  const progress = ((currentIdx + 1) / shuffledQuestions.length) * 100;

  const handleNext = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    
    if (currentIdx < shuffledQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    answers.forEach((ans, idx) => {
      if (ans === shuffledQuestions[idx].correctAnswer) correctCount++;
    });
    return Math.round((correctCount / shuffledQuestions.length) * 100);
  };

  // ── Tab Warning Overlay ───────────────────────────────────────────────
  if (showTabWarning && !isFinished) {
    return (
      <div className="fixed inset-0 bg-[#09090B] z-[70] flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          <div className="w-28 h-28 mx-auto rounded-[2rem] bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
            <EyeOff size={56} className="text-red-500" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-black text-red-500  uppercase tracking-tight">
              CẢNH BÁO VI PHẠM
            </h2>
            <p className="text-sm text-zinc-400 font-bold leading-relaxed">
              Hệ thống phát hiện bạn đã chuyển ra khỏi trang kiểm tra.
              Hành vi này sẽ được ghi nhận trong báo cáo.
            </p>
          </div>

          <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black text-red-500/70 uppercase tracking-widest ">Số lần vi phạm</span>
            <span className="text-2xl font-black text-red-500  font-mono">{tabSwitchCount}</span>
          </div>

          <Button
            onClick={() => setShowTabWarning(false)}
            className="w-full h-14 rounded-2xl bg-red-500 text-white font-black uppercase  tracking-widest text-xs hover:bg-red-600 border-none shadow-2xl shadow-red-500/20"
          >
            QUAY LẠI BÀI KIỂM TRA
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────
  if (isFinished) {
    const score = calculateScore();
    const passed = score >= quiz.passScore;

    return (
      <div className="fixed inset-0 bg-[#09090B] z-[60] flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-xl w-full text-center space-y-8">
            <motion.div 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 5 }}
                className={`w-28 h-28 mx-auto rounded-[2rem] flex items-center justify-center border-3 ${
                  passed 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                }`}
            >
                {passed ? <Trophy size={52} /> : <XCircle size={52} />}
            </motion.div>
            
            <div className="space-y-4">
                <h2 className="text-3xl font-black text-white  uppercase tracking-tight leading-none">
                  {passed ? 'BÁO CÁO ĐẠT CHUẨN' : 'KHÔNG ĐẠT YÊU CẦU'}
                </h2>
                <div className="flex items-center justify-center gap-4">
                    {passed ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-5 py-1.5 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest  leading-none">KẾT QUẢ ĐÃ GỬI LARK</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-5 py-1.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest  leading-none">ĐIỂM CHƯA ĐẠT CHUẨN</span>
                        </div>
                    )}
                </div>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Điểm số: <span className={passed ? 'text-emerald-500' : 'text-red-500'}>{score}%</span> (Chuẩn: {quiz.passScore}%)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-2 relative overflow-hidden group shadow-inner">
                    <Zap className="absolute top-5 right-5 w-5 h-5 text-zinc-800 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]  leading-none">Năng lực tích lũy</p>
                    <p className="text-3xl font-black text-white  tracking-tighter tabular-nums leading-none">+{score * 10}</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-2 relative overflow-hidden group shadow-inner">
                    <Target className="absolute top-5 right-5 w-5 h-5 text-zinc-800 group-hover:text-amber-500 transition-colors" />
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]  leading-none">Lần thử</p>
                    <p className="text-3xl font-black text-white  tracking-tighter tabular-nums leading-none">{attempts + 1}<span className="text-sm text-zinc-700 ml-1">/ 1</span></p>
                </div>
            </div>

            {tabSwitchCount > 0 && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4">
                <EyeOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-[10px] font-bold text-red-500/80 leading-relaxed uppercase tracking-tight  text-left">
                  Bạn đã chuyển tab {tabSwitchCount} lần trong quá trình kiểm tra. Hành vi này đã được ghi nhận.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4 pt-2">
                <Button onClick={() => onComplete({ score, passed, answers })} size="lg" className="h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase  tracking-[0.15em] text-xs shadow-2xl shadow-emerald-500/20 border-none">
                    HOÀN TẤT & LƯU KẾT QUẢ
                </Button>

                {!passed && (
                    <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 text-left ring-1 ring-red-500/10">
                        <AlertTriangle className="w-7 h-7 text-red-500 flex-shrink-0" />
                        <p className="text-[10px] font-bold text-red-500/80 leading-relaxed uppercase tracking-tight ">
                            Bạn đã sử dụng hết lượt kiểm tra (1/1). Kết quả đã được ghi nhận và gửi báo cáo cho bộ phận đào tạo.
                        </p>
                    </div>
                )}

                <button
                  onClick={() => {
                    // Nếu có handler save+exit-to-catalog, dùng nó (auto lưu kết quả).
                    // Fallback: chỉ exit (legacy).
                    if (onFinishAndExit) {
                      onFinishAndExit({ score, passed, answers });
                    } else {
                      onExit();
                    }
                  }}
                  className="text-zinc-600 hover:text-white font-black uppercase text-[10px] tracking-[0.3em] py-2 transition-all  underline underline-offset-8 decoration-zinc-800"
                >
                  THOÁT TRANG KIỂM TRA
                </button>
            </div>
        </div>
      </div>
    );
  }

  // ── Quiz Questions Screen ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#09090B] z-[60] flex flex-col p-5 md:p-8 overflow-hidden">
        {/* Header */}
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-6">
            <button onClick={onExit} className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all group ">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                THOÁT
            </button>
            <div className="flex items-center gap-6">
                {tabSwitchCount > 0 && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-xl">
                    <EyeOff className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest  leading-none">VI PHẠM: {tabSwitchCount}</span>
                  </div>
                )}
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1 text-right">Câu hỏi</span>
                    <span className="text-lg font-black text-white  tracking-tighter uppercase tabular-nums leading-none">{currentIdx + 1} <span className="text-zinc-800 text-sm">/ {shuffledQuestions.length}</span></span>
                </div>
                <div className="h-8 w-[1px] bg-zinc-900" />
                <div className={`flex items-center gap-2 border px-4 py-2 rounded-xl shadow-inner ${
                    timeLeft <= 60 ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-zinc-900 border-zinc-800'
                }`}>
                    <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-red-500' : 'text-emerald-500'}`} />
                    <span className={`text-sm font-black  tracking-tighter tabular-nums leading-none ${
                        timeLeft <= 60 ? 'text-red-500' : 'text-zinc-100'
                    }`}>{formatTime(timeLeft)}</span>
                </div>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto w-full mb-8 px-1">
            <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-900 p-[1px] shadow-inner">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                />
            </div>
        </div>

        {/* Question Panel */}
        <div className="max-w-3xl mx-auto w-full flex-1 overflow-y-auto pr-4 scrollbar-hide py-2">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-8"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-0.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981]" />
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1  tracking-[0.15em] uppercase font-black text-[8px] leading-none">BẮT BUỘC</Badge>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-snug  tracking-tight uppercase">
                            {currentQuestion.question}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedOption(idx)}
                                className={`group flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden ${
                                    selectedOption === idx
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_15px_40px_rgba(16,185,129,0.15)] scale-[1.01]'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-emerald-500/40 hover:bg-zinc-900/50'
                                }`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black  font-mono text-sm transition-all duration-500 ${
                                        selectedOption === idx ? 'bg-white text-emerald-500 rotate-[10deg] scale-105 shadow-xl' : 'bg-zinc-800 text-emerald-500 group-hover:rotate-3 border border-zinc-700'
                                    }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="text-sm font-extrabold  uppercase tracking-tight leading-tight">{option}</span>
                                </div>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                                    selectedOption === idx ? 'border-white bg-white scale-105 shadow-xl' : 'border-zinc-700'
                                }`}>
                                    {selectedOption === idx && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="max-w-3xl mx-auto w-full pt-6 flex justify-center">
            <Button 
                onClick={handleNext}
                disabled={selectedOption === null}
                className={`w-full py-5 rounded-2xl text-sm font-black uppercase  tracking-[0.2em] flex items-center justify-center gap-4 transition-all duration-500 ${
                    selectedOption === null 
                        ? 'bg-zinc-900 text-zinc-800 cursor-not-allowed border border-zinc-900 shadow-inner' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_20px_50px_rgba(16,185,129,0.25)] active:scale-95 border-none'
                }`}
            >
                {currentIdx < shuffledQuestions.length - 1 ? 'Tiếp tục câu hỏi' : 'Nộp bài & Lưu điểm'}
                <ChevronRight className="w-5 h-5" />
            </Button>
        </div>
    </div>
  );
};

export default QuizView;
