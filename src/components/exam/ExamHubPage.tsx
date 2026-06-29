import * as React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Brain, Clock, XCircle } from 'lucide-react';
import { Card } from '../ui';
import type { Course } from '../../types';
import { getTodayVNDateStr, getDeptConfig } from '../../services/dailyTestService';
import { supabase } from '../../services/supabaseClient';

interface ExamHubPageProps {
  products?: unknown[];
  courses?: Course[];
  onSelectBrand?: (brand: 'Doscom' | 'Noma') => void;
  onStartDailyTest: () => void;
  employeeId: string;
  department: string;
}

interface DailyStatus {
  status: 'not_started' | 'pending' | 'submitted';
  passed?: boolean;
  scorePercent?: number;
  correctCount?: number;
  totalQuestions?: number;
}


function DailyTestCard({ status, onStart }: { status: DailyStatus; onStart: () => void }) {
  const isDone = status.status === 'submitted';
  const isPending = status.status === 'pending';

  return (
    <Card className="relative overflow-hidden bg-[#0C0C0E] border border-blue-500/20 hover:border-blue-500/40 rounded-[2.5rem] p-8 lg:p-10 transition-all duration-500 shadow-[0_0_40px_rgba(59,130,246,0.12)]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/[0.03] to-transparent pointer-events-none opacity-20" />
      <div className="relative z-10 space-y-6">

        {/* Label + badge trên cùng một hàng */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
            <Brain className="w-3 h-3" />
            Kiến thức hằng ngày
          </div>
          {isDone && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ${
              status.passed
                ? 'bg-emerald-500/10 ring-emerald-500/30'
                : 'bg-red-500/10 ring-red-500/30'
            }`}>
              {status.passed
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                : <XCircle className="w-3.5 h-3.5 text-red-400" />}
              <span className={`text-[9px] font-black uppercase tracking-widest ${status.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.passed ? 'Đã đạt' : 'Chưa đạt'}
              </span>
            </div>
          )}
        </div>

        {/* Title + mô tả */}
        <div className="space-y-2">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase leading-none">Bài kiểm tra</h2>
          <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
            Kiểm tra kiến thức nội quy, văn hóa công ty và sản phẩm — mỗi ngày một lần
          </p>
        </div>

        {/* Stats khi đã nộp */}
        {isDone && (
          <div className="grid grid-cols-3 gap-3 select-none">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Điểm số</p>
              <p className={`text-3xl font-black font-mono tabular-nums leading-none ${status.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.scorePercent?.toFixed(0)}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đúng
              </p>
              <p className="text-3xl font-black text-emerald-400 font-mono tabular-nums leading-none">{status.correctCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Tổng câu</p>
              <p className="text-3xl font-black text-white font-mono tabular-nums leading-none">{status.totalQuestions}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
            isDone
              ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:scale-[1.02]'
              : 'bg-blue-500 hover:bg-blue-400 text-white shadow-xl hover:scale-[1.02]'
          }`}
        >
          {isDone ? (
            <><Clock className="w-4 h-4" />Xem kết quả hôm nay</>
          ) : isPending ? (
            <><Brain className="w-4 h-4" />Tiếp tục làm bài<ArrowRight className="w-4 h-4" /></>
          ) : (
            <><Brain className="w-4 h-4" />Bắt đầu kiểm tra<ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </Card>
  );
}

export default function ExamHubPage({ onStartDailyTest, employeeId, department }: ExamHubPageProps) {
  const config = getDeptConfig(department);
  const [dailyStatus, setDailyStatus] = React.useState<DailyStatus>({ status: 'not_started' });

  React.useEffect(() => {
    const todayStr = getTodayVNDateStr();
    supabase
      .from('daily_tests')
      .select('status, passed, score_percent, correct_count, total_questions')
      .eq('employee_id', employeeId)
      .eq('test_date', todayStr)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setDailyStatus({
          status: data.status as 'pending' | 'submitted',
          passed: data.passed ?? undefined,
          scorePercent: data.score_percent ?? undefined,
          correctCount: data.correct_count ?? undefined,
          totalQuestions: data.total_questions ?? undefined,
        });
      });
  }, [employeeId]);

  const isSalesMkt = config.nomaCount > 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 flex items-center justify-center">
            <Brain className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Bài kiểm tra hằng ngày</h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              {isSalesMkt
                ? `${config.nomaCount} câu NOMA + ${config.generalCount} câu chung — đạt ${config.passThreshold}/${config.totalQuestions}`
                : `${config.generalCount} câu kiến thức chung — đạt ${config.passThreshold}/${config.totalQuestions}`}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg">
        <DailyTestCard status={dailyStatus} onStart={onStartDailyTest} />
      </div>
    </div>
  );
}
