import * as React from 'react';
import { GraduationCap, Clock, CheckCircle2, XCircle, ArrowRight, Lock } from 'lucide-react';
import { Card } from '../ui';
import { supabase } from '../../services/supabaseClient';
import { getOnboardingAvailability, type OnboardingAvailability } from '../../services/onboardingTestService';

interface OnboardingTestPageProps {
  employeeId: string;
  onboardingAvailableDate: string | null | undefined;
  onStartTest: () => void;
}

function formatDate(str: string): string {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export default function OnboardingTestPage({ employeeId, onboardingAvailableDate, onStartTest }: OnboardingTestPageProps) {
  const [availability, setAvailability] = React.useState<OnboardingAvailability>({ state: 'not_applicable' });
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    // Luôn query DB trước — nếu đã submitted thì hiện kết quả dù onboardingAvailableDate có null
    supabase
      .from('onboarding_tests')
      .select('status, passed, correct_count, score_percent')
      .eq('employee_id', employeeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.status === 'submitted') {
          // Đã làm xong → luôn hiện kết quả
          setAvailability(getOnboardingAvailability(
            onboardingAvailableDate || new Date().toISOString().slice(0, 10),
            data.status,
            data.passed,
            data.correct_count,
            data.score_percent,
          ));
        } else if (!onboardingAvailableDate) {
          setAvailability({ state: 'not_applicable' });
        } else {
          setAvailability(getOnboardingAvailability(
            onboardingAvailableDate,
            data?.status,
            data?.passed,
            data?.correct_count,
            data?.score_percent,
          ));
        }
        setChecking(false);
      });
  }, [employeeId, onboardingAvailableDate]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Kiểm tra Onboarding</h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              Dành cho nhân viên mới · 30 câu · Đạt 25/30
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg">
        {availability.state === 'not_applicable' && (
          <Card className="relative overflow-hidden bg-[#0C0C0E] border border-zinc-800 rounded-[2.5rem] p-10">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Không áp dụng</p>
              <p className="text-zinc-600 text-xs font-bold">Bài kiểm tra onboarding chỉ dành cho nhân viên mới được cấp tài khoản.</p>
            </div>
          </Card>
        )}

        {availability.state === 'countdown' && (
          <Card className="relative overflow-hidden bg-[#0C0C0E] border border-blue-500/20 rounded-[2.5rem] p-10 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none opacity-30" />
            <div className="relative z-10 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                  <Lock className="w-3 h-3" />
                  Chưa mở
                </div>
                <h2 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">Kiểm tra Onboarding</h2>
                <p className="text-[11px] text-zinc-500 font-bold leading-relaxed pt-1">
                  Bài kiểm tra sẽ mở vào <span className="text-blue-400 font-black">{formatDate(availability.availableDate)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Mở sau</p>
                  <p className="text-3xl font-black font-mono text-blue-400">{availability.daysLeft}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">ngày</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Ngày mở</p>
                  <p className="text-lg font-black text-white">{formatDate(availability.availableDate)}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-2">
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Thông tin bài kiểm tra</p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-bold">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  30 câu hỏi ngẫu nhiên · Thời gian 10 phút · Đạt 25/30
                </div>
              </div>

              <button
                disabled
                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] bg-zinc-900 text-zinc-600 cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Lock className="w-4 h-4" />
                Chưa đến ngày mở
              </button>
            </div>
          </Card>
        )}

        {availability.state === 'available' && (
          <Card className="relative overflow-hidden bg-[#0C0C0E] border border-blue-500/20 hover:border-blue-500/40 rounded-[2.5rem] p-10 lg:p-12 transition-all duration-500 shadow-[0_0_40px_rgba(59,130,246,0.12)]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/[0.03] to-transparent pointer-events-none opacity-20" />
            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                  <GraduationCap className="w-3 h-3" />
                  Sẵn sàng kiểm tra
                </div>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase leading-none">Kiểm tra Onboarding</h2>
                <p className="text-[11px] text-zinc-500 font-bold leading-relaxed pt-2 max-w-md">
                  Bài kiểm tra dành cho nhân viên mới — 30 câu ngẫu nhiên về nội quy, văn hóa và quy trình công ty
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Số câu', value: '30', unit: 'câu' },
                  { label: 'Đạt', value: '25/30', unit: 'câu đúng' },
                  { label: 'Thời gian', value: '10', unit: 'phút' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">{label}</p>
                    <p className="text-2xl font-black font-mono text-blue-400">{value}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">{unit}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onStartTest}
                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] bg-blue-500 hover:bg-blue-400 text-white shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <GraduationCap className="w-4 h-4" />
                Bắt đầu kiểm tra
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest text-center">
                Mỗi nhân viên chỉ làm bài một lần duy nhất
              </p>
            </div>
          </Card>
        )}

        {availability.state === 'done' && (
          <Card className="relative overflow-hidden bg-[#0C0C0E] border border-blue-500/20 rounded-[2.5rem] p-10 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
            <div className="relative z-10 space-y-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                    <GraduationCap className="w-3 h-3" />
                    Đã hoàn thành
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">Kiểm tra Onboarding</h2>
                </div>
                <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ring-1 ${
                  availability.passed
                    ? 'bg-blue-500/10 ring-blue-500/30'
                    : 'bg-red-500/10 ring-red-500/30'
                }`}>
                  {availability.passed
                    ? <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />}
                  <span className={`text-[8px] font-black uppercase tracking-widest ${availability.passed ? 'text-blue-400' : 'text-red-400'}`}>
                    {availability.passed ? 'Đã đạt' : 'Chưa đạt'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Điểm số</p>
                  <p className={`text-3xl font-black font-mono tabular-nums leading-none ${availability.passed ? 'text-blue-400' : 'text-red-400'}`}>
                    {availability.scorePercent.toFixed(0)}%
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" /> Đúng
                  </p>
                  <p className="text-3xl font-black text-blue-400 font-mono tabular-nums leading-none">{availability.correctCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Tổng câu</p>
                  <p className="text-3xl font-black text-white font-mono tabular-nums leading-none">30</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onStartTest}
                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Clock className="w-4 h-4" />
                Xem lại kết quả
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
