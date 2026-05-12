import * as React from 'react';
import { Sparkles, ArrowRight, Trophy, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui';
import type { Product, Course } from '../../types';

interface ExamHubPageProps {
  products: Product[];
  courses: Course[];
  onSelectBrand: (brand: 'Doscom' | 'Noma') => void;
}

interface BrandStats {
  total: number;
  done: number;
  remaining: number;
}

// "Đã làm" = đã nộp quiz cho sản phẩm này (course.attempts >= 1).
// Không yêu cầu video 100% như course.isCompleted vì user vào wheel chỉ để làm test.
function isQuizDone(course: Course): boolean {
  return (course.attempts || 0) >= 1 || course.lastQuizScore != null;
}

function computeStats(brand: 'Doscom' | 'Noma', products: Product[], courses: Course[]): BrandStats {
  let total = 0;
  let done = 0;
  for (const p of products) {
    if (p.brand !== brand) continue;
    const course = courses.find(c => c.productId === p.id && c.quizId);
    if (!course) continue;
    total++;
    if (isQuizDone(course)) done++;
  }
  return { total, done, remaining: total - done };
}

const BRAND_THEME = {
  Doscom: {
    label: 'Doscom',
    subtitle: 'Ghi âm · Camera · Định vị · Máy dò · Camera hành trình 4G',
    gradient: 'from-emerald-500/10 via-emerald-500/[0.03] to-transparent',
    accent: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    button: 'bg-emerald-500 hover:bg-emerald-400 text-white',
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.12)]',
  },
  Noma: {
    label: 'Noma',
    subtitle: 'Sản phẩm chăm sóc ô tô',
    gradient: 'from-amber-500/10 via-amber-500/[0.03] to-transparent',
    accent: 'text-amber-400',
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    button: 'bg-amber-500 hover:bg-amber-400 text-white',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.12)]',
  },
} as const;

function BrandCard({
  brand, stats, onClick,
}: {
  brand: 'Doscom' | 'Noma';
  stats: BrandStats;
  onClick: () => void;
}) {
  const theme = BRAND_THEME[brand];
  const allDone = stats.total > 0 && stats.remaining === 0;
  const disabled = stats.total === 0;
  const canClick = !disabled && !allDone;

  return (
    <Card
      className={`group relative overflow-hidden bg-[#0C0C0E] border ${theme.border} rounded-[2.5rem] p-10 lg:p-12 transition-all duration-500 ${theme.glow} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none opacity-20 transition-opacity duration-700`} />

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={canClick ? onClick : undefined}
              disabled={!canClick}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.bg} ring-1 ${theme.ring} text-[9px] font-black ${theme.accent} uppercase tracking-[0.3em] transition-all ${
                canClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Vòng quay bài test
            </button>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase leading-none">{theme.label}</h2>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed pt-2 max-w-md">{theme.subtitle}</p>
          </div>
          {allDone && (
            <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Hoàn tất</span>
            </div>
          )}
        </div>

        {/* Stats — không clickable */}
        <div className="grid grid-cols-3 gap-3 pt-2 select-none">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Tổng số</p>
            <p className="text-3xl font-black text-white font-mono tabular-nums leading-none">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã làm
            </p>
            <p className="text-3xl font-black text-emerald-400 font-mono tabular-nums leading-none">{stats.done}</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${theme.accent}`}>Còn lại</p>
            <p className={`text-3xl font-black font-mono tabular-nums leading-none ${theme.accent}`}>{stats.remaining}</p>
          </div>
        </div>

        {/* CTA — chỉ nút này mới điều hướng */}
        <button
          type="button"
          onClick={canClick ? onClick : undefined}
          disabled={!canClick}
          className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
            disabled
              ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
              : allDone
                ? 'bg-zinc-900 text-zinc-400 cursor-not-allowed'
                : `${theme.button} shadow-xl hover:scale-[1.02]`
          }`}
        >
          {disabled ? 'Chưa có sản phẩm' : allDone ? 'Đã hoàn thành tất cả' : 'Bắt đầu quay'}
          {canClick && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </Card>
  );
}

export default function ExamHubPage({ products, courses, onSelectBrand }: ExamHubPageProps) {
  const doscomStats = React.useMemo(() => computeStats('Doscom', products, courses), [products, courses]);
  const nomaStats = React.useMemo(() => computeStats('Noma', products, courses), [products, courses]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Kiểm tra sản phẩm</h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              Quay vòng — Chọn sản phẩm — Làm bài test
            </p>
          </div>
        </div>
      </header>

      {/* Brand cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BrandCard brand="Doscom" stats={doscomStats} onClick={() => onSelectBrand('Doscom')} />
        <BrandCard brand="Noma" stats={nomaStats} onClick={() => onSelectBrand('Noma')} />
      </div>
    </div>
  );
}
