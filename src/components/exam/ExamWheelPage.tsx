import * as React from 'react';
import { ChevronLeft, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { Card } from '../ui';
import type { Product, Course } from '../../types';

interface ExamWheelPageProps {
  brand: 'Doscom' | 'Noma';
  products: Product[];
  courses: Course[];
  userId: string;
  onBack: () => void;
  onStartQuiz: (course: Course) => void;
}

const winnerStorageKey = (brand: string, userId: string) => `exam_wheel_winner_${brand}_${userId}`;

const SECTOR_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6',
  '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#A855F7',
];

const WINNER_THEME = {
  Doscom: {
    border: 'border-emerald-500/15',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.12)]',
    bannerBg: 'bg-emerald-500/[0.04]',
    bannerBorder: 'border-emerald-500/10',
    accent: 'text-emerald-400',
    accentDark: 'text-emerald-500',
    cta: 'bg-emerald-500 hover:bg-emerald-400',
    hub: 'bg-emerald-500 hover:bg-emerald-400',
  },
  Noma: {
    border: 'border-amber-500/15',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.12)]',
    bannerBg: 'bg-amber-500/[0.04]',
    bannerBorder: 'border-amber-500/10',
    accent: 'text-amber-400',
    accentDark: 'text-amber-500',
    cta: 'bg-amber-500 hover:bg-amber-400',
    hub: 'bg-amber-500 hover:bg-amber-400',
  },
} as const;

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

export default function ExamWheelPage({ brand, products, courses, userId, onBack, onStartQuiz }: ExamWheelPageProps) {
  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [winner, setWinner] = React.useState<WheelItem | null>(null);
  const [wheelItems, setWheelItems] = React.useState<WheelItem[]>([]);

  // Build wheel items khi không đang spin.
  // Lock trong lúc spin để tránh reshuffle giữa chừng (gây nhảy kết quả).
  // Đồng thời restore winner từ localStorage nếu sản phẩm đó còn trong vòng quay
  // (= user trúng nhưng chưa làm bài, quay lại trang vẫn thấy kết quả cũ).
  React.useEffect(() => {
    if (spinning) return;
    const items: WheelItem[] = [];
    for (const p of products) {
      if (p.brand !== brand) continue;
      const course = courses.find(c => c.productId === p.id && c.quizId);
      if (!course) continue;
      const quizDone = (course.attempts || 0) >= 1 || course.lastQuizScore != null;
      if (quizDone) continue;
      items.push({ product: p, course });
    }
    const shuffled = shuffle(items);
    setWheelItems(shuffled);

    // Restore / validate winner
    try {
      const key = winnerStorageKey(brand, userId);
      const savedId = localStorage.getItem(key);
      if (savedId) {
        const found = shuffled.find(it => it.product.id === savedId);
        if (found) {
          setWinner(found);
        } else {
          // Stale: sản phẩm đã làm xong hoặc không còn → clear
          localStorage.removeItem(key);
          setWinner(null);
        }
      } else {
        setWinner(null);
      }
    } catch {
      setWinner(null);
    }
  }, [brand, products, courses, spinning, userId]);

  const n = wheelItems.length;
  const sectorAngle = n > 0 ? 360 / n : 0;

  const handleSpin = () => {
    if (spinning || n === 0) return;
    setWinner(null);

    const randomIdx = Math.floor(Math.random() * n);
    // Capture sản phẩm trúng NGAY tại thời điểm spin — không phụ thuộc vào
    // wheelItems sau này có thay đổi hay không.
    const chosenItem = wheelItems[randomIdx];

    // Sector i's center at angle (i*sectorAngle + sectorAngle/2) from top.
    // Pointer ở top (12 o'clock). Rotate để chosen sector về pointer.
    const targetAngle = -(randomIdx * sectorAngle + sectorAngle / 2);
    const fullSpins = 6;
    const newRotation = rotation - (rotation % 360) + fullSpins * 360 + targetAngle;

    setSpinning(true);
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setWinner(chosenItem);
      try {
        localStorage.setItem(winnerStorageKey(brand, userId), chosenItem.product.id);
      } catch { /* ignore */ }
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
            {/* Knob: 1 path SVG liền (tam giác trỏ lên + thân tròn) + viền trắng + chữ QUAY.
                Tam giác là kim chỉ → khi wheel dừng, sector ngay dưới mũi tam giác = trúng. */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning || winner != null}
              aria-label="Quay vòng"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[22%] aspect-square bg-transparent transition-transform ${
                spinning || winner != null
                  ? 'cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95 cursor-pointer'
              }`}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <svg
                viewBox="-55 -55 110 110"
                className="w-full h-full"
                style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))' }}
              >
                <path
                  d="M -16.12 -43.92
                     L 0 -72.53
                     L 16.12 -43.92
                     A 48.46 48.46 0 1 1 -16.12 -43.92
                     Z"
                  fill={
                    spinning || winner != null
                      ? '#3F3F46'
                      : brand === 'Doscom' ? '#10B981' : '#F59E0B'
                  }
                  stroke="#FFFFFF"
                  strokeWidth="6.3"
                  strokeLinejoin="round"
                />
                <text
                  x="0"
                  y="9"
                  fontSize="18"
                  fill="#FFFFFF"
                  textAnchor="middle"
                  fontWeight="900"
                  style={{ letterSpacing: '1.5px', pointerEvents: 'none' }}
                  className={spinning ? 'animate-pulse' : ''}
                >
                  {spinning ? '...' : 'QUAY'}
                </text>
              </svg>
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
                        opacity={winner?.product.id === item.product.id ? 1 : 0.92}
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

          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center max-w-md">
            {n} sản phẩm còn lại trong vòng quay
          </p>
        </div>

        {/* RESULT PANEL */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {winner ? (() => {
            const theme = WINNER_THEME[brand];
            return (
              <Card className={`bg-[#0C0C0E] border ${theme.border} rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 ${theme.glow}`}>
                {/* Banner */}
                <div className={`${theme.bannerBg} border-b ${theme.bannerBorder} px-6 py-4 flex items-center gap-3`}>
                  <Sparkles className={`w-5 h-5 ${theme.accent}`} />
                  <span className={`text-[10px] font-black ${theme.accent} uppercase tracking-widest`}>Sản phẩm trúng thưởng</span>
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
                    <span className={`text-[9px] font-black ${theme.accentDark} uppercase tracking-widest`}>{winner.product.category}</span>
                    <h3 className="font-extrabold text-xl text-zinc-100 leading-tight uppercase tracking-tighter">{winner.product.title}</h3>
                    <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3">{winner.product.shortDescription}</p>
                  </div>

                  <button
                    onClick={() => onStartQuiz(winner.course)}
                    className={`w-full h-14 ${theme.cta} text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-xl`}
                  >
                    Làm bài kiểm tra
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })() : (
            <Card className="bg-[#0C0C0E] border border-zinc-900 rounded-3xl p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-black text-zinc-300 uppercase tracking-tight">Chưa có kết quả</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
                  Bấm nút <span className={WINNER_THEME[brand].accent}>QUAY</span> để bắt đầu chọn ngẫu nhiên 1 sản phẩm trong vòng quay.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
