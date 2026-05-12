import * as React from 'react';
import { ChevronLeft, RotateCw, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { Card } from '../ui';
import type { Product, Course } from '../../types';

interface ExamWheelPageProps {
  brand: 'Doscom' | 'Noma';
  products: Product[];
  courses: Course[];
  onBack: () => void;
  onStartQuiz: (course: Course) => void;
}

const SECTOR_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6',
  '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#A855F7',
];

interface WheelItem {
  product: Product;
  course: Course;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamWheelPage({ brand, products, courses, onBack, onStartQuiz }: ExamWheelPageProps) {
  // Build wheel items: product có course + quiz, CHƯA NỘP QUIZ.
  // Dùng course.attempts >= 1 hoặc lastQuizScore != null thay vì isCompleted
  // (isCompleted yêu cầu video 100% — user vào wheel chỉ làm test, không bắt xem video).
  const wheelItems = React.useMemo<WheelItem[]>(() => {
    const items: WheelItem[] = [];
    for (const p of products) {
      if (p.brand !== brand) continue;
      const course = courses.find(c => c.productId === p.id && c.quizId);
      if (!course) continue;
      const quizDone = (course.attempts || 0) >= 1 || course.lastQuizScore != null;
      if (quizDone) continue;
      items.push({ product: p, course });
    }
    return shuffle(items);
  }, [brand, products, courses]);

  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [winnerIdx, setWinnerIdx] = React.useState<number | null>(null);

  const winner = winnerIdx != null ? wheelItems[winnerIdx] : null;
  const n = wheelItems.length;
  const sectorAngle = n > 0 ? 360 / n : 0;

  const handleSpin = () => {
    if (spinning || n === 0) return;
    setWinnerIdx(null);

    const randomIdx = Math.floor(Math.random() * n);
    // Sector i's center is at angle (i * sectorAngle + sectorAngle/2) from the top
    // Pointer is at the top (12 o'clock). We rotate the wheel so the chosen sector's center lines up with the pointer.
    // After full spins, the final offset must be: -(randomIdx * sectorAngle + sectorAngle/2)
    const targetAngle = -(randomIdx * sectorAngle + sectorAngle / 2);
    const fullSpins = 6; // 6 vòng full
    const newRotation = rotation - (rotation % 360) + fullSpins * 360 + targetAngle;

    setSpinning(true);
    setRotation(newRotation);

    // Match transition duration
    setTimeout(() => {
      setSpinning(false);
      setWinnerIdx(randomIdx);
    }, 5200);
  };

  // ── Empty state ──
  if (n === 0) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <button onClick={onBack} className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </button>

        <Card className="p-16 bg-[#0C0C0E] border border-emerald-500/20 rounded-[2.5rem] text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-white uppercase">Đã làm hết bài kiểm tra {brand}!</h2>
            <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-widest">
              Không còn sản phẩm nào trong vòng quay. Quay lại để chọn thương hiệu khác.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </button>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Vòng quay bài test</p>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white uppercase leading-none">{brand}</h1>
        </div>
      </div>

      {/* Body: Wheel + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
        {/* WHEEL */}
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-[420px] h-[420px] lg:w-[480px] lg:h-[480px] select-none">
            {/* Pointer (kim chỉ) */}
            <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div
                className="w-0 h-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                style={{
                  borderLeft: '18px solid transparent',
                  borderRight: '18px solid transparent',
                  borderTop: '32px solid #FFFFFF',
                }}
              />
              <div className="w-3 h-3 rounded-full bg-white mx-auto -mt-1 shadow-lg" />
            </div>

            {/* Hub button — click giữa vòng quay cũng spin được */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[20%] h-[20%] rounded-full flex items-center justify-center font-black uppercase tracking-widest transition-all shadow-2xl ${
                spinning
                  ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                  : 'bg-white text-zinc-900 hover:scale-110 active:scale-95 ring-4 ring-white/20'
              }`}
              aria-label="Quay vòng"
            >
              <RotateCw className={`w-5 h-5 lg:w-6 lg:h-6 ${spinning ? 'animate-spin' : ''}`} />
            </button>

            {/* Wheel SVG */}
            <div
              className="w-full h-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.25, 1)' : 'none',
              }}
            >
              <svg viewBox="-110 -110 220 220" className="w-full h-full drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                {wheelItems.map((item, i) => {
                  const startAngle = i * sectorAngle - 90; // -90 vì 0deg ở góc phải, ta muốn bắt đầu từ trên cùng
                  const endAngle = startAngle + sectorAngle;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const r = 100;
                  const x1 = r * Math.cos(startRad);
                  const y1 = r * Math.sin(startRad);
                  const x2 = r * Math.cos(endRad);
                  const y2 = r * Math.sin(endRad);
                  const largeArc = sectorAngle > 180 ? 1 : 0;
                  const color = SECTOR_COLORS[i % SECTOR_COLORS.length];

                  // Radial text: chữ chạy dọc từ trong ra ngoài theo bán kính
                  const midAngle = startAngle + sectorAngle / 2;
                  // Bình thường hóa góc về [0, 360)
                  const angDeg = ((midAngle % 360) + 360) % 360;
                  // Nửa dưới (90° → 270°): chữ sẽ bị ngược, lật 180° cho đọc xuôi
                  const upside = angDeg > 90 && angDeg < 270;
                  const textX = upside ? -62 : 62;
                  const rotateBy = upside ? midAngle + 180 : midAngle;

                  // Cắt tên: nhiều sector → cắt ngắn hơn để vừa chiều dài radial
                  const maxLen = n > 24 ? 14 : n > 16 ? 18 : 22;
                  const shortName = item.product.title.length > maxLen
                    ? item.product.title.slice(0, maxLen - 1) + '…'
                    : item.product.title;

                  const fontSize = n > 24 ? 4.5 : n > 16 ? 5 : 6;

                  return (
                    <g key={item.product.id}>
                      <path
                        d={`M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={color}
                        stroke="#0C0C0E"
                        strokeWidth="1"
                        opacity={winnerIdx === i ? 1 : 0.92}
                      />
                      <text
                        x={textX}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${rotateBy} 0 0)`}
                        fill="#FFFFFF"
                        fontSize={fontSize}
                        fontWeight="900"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.3px', pointerEvents: 'none' }}
                      >
                        {shortName}
                      </text>
                    </g>
                  );
                })}
                {/* Hub mask — để chừa chỗ cho nút overlay phía trên */}
                <circle cx="0" cy="0" r="22" fill="#0C0C0E" />
              </svg>
            </div>
          </div>

          {/* Spin button */}
          <button
            onClick={handleSpin}
            disabled={spinning}
            className={`h-16 px-10 rounded-2xl font-black uppercase text-sm tracking-[0.3em] transition-all flex items-center gap-4 shadow-2xl ${
              spinning
                ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse-slow hover:animate-none'
            }`}
          >
            <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
            {spinning ? 'Đang quay...' : winner ? 'Quay lại' : 'Quay'}
          </button>

          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center max-w-md">
            {n} sản phẩm còn lại trong vòng quay
          </p>
        </div>

        {/* RESULT PANEL */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {winner ? (
            <Card className="bg-[#0C0C0E] border border-emerald-500/30 rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
              {/* Banner */}
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sản phẩm trúng thưởng</span>
              </div>

              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-zinc-950 border-b border-zinc-900 relative overflow-hidden">
                <img
                  src={winner.product.thumbnail}
                  alt={winner.product.title}
                  className="w-full h-full object-contain p-8"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-block px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest text-white bg-black/70 backdrop-blur-xl border border-white/10">
                    {winner.product.brand}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{winner.product.category}</span>
                  <h3 className="font-extrabold text-xl text-zinc-100 leading-tight uppercase tracking-tighter">{winner.product.title}</h3>
                  <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3">{winner.product.shortDescription}</p>
                </div>

                <button
                  onClick={() => onStartQuiz(winner.course)}
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-xl"
                >
                  Làm bài kiểm tra
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSpin}
                  className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all border border-zinc-800"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Quay lại
                </button>
              </div>
            </Card>
          ) : (
            <Card className="bg-[#0C0C0E] border border-zinc-900 rounded-3xl p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-black text-zinc-300 uppercase tracking-tight">Chưa có kết quả</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
                  Bấm nút <span className="text-emerald-400">QUAY</span> để bắt đầu chọn ngẫu nhiên 1 sản phẩm trong vòng quay.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
