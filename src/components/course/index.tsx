import * as React from 'react';
import { motion } from 'motion/react';
import {
  Play,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  MonitorPlay,
  Trophy,
  Users,
  FileText,
  Eye,
  Lock,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Course, Brand } from '../../types';
import { Card, Badge, Button, Progress, cn } from '../ui';
import { upsertVideoProgress, markSlideViewed } from '../../services/trainingProgressService';
import { NOMA_ROLLOUT_COURSE_IDS } from '../../services/nomaRolloutService';
import { SEQUENTIAL_PATH_BRANDS, sortByLessonNumber, findCurrentLessonId, computeLockedLessonIds } from '../../services/sequentialCourseHelpers';

// 9 khóa NOMA mới: cho phép làm lại quiz tối đa 3 lần (1 lần đầu + 2 lần làm lại),
// nhưng chỉ dành cho người CHƯA đạt 80 điểm — ai đã đạt 80 trở lên thì dừng, không cần/không được làm lại nữa.
// Các khóa học khác giữ nguyên hành vi cũ: chỉ 1 lần duy nhất.
const NOMA_QUIZ_MAX_ATTEMPTS = 3;
const NOMA_RETRY_PASS_THRESHOLD = 80;

export function getQuizMaxAttempts(courseId: string): number {
  return NOMA_ROLLOUT_COURSE_IDS.includes(courseId) ? NOMA_QUIZ_MAX_ATTEMPTS : 1;
}

/** Đã đạt đủ điểm (≥80) ở khóa NOMA rồi thì không được làm lại nữa, dù chưa hết lượt */
export function hasReachedNomaPassThreshold(courseId: string, lastQuizScore?: number): boolean {
  return NOMA_ROLLOUT_COURSE_IDS.includes(courseId) && lastQuizScore != null && lastQuizScore >= NOMA_RETRY_PASS_THRESHOLD;
}

// ── YouTube IFrame API loader ──────────────────────────────────────────
// Load script (once globally) và resolve khi window.YT.Player sẵn sàng.
function ensureYouTubeAPI(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT?.Player) { resolve(w.YT); return; }

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };

    // Fallback poll trong trường hợp script đã load xong trước khi gán callback
    const start = Date.now();
    const poll = setInterval(() => {
      if (w.YT?.Player) { clearInterval(poll); resolve(w.YT); return; }
      if (Date.now() - start > 10_000) { clearInterval(poll); resolve(null); }
    }, 200);
  });
}

// ─── Video Progress Tracker Helpers ─────────────────────────────────────────

function getVideoProgressKey(userId: string) {
  return `lms_video_progress_${userId}`;
}

function getVideoProgress(courseId: string, userId: string): number {
  try {
    const data = JSON.parse(localStorage.getItem(getVideoProgressKey(userId)) || '{}');
    return data[courseId] || 0;
  } catch { return 0; }
}

function setVideoProgress(courseId: string, progress: number, userId: string) {
  try {
    const key = getVideoProgressKey(userId);
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[courseId] = Math.min(100, Math.max(data[courseId] || 0, progress));
    localStorage.setItem(key, JSON.stringify(data));
  } catch { }
}

// ─── Quiz Attempts Helpers ──────────────────────────────────────────────────

function getQuizAttemptsKey(userId: string) {
  return `lms_quiz_attempts_${userId}`;
}

function getQuizAttempts(courseId: string, userId: string): number {
  try {
    const data = JSON.parse(localStorage.getItem(getQuizAttemptsKey(userId)) || '{}');
    return data[courseId] || 0;
  } catch { return 0; }
}

// ─── Sequential Learning Path (Duolingo-style winding path, không khóa) ────

interface SequentialLearningPathProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
}

// Biên độ lệch trái/phải (px) theo chỉ số bài — tạo hiệu ứng uốn lượn rõ rệt
const PATH_OFFSETS = [0, -110, -150, -110, 0, 110, 150, 110];

const SequentialLearningPath = ({ courses, onCourseClick }: SequentialLearningPathProps) => {
  const ordered = React.useMemo(() => sortByLessonNumber(courses), [courses]);
  const currentId = React.useMemo(() => findCurrentLessonId(courses), [courses]);
  const lockedIds = React.useMemo(() => computeLockedLessonIds(courses), [courses]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  // Ref trên cả khối (nốt tròn + nhãn chữ) — dùng đáy khối này làm điểm bắt đầu
  // đường nối và đỉnh nốt tròn tiếp theo làm điểm kết thúc, để đường không đè lên chữ.
  const nodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [pathD, setPathD] = React.useState('');

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computePath = () => {
      const containerRect = container.getBoundingClientRect();
      const blocks = ordered
        .map((c) => nodeRefs.current.get(c.id))
        .filter((el): el is HTMLDivElement => Boolean(el))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2 - containerRect.left;
          return { top: { x, y: r.top - containerRect.top }, bottom: { x, y: r.bottom - containerRect.top } };
        });

      if (blocks.length < 2) { setPathD(''); return; }

      // "M" chỉ nhấc bút di chuyển (không vẽ) tới đáy khối trước, rồi "C" mới vẽ
      // đường cong trong khoảng trống tới đỉnh khối sau — không bao giờ vẽ xuyên
      // qua nội dung (nốt tròn + nhãn chữ) của chính khối đó.
      let d = `M ${blocks[0].bottom.x} ${blocks[0].bottom.y}`;
      for (let i = 1; i < blocks.length; i++) {
        const from = blocks[i - 1].bottom;
        const to = blocks[i].top;
        const midY = (from.y + to.y) / 2;
        d += ` C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
        if (i < blocks.length - 1) {
          d += ` M ${blocks[i].bottom.x} ${blocks[i].bottom.y}`;
        }
      }
      setPathD(d);
    };

    computePath();
    const observer = new ResizeObserver(computePath);
    observer.observe(container);
    window.addEventListener('resize', computePath);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computePath);
    };
  }, [ordered]);

  return (
    <div ref={containerRef} className="relative py-10 max-w-lg mx-auto">
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        <path
          d={pathD}
          fill="none"
          stroke="var(--theme-text-5, #52525B)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="2 16"
        />
      </svg>

      <div className="relative flex flex-col items-center gap-16">
        {ordered.map((course, i) => {
          const isCompleted = course.isCompleted;
          const isCurrent = course.id === currentId;
          const isLocked = lockedIds.has(course.id);
          const offset = PATH_OFFSETS[i % PATH_OFFSETS.length];

          return (
            <div
              key={course.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(course.id, el);
                else nodeRefs.current.delete(course.id);
              }}
              className="relative flex flex-col items-center"
              style={{ transform: `translateX(${offset}px)` }}
            >
              {isCurrent && (
                <button
                  type="button"
                  onClick={() => onCourseClick(course)}
                  className="absolute -top-12 flex flex-col items-center z-10 animate-in fade-in slide-in-from-bottom-2"
                >
                  <span className="px-4 py-1.5 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_4px_20px_var(--theme-accent-glow,rgba(16,185,129,0.5))] whitespace-nowrap">
                    Bắt đầu
                  </span>
                  <div className="w-3 h-3 bg-emerald-500 rotate-45 -mt-1.5" />
                </button>
              )}

              <button
                type="button"
                disabled={isLocked}
                onClick={() => { if (!isLocked) onCourseClick(course); }}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-300",
                  isLocked && "bg-zinc-900 border-zinc-800 cursor-not-allowed",
                  !isLocked && (isCompleted || isCurrent) && "bg-emerald-500 border-emerald-500 shadow-[0_0_30px_var(--theme-accent-glow,rgba(16,185,129,0.5))]",
                  !isLocked && !isCompleted && !isCurrent && "bg-zinc-800 border-zinc-700 hover:border-emerald-500/50 hover:scale-105"
                )}
              >
                {isLocked ? (
                  <span className="text-2xl font-black text-zinc-600">{i + 1}</span>
                ) : isCompleted ? (
                  <CheckCircle2 className="w-9 h-9 text-white" />
                ) : (
                  <span className="text-2xl font-black text-white">{i + 1}</span>
                )}
              </button>

              <div className="mt-3 text-center max-w-[200px]">
                <p className={cn("text-[9px] font-black uppercase tracking-widest", isLocked ? "text-zinc-700" : "text-emerald-500/80")}>
                  Bài {i + 1}
                </p>
                <p className={cn("text-xs font-bold leading-tight mt-0.5", isLocked ? "text-zinc-700" : "text-zinc-300")}>
                  {course.title.replace(/^Bài\s+\d+:\s*/i, '')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Course Catalog ─────────────────────────────────────────────────────────

interface CourseCatalogProps {
  courses: Course[];
  userId: string;
  onCourseClick: (course: Course) => void;
  initialGroup?: 'product' | 'general' | 'department' | null;
}

const PRODUCT_BRANDS: (Brand | 'Tất cả')[] = ['Tất cả', 'Doscom', 'Noma'];
const GENERAL_BRANDS: (Brand | 'Tất cả')[] = ['Tất cả', 'Tổng Quan Về Công Ty', 'Đào Tạo Onboarding', 'Nội Quy - Quy Chế', 'Văn Hóa Công Ty', 'Nội bộ', 'Claude', 'Khóa học CEO Ngô Minh Tuấn'];
const ALL_BRANDS: (Brand | 'Tất cả')[] = ['Tất cả', 'Tổng Quan Về Công Ty', 'Đào Tạo Onboarding', 'Nội Quy - Quy Chế', 'Văn Hóa Công Ty', 'Nội bộ', 'Doscom', 'Noma', 'Claude', 'Khóa học CEO Ngô Minh Tuấn'];
const PRODUCT_BRAND_SET = new Set(['Doscom', 'Noma']);
const GENERAL_BRAND_SET = new Set(['Tổng Quan Về Công Ty', 'Đào Tạo Onboarding', 'Nội Quy - Quy Chế', 'Văn Hóa Công Ty', 'Nội bộ', 'Claude', 'Khóa học CEO Ngô Minh Tuấn']);

export const CourseCatalog = ({ courses, userId, onCourseClick, initialGroup }: CourseCatalogProps) => {
  const [activeBrand, setActiveBrand] = React.useState<Brand | 'Tất cả'>('Tất cả');
  const [activeSub, setActiveSub] = React.useState<string>('Tất cả');
  const [activeProgram, setActiveProgram] = React.useState<string>('Tất cả');

  // Pre-filter courses theo nhóm trước khi áp dụng brand filter
  const deptCourses = React.useMemo(() => courses.filter(c => !PRODUCT_BRAND_SET.has(c.brand) && !GENERAL_BRAND_SET.has(c.brand)), [courses]);
  const deptBrands: (Brand | 'Tất cả')[] = React.useMemo(() => {
    const unique = Array.from(new Set(deptCourses.map(c => c.brand)));
    return ['Tất cả', ...unique] as (Brand | 'Tất cả')[];
  }, [deptCourses]);

  const brands = initialGroup === 'product' ? PRODUCT_BRANDS : initialGroup === 'general' ? GENERAL_BRANDS : initialGroup === 'department' ? deptBrands : ALL_BRANDS;

  const groupCourses = React.useMemo(() => {
    if (initialGroup === 'product') return courses.filter(c => PRODUCT_BRAND_SET.has(c.brand));
    if (initialGroup === 'general') return courses.filter(c => GENERAL_BRAND_SET.has(c.brand));
    if (initialGroup === 'department') return deptCourses;
    return courses;
  }, [courses, initialGroup, deptCourses]);

  // Reset về Tất cả khi đổi nhóm khóa học
  React.useEffect(() => {
    setActiveBrand('Tất cả');
    setActiveSub('Tất cả');
  }, [initialGroup]);

  // Reset chip cấp 2 khi đổi tab thương hiệu
  React.useEffect(() => {
    setActiveSub('Tất cả');
  }, [activeBrand]);

  // Reset chip chương trình khi đổi phòng ban/danh mục
  React.useEffect(() => {
    setActiveProgram('Tất cả');
  }, [activeSub]);

  // Cấp 2 dùng `department` cho Nội bộ và group department, `category` cho các brand còn lại
  const isInternal = activeBrand === 'Nội bộ' || initialGroup === 'department';
  const subLabel = isInternal ? 'Phòng ban' : 'Dòng khóa học';

  const coursesByBrand = activeBrand === 'Tất cả'
    ? groupCourses
    : groupCourses.filter(c => c.brand === activeBrand);

  // 5 phòng ban nội bộ luôn hiện chip dù chưa có khóa học nào
  const INTERNAL_DEPARTMENTS = [
    'Phòng kinh doanh',
    'Phòng tổng hợp',
    'Phòng công nghệ',
    'Phòng marketing',
    'Phòng kho',
  ];

  // Bỏ tiền tố "Phòng " khi so sánh để tránh trùng giữa "Kho" và "Phòng kho"
  const normalizeDept = (s: string) =>
    s.toLowerCase().replace(/^phòng\s+/i, '').trim();

  const subOptions = React.useMemo(() => {
    const values = coursesByBrand
      .map(c => (isInternal ? (c.department || '') : (c.category || '')).trim())
      .filter(Boolean);

    if (!isInternal) {
      return ['Tất cả', ...Array.from(new Set(values))];
    }

    // Nội bộ: dedupe theo dạng đã chuẩn hóa, ưu tiên hiện canonical "Phòng X"
    const seen = new Map<string, string>();
    for (const name of INTERNAL_DEPARTMENTS) seen.set(normalizeDept(name), name);
    for (const v of values) {
      const key = normalizeDept(v);
      if (!seen.has(key)) seen.set(key, v); // phòng ngoài 5 mặc định → giữ nguyên tên DB
    }
    return ['Tất cả', ...Array.from(seen.values())];
  }, [coursesByBrand, isInternal]);

  const filteredCourses = activeSub === 'Tất cả'
    ? coursesByBrand
    : coursesByBrand.filter(c => {
        const v = (isInternal ? c.department : c.category) || '';
        return isInternal
          ? normalizeDept(v) === normalizeDept(activeSub)
          : v.trim() === activeSub;
      });

  // Chip "chương trình" — chỉ ở nhóm phòng ban, liệt kê các chuỗi bài học (brand)
  // đang có trong phòng ban/danh mục hiện chọn. Bấm vào mới hiện lộ trình.
  const programOptions = React.useMemo(() => {
    if (initialGroup !== 'department') return [];
    return Array.from(new Set(filteredCourses.map(c => c.brand).filter(Boolean)));
  }, [filteredCourses, initialGroup]);

  const finalCourses = activeProgram === 'Tất cả'
    ? filteredCourses
    : filteredCourses.filter(c => c.brand === activeProgram);

  // Khóa lộ trình tuần tự (CEO, Sale) khi hiện dạng lưới ở catalog: sắp theo số Bài cho dễ theo dõi
  const displayCourses = SEQUENTIAL_PATH_BRANDS.includes(activeBrand as string)
    ? sortByLessonNumber(finalCourses)
    : finalCourses;

  // Có chip "Khóa học" để chọn nhưng chưa bấm cụ thể cái nào → chưa hiện gì cả
  const awaitingProgramPick = programOptions.length > 0 && activeProgram === 'Tất cả';

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white uppercase leading-none">{initialGroup === 'department' ? 'KHÓA HỌC THEO PHÒNG BAN' : 'KHÓA HỌC PHÁT TRIỂN'}</h1>
          </div>

          {initialGroup !== 'department' && (
            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800 backdrop-blur-md flex-shrink-0 flex-wrap">
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setActiveBrand(brand as any)}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeBrand === brand
                    ? 'bg-emerald-500 text-white'
                    : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cấp 2: chip danh mục / phòng ban */}
        {subOptions.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mr-2">
              {subLabel}
            </span>
            {subOptions.filter(opt => opt !== 'Tất cả').map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveSub(opt)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest border",
                  activeSub === opt
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Chip chương trình — vd "Khóa học thực chiến". Bấm vào mới hiện lộ trình. */}
        {programOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mr-2">
              Khóa học
            </span>
            {programOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveProgram(opt)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-black transition-all uppercase tracking-widest border",
                  activeProgram === opt
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {!awaitingProgramPick && finalCourses.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-zinc-800 bg-zinc-950/40 py-20 px-6 text-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
            Chưa có khóa học nào cho {isInternal ? 'phòng ban' : 'danh mục'} này
          </p>
        </div>
      )}

      {!awaitingProgramPick && finalCourses.length > 0 && activeProgram !== 'Tất cả' && SEQUENTIAL_PATH_BRANDS.includes(activeProgram) ? (
        <SequentialLearningPath courses={finalCourses} onCourseClick={onCourseClick} />
      ) : !awaitingProgramPick && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayCourses
          .map((course) => {
            const videoProgress = Math.max(getVideoProgress(course.id, userId), course.videoProgress || 0);
            // Video = 50%, submit quiz (pass/fail) = +50%
            const courseHasQuiz = Boolean(course.quizId);
            const videoPart = Math.round(videoProgress / 2);
            const quizPart = course.lastQuizScore != null ? 50 : 0;
            const trainingProgress = !courseHasQuiz
              ? videoProgress
              : Math.min(100, videoPart + quizPart);
            return (
              <Card
                key={course.id}
                className="group flex flex-col h-full bg-[#0C0C0E] border border-emerald-500/20 hover:border-emerald-400/60 transition-all duration-700 rounded-[2rem] overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:shadow-[0_0_45px_rgba(16,185,129,0.4)] relative cursor-pointer"
                onClick={() => onCourseClick(course)}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950 border-b border-zinc-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
                    <span className="inline-block backdrop-blur-xl px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none border" style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.1)' }}>{course.category}</span>
                    {course.isCompleted && (course.videoUrl || course.quizId) && <span className="inline-block px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none shadow-2xl" style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>HOÀN THÀNH</span>}
                    {/* Deadline badges */}
                    {(() => {
                      if (!course.endDate || course.isCompleted) return null;
                      const today = new Date(); today.setHours(0,0,0,0);
                      const end = new Date(course.endDate); end.setHours(0,0,0,0);
                      const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
                      if (days < 0) return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none shadow-2xl bg-red-500 text-white animate-pulse"><AlertTriangle className="w-2.5 h-2.5" />QUÁ HẠN</span>;
                      if (days <= 2) return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none shadow-2xl bg-amber-500 text-white"><CalendarClock className="w-2.5 h-2.5" />{days === 0 ? 'HÔM NAY' : `CÒN ${days} NGÀY`}</span>;
                      return null;
                    })()}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                    <div className="bg-[#10B981]/10 backdrop-blur-md p-5 rounded-full border border-emerald-500/30">
                      <Play className="w-8 h-8 text-[#10B981] fill-current" />
                    </div>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none border" style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.1)' }}>{course.brand}</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Users className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] font-black  text-zinc-600 uppercase">ĐÀO TẠO VIÊN</span>
                      </div>
                    </div>
                    <h3 className="font-extrabold text-lg text-zinc-100 leading-tight group-hover:text-emerald-400 transition-colors uppercase  tracking-tighter line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <div className="mt-auto space-y-4 pt-4 border-t border-zinc-900/50">
                    {/* Video Progress — only show when course has video */}
                    {course.videoUrl && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black  tracking-widest uppercase">
                          <span className="text-zinc-600  leading-none flex items-center gap-1.5">
                            <Eye className="w-3 h-3" /> Tiến độ xem video
                          </span>
                          <span className="text-cyan-400 font-mono ">{videoProgress}%</span>
                        </div>
                        <Progress value={videoProgress} className="h-1" />
                      </div>
                    )}

                    {/* Training Progress — hide for slide-only courses */}
                    {(course.videoUrl || course.quizId) && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black  tracking-widest uppercase">
                          <span className="text-zinc-600  leading-none">Tiến độ đào tạo</span>
                          <span className="text-emerald-500 font-mono ">{trainingProgress}%</span>
                        </div>
                        <Progress value={trainingProgress} className="h-1.5" />
                      </div>
                    )}

                    {(() => {
                      const isSlideOnly = !course.videoUrl && !course.quizId;
                      const label = isSlideOnly ? 'Bắt đầu ngay' : course.isCompleted ? 'Xem lại bài học' : trainingProgress > 0 ? 'Tiếp tục học tập' : 'Bắt đầu ngay';
                      const isOutline = !isSlideOnly && course.isCompleted;
                      return (
                        <Button variant={isOutline ? 'outline' : 'primary'} className={`w-full text-[10px] font-black h-12 uppercase tracking-widest rounded-xl group/btn  ${isOutline ? 'border-zinc-800 text-emerald-500 hover:bg-emerald-500 hover:text-white' : ''}`}>
                          {label}
                          <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
      )}
    </div>
  );
};

// ─── Course Detail ──────────────────────────────────────────────────────────

interface CourseDetailProps {
  course: Course;
  userId: string;
  employeeId?: string;
  onBack: () => void;
  onStartQuiz: (quizId?: string) => void;
  onSlideCompleted?: (courseId: string) => void;
}

export const CourseDetail = ({ course, userId, employeeId, onBack, onStartQuiz, onSlideCompleted }: CourseDetailProps) => {
  // Auto-select initial tab based on available content
  const [activeTab, setActiveTab] = React.useState<'video' | 'slide'>(
    course.videoUrl ? 'video' : 'slide'
  );

  const hasVideo = Boolean(course.videoUrl);
  const hasSlide = Boolean(course.slideUrl);
  const hasQuiz = Boolean(course.quizId);
  const isSlideOnly = hasSlide && !hasVideo && !hasQuiz;

  // ── Slide-only courses: tự đánh dấu hoàn thành ngay khi mở trang chi tiết (không cần bấm nút)
  React.useEffect(() => {
    if (!employeeId) return;
    if (hasVideo || hasQuiz) return; // only for pure slide-only courses
    if (!hasSlide) return;
    if (course.isCompleted) return;
    markSlideViewed(employeeId, course.id);
    onSlideCompleted?.(course.id); // cập nhật state + Tổng quan ngay
  }, [employeeId, course.id, course.isCompleted, hasVideo, hasQuiz, hasSlide, onSlideCompleted]);

  // ── Video Progress Tracking ────────────────────────────────────────────
  // Nguyên tắc: Tích lũy thời gian phát thực tế (watchedSeconds).
  // Video 10 phút = 100%. Tua không tính. Pause dừng đếm.
  // Chuyển tab vẫn đếm nếu video đang phát.
  // progress = watchedSeconds / totalDuration * 100

  const [videoWatchProgress, setVideoWatchProgress] = React.useState(() => Math.max(getVideoProgress(course.id, userId), course.videoProgress || 0));
  const [isWatching, setIsWatching] = React.useState(false);

  // Video-only: xem đủ ~3 phút (180s) → TỰ đánh dấu hoàn thành, không cần bấm nút
  React.useEffect(() => {
    if (!hasVideo || hasQuiz) return;
    if (course.isCompleted || videoWatchProgress >= 100) return;
    if (Math.round(videoWatchProgress * 6) >= 180) {
      setVideoWatchProgress(100);
      setVideoProgress(course.id, 100, userId);
      if (employeeId) upsertVideoProgress(employeeId, course.id, 100);
      onSlideCompleted?.(course.id);
    }
  }, [videoWatchProgress, hasVideo, hasQuiz, course.isCompleted, course.id, userId, employeeId, onSlideCompleted]);
  const videoTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeContainerRef = React.useRef<HTMLDivElement>(null);
  const supabaseSyncRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const ytPlayerRef = React.useRef<any>(null);
  const focusDummyRef = React.useRef<HTMLButtonElement>(null);
  const programmaticFocusRef = React.useRef(false);

  // Accumulated play time tracking
  const watchedSecondsRef = React.useRef(0);
  const durationRef = React.useRef(0);
  const playStartTimestampRef = React.useRef(0);     // Date.now() khi bắt đầu phát
  const playStartSecondsRef = React.useRef(0);        // watchedSeconds tại thời điểm bắt đầu phát
  const durationInitializedRef = React.useRef(false);  // Đã khởi tạo watchedSeconds từ saved progress chưa

  const isDirectVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(course.videoUrl || '');
  const isYouTube = /youtube\.com\/embed\/|youtu\.be\//.test(course.videoUrl || '');
  // Ưu tiên: admin-input duration → fallback 600s (chỉ dùng cho generic iframe / Drive).
  // YouTube/MP4 tự detect duration từ player.
  const ADMIN_VIDEO_DURATION = course.videoDurationSeconds && course.videoDurationSeconds > 0
    ? course.videoDurationSeconds
    : 0;
  const VIDEO_TOTAL_SECONDS = ADMIN_VIDEO_DURATION || 600;

  // ── Sync video progress to Supabase (debounced) ────────────────────────
  const syncToSupabase = React.useCallback((progress: number) => {
    if (!employeeId) return;
    if (supabaseSyncRef.current) clearTimeout(supabaseSyncRef.current);
    supabaseSyncRef.current = setTimeout(() => {
      upsertVideoProgress(employeeId, course.id, progress);
    }, 2000);
  }, [employeeId, course.id]);

  // ── Khởi tạo watchedSeconds từ saved progress khi biết duration ────────
  const initWatchedSeconds = React.useCallback((duration: number) => {
    if (durationInitializedRef.current) return;
    durationRef.current = duration;
    // Khôi phục watchedSeconds từ % đã lưu
    const savedPct = Math.max(getVideoProgress(course.id, userId), course.videoProgress || 0);
    watchedSecondsRef.current = Math.round((savedPct / 100) * duration);
    durationInitializedRef.current = true;
  }, [course.id, userId, course.videoProgress]);

  // ── Hàm cập nhật progress từ watchedSeconds ───────────────────────────
  const updateProgressFromSeconds = React.useCallback(() => {
    const dur = durationRef.current;
    if (dur <= 0) return;
    const pct = Math.min(100, Math.round((watchedSecondsRef.current / dur) * 100));
    setVideoWatchProgress(prev => {
      const next = Math.max(prev, pct);
      if (next !== prev) {
        setVideoProgress(course.id, next, userId);
        syncToSupabase(next);
      }
      return next;
    });
  }, [course.id, userId, syncToSupabase]);

  // ── Unified Timer: đếm thời gian phát thực tế bằng Date.now() ────────
  // Hoạt động cho TẤT CẢ loại video. Dùng Date.now() để tránh bị
  // browser throttle timer trong background tab.
  React.useEffect(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (!isWatching) return;

    // Ghi lại thời điểm bắt đầu phát
    playStartTimestampRef.current = Date.now();
    playStartSecondsRef.current = watchedSecondsRef.current;

    videoTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - playStartTimestampRef.current) / 1000;
      watchedSecondsRef.current = playStartSecondsRef.current + elapsed;
      updateProgressFromSeconds();
    }, 1000);

    return () => {
      // Khi dừng, cập nhật lần cuối
      if (playStartTimestampRef.current > 0) {
        const elapsed = (Date.now() - playStartTimestampRef.current) / 1000;
        watchedSecondsRef.current = playStartSecondsRef.current + elapsed;
        updateProgressFromSeconds();
      }
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };
  }, [isWatching, updateProgressFromSeconds]);

  // ── YouTube IFrame API ────────────────────────────────────────────────
  // Chỉ dùng onStateChange để phát hiện play/pause.
  // KHÔNG dừng khi chuyển tab. KHÔNG tính theo currentTime (chống tua).
  React.useEffect(() => {
    if (activeTab !== 'video' || !isYouTube || !course.videoUrl) return;

    const iframeEl = iframeContainerRef.current?.querySelector('iframe');
    if (!iframeEl) return;

    let player: any = null;
    let cancelled = false;

    ensureYouTubeAPI().then((YT: any) => {
      if (cancelled || !YT?.Player) return;
      try {
        player = new YT.Player(iframeEl, {
          events: {
            onReady: () => {
              try {
                // Ưu tiên duration admin nhập, fallback auto detect
                const dur = ADMIN_VIDEO_DURATION || player?.getDuration?.() || 0;
                if (dur > 0) initWatchedSeconds(dur);
              } catch { /* ignore */ }
            },
            onStateChange: (e: any) => {
              const state = e.data;

              // Lấy duration nếu chưa có
              try {
                const dur = ADMIN_VIDEO_DURATION || player?.getDuration?.() || 0;
                if (dur > 0 && !durationInitializedRef.current) initWatchedSeconds(dur);
              } catch { /* ignore */ }

              if (state === 1) {
                // PLAYING → bật tracking
                setIsWatching(true);
              } else if (state === 2 || state === 0 || state === -1) {
                // PAUSED (2) / ENDED (0) / UNSTARTED (-1) → dừng tracking
                setIsWatching(false);
              }
              // BUFFERING (3) / CUED (5): giữ nguyên trạng thái hiện tại

              if (state === 0) {
                // ENDED → force 100%
                const dur = player?.getDuration?.() || 0;
                if (dur > 0) watchedSecondsRef.current = dur;
                setVideoWatchProgress(100);
                setVideoProgress(course.id, 100, userId);
                syncToSupabase(100);
              }
            },
          },
        });
        ytPlayerRef.current = player;
      } catch (err) {
        console.warn('Không khởi tạo được YT.Player:', err);
      }
    });

    return () => {
      cancelled = true;
      ytPlayerRef.current = null;
      try { player?.destroy?.(); } catch { /* ignore */ }
    };
  }, [activeTab, isYouTube, course.videoUrl, course.id, userId, syncToSupabase, initWatchedSeconds]);

  // ── Native <video> tracking ───────────────────────────────────────────
  // Dùng play/pause events. KHÔNG dừng khi chuyển tab.
  React.useEffect(() => {
    if (activeTab !== 'video' || !course.videoUrl || !isDirectVideoFile) return;

    const container = iframeContainerRef.current;
    if (!container) return;

    const videoEl = container.querySelector('video');
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      // Ưu tiên admin-input duration, fallback video element duration
      const dur = ADMIN_VIDEO_DURATION || (videoEl.duration > 0 ? videoEl.duration : 0);
      if (dur > 0) initWatchedSeconds(dur);
    };
    const handlePlay = () => setIsWatching(true);
    const handlePause = () => setIsWatching(false);
    const handleEnded = () => {
      setIsWatching(false);
      const dur = ADMIN_VIDEO_DURATION || (videoEl.duration > 0 ? videoEl.duration : 0);
      if (dur > 0) watchedSecondsRef.current = dur;
      setVideoWatchProgress(100);
      setVideoProgress(course.id, 100, userId);
      syncToSupabase(100);
    };

    // Init duration nếu đã loaded
    const initialDur = ADMIN_VIDEO_DURATION || (videoEl.duration > 0 ? videoEl.duration : 0);
    if (initialDur > 0) {
      initWatchedSeconds(initialDur);
    }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [activeTab, course.videoUrl, course.id, isDirectVideoFile, syncToSupabase, initWatchedSeconds]);

  // ── Generic iframe (Drive...): toggle tracking khi click vào iframe ────
  // Không thể phát hiện play/pause trong cross-origin iframe.
  // Mỗi click vào iframe = toggle (play/pause). Dùng focus-stealing để
  // phát hiện các click tiếp theo (vì focus đã nằm trong iframe).
  React.useEffect(() => {
    if (isDirectVideoFile || isYouTube || activeTab !== 'video' || !course.videoUrl) return;

    // Init duration cho generic iframe
    if (!durationInitializedRef.current) {
      initWatchedSeconds(VIDEO_TOTAL_SECONDS);
    }

    const handleWindowBlur = () => {
      if (document.hidden) return;
      setTimeout(() => {
        if (document.hidden) return;
        const iframeEl = iframeContainerRef.current?.querySelector('iframe');
        if (iframeEl && document.activeElement === iframeEl) {
          // Toggle tracking: play → pause → play ...
          setIsWatching(prev => !prev);
          // Steal focus back để click tiếp theo cũng trigger blur
          setTimeout(() => {
            programmaticFocusRef.current = true;
            focusDummyRef.current?.focus();
            setTimeout(() => { programmaticFocusRef.current = false; }, 200);
          }, 400);
        }
      }, 100);
    };

    const handleWindowFocus = () => {
      // Ignore programmatic focus stealing
      if (programmaticFocusRef.current) return;
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isDirectVideoFile, isYouTube, activeTab, course.videoUrl, initWatchedSeconds]);

  // Stop tracking when switching content tabs (video → slide)
  React.useEffect(() => {
    if (activeTab !== 'video') setIsWatching(false);
  }, [activeTab]);


  const handleTabChange = (tab: 'video' | 'slide') => {
    setActiveTab(tab);
  };

  // ── Quiz Attempts from localStorage ──────────────────────────────────
  const localAttempts = getQuizAttempts(course.id, userId);
  const totalAttempts = Math.max(course.attempts, localAttempts);
  const quizMaxAttempts = getQuizMaxAttempts(course.id);
  const alreadyPassedThreshold = hasReachedNomaPassThreshold(course.id, course.lastQuizScore);
  const hasUsedAttempt = alreadyPassedThreshold || totalAttempts >= quizMaxAttempts;

  const showQuizSection = hasQuiz;

  // ── Course progress real-time: video = 50%, submit quiz (pass/fail) = +50%
  const computedCourseProgress = React.useMemo(() => {
    if (!showQuizSection) return videoWatchProgress;
    const videoPart = Math.round(videoWatchProgress / 2);
    const quizPart = course.lastQuizScore != null ? 50 : 0;
    return Math.min(100, videoPart + quizPart);
  }, [videoWatchProgress, course.lastQuizScore, showQuizSection]);

  // ── Quiz access: phải xem video ≥ 50% mới mở bài test ─────────────
  const quizDisabled = hasUsedAttempt;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <header className="flex flex-col gap-8">
        <button onClick={onBack} className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          QUAY LẠI KHÓA HỌC
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-zinc-900 pb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Badge variant="success" className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border-none font-black  tracking-widest uppercase">
                KHỐI ĐÀO TẠO
              </Badge>
              <Badge className="px-6 py-2 bg-zinc-800 text-zinc-500 border-none font-black tracking-widest uppercase">
                {course.brand}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase leading-tight">
              {course.title}
            </h1>
            {/* Deadline banner */}
            {course.endDate && !course.isCompleted && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const end = new Date(course.endDate); end.setHours(0,0,0,0);
              const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
              const endFormatted = `${end.getDate().toString().padStart(2,'0')}/${(end.getMonth()+1).toString().padStart(2,'0')}/${end.getFullYear()}`;
              if (days < 0) return (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">
                    Quá hạn từ {endFormatted} — Vui lòng hoàn thành ngay!
                  </span>
                </div>
              );
              if (days <= 2) return (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <CalendarClock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">
                    {days === 0 ? `Hết hạn hôm nay (${endFormatted})` : `Còn ${days} ngày — Hết hạn ${endFormatted}`}
                  </span>
                </div>
              );
              return (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <CalendarClock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    Thời hạn: {course.startDate ? `${new Date(course.startDate).toLocaleDateString('vi-VN')} → ` : ''}{endFormatted} (còn {days} ngày)
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Tiến độ — ẩn cho slide-only (không video, không quiz) */}
          {(hasVideo || hasQuiz) && (
            <div className="flex flex-col items-end gap-5">
              <div className="flex justify-between items-center w-full min-w-[320px] mb-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ">
                  {showQuizSection ? 'Tiến độ khóa học' : 'Tiến độ xem video'}
                </span>
                <span className="text-emerald-500 font-mono font-black text-lg ">{showQuizSection ? computedCourseProgress : videoWatchProgress}%</span>
              </div>
              <Progress value={showQuizSection ? computedCourseProgress : videoWatchProgress} className="w-[320px] h-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-zinc-900" />
            </div>
          )}
        </div>
      </header>

      <div className={showQuizSection ? "grid grid-cols-1 lg:grid-cols-2 gap-12" : "max-w-4xl mx-auto"}>
        {/* VIDEO & SLIDE ĐÀO TẠO */}
        <section className="space-y-8">
          {/* Tab Toggle — only show tabs when both video and slide exist */}
          {hasVideo && hasSlide && (
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleTabChange('video')}
                className={cn(
                  "flex items-center gap-3 transition-all",
                  activeTab === 'video' ? "text-emerald-500" : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                <MonitorPlay className="w-7 h-7" />
                <span className="text-xl font-black  uppercase tracking-wider">Video</span>
              </button>
              <button
                onClick={() => handleTabChange('slide')}
                className={cn(
                  "flex items-center gap-3 transition-all",
                  activeTab === 'slide' ? "text-emerald-500" : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                <FileText className="w-7 h-7" />
                <span className="text-xl font-black  uppercase tracking-wider">Slide</span>
              </button>
            </div>
          )}

          {/* Video Content — only render when course has video */}
          {activeTab === 'video' && hasVideo && (
            <div className="space-y-4">
              <div
                ref={iframeContainerRef}
                className={cn(
                  "aspect-video bg-black rounded-2xl overflow-hidden relative transition-all duration-500",
                  isWatching
                    ? "ring-2 ring-emerald-500/20"
                    : ""
                )}
              >
                {isDirectVideoFile ? (
                  <video
                    src={course.videoUrl}
                    className="w-full h-full"
                    controls
                    controlsList="nodownload"
                    title={course.title}
                    playsInline
                  />
                ) : (() => {
                  // YouTube cần enablejsapi=1 để IFrame API hoạt động
                  let iframeSrc = course.videoUrl || '';
                  if (isYouTube) {
                    const sep = iframeSrc.includes('?') ? '&' : '?';
                    if (!iframeSrc.includes('enablejsapi=')) {
                      iframeSrc += `${sep}enablejsapi=1`;
                    }
                    if (!iframeSrc.includes('origin=') && typeof window !== 'undefined') {
                      iframeSrc += `&origin=${window.location.origin}`;
                    }
                  }
                  return (
                    <iframe
                      src={iframeSrc}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={course.title}
                      style={{ border: 'none' }}
                    />
                  );
                })()}
                {/* Hidden focus target for focus-stealing mechanism (generic iframe) */}
                {!isDirectVideoFile && !isYouTube && (
                  <button ref={focusDummyRef} tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} />
                )}

              </div>

              {/* Video Progress Bar */}
              <div className={cn(
                "border rounded-2xl p-4 space-y-3 transition-all duration-500",
                isWatching ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/60 border-zinc-800"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className={cn("w-4 h-4 transition-colors", isWatching ? "text-emerald-400" : "text-cyan-400")} />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ">Tiến độ xem video</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isWatching ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest ">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang theo dõi
                      </span>
                    ) : videoWatchProgress > 0 && videoWatchProgress < 100 ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest ">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        Đã dừng
                      </span>
                    ) : null}
                    <span className="text-sm font-black text-cyan-400  font-mono">{videoWatchProgress}%</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${videoWatchProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider ">
                  {videoWatchProgress >= 100 || course.isCompleted
                    ? '✓ Đã hoàn thành — hệ thống tự đánh dấu khi bạn xem đủ'
                    : isWatching
                      ? `Đang xem — xem đủ ~3 phút sẽ tự hoàn thành (${Math.min(Math.round(videoWatchProgress * 6), 180)}/180s)`
                      : `Bấm vào video để xem — đủ ~3 phút sẽ tự đánh dấu hoàn thành (${Math.min(Math.round(videoWatchProgress * 6), 180)}/180s)`
                  }
                </p>
              </div>

            </div>
          )}

          {/* Slide Content — only render when course has slide */}
          {activeTab === 'slide' && hasSlide && (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
              <iframe
                src={course.slideUrl}
                className="w-full h-full"
                allow="autoplay"
                allowFullScreen
                title={`Slide - ${course.title}`}
              />
              <a
                href={course.slideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest border border-blue-400/30 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                title="Mở tài liệu ở tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở ở tab mới
              </a>
            </div>
          )}

        </section>

        {/* BÀI KIỂM TRA — ẩn với Doscom và Noma, dùng menu Kiểm tra thay thế */}
        {showQuizSection && (
          <section className="space-y-10">
            <div className="flex items-center gap-4">
              <Trophy className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black text-white  uppercase tracking-wider underline decoration-zinc-800 decoration-4 underline-offset-[12px]">Bài kiểm tra đánh giá</h2>
            </div>

            <Card className="p-12 bg-zinc-900/50 border-zinc-800 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] space-y-12 relative overflow-hidden group border-dashed hover:border-emerald-500/30 transition-all">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />

              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em]  font-mono">CHỨNG CHỈ NỘI BỘ</span>
                </div>
                <p className="text-sm font-bold text-zinc-500  leading-relaxed uppercase tracking-tight opacity-70 border-l-2 border-emerald-500/20 pl-6">Hệ thống đánh giá gồm 10 câu hỏi ngẫu nhiên. Nhân viên cần trả lời đúng tối thiểu 8/10 câu để được xét đạt. <span className="text-amber-500 font-black">
                  {quizMaxAttempts > 1 ? `Nếu chưa đạt 80 điểm, được làm lại tối đa ${quizMaxAttempts} lần; đã đạt 80 điểm trở lên thì dừng.` : 'Mỗi người chỉ được làm bài 1 lần duy nhất.'}
                </span></p>
              </div>

              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="p-6 bg-zinc-900/50 border border-zinc-700/20 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest  group-hover/stat:text-emerald-500 transition-colors">Kết quả cao nhất</p>
                  <p className="text-2xl font-black text-white  font-mono tracking-tighter">{course.lastQuizScore != null ? course.lastQuizScore : '--'} <span className="text-xs text-zinc-700">PDS</span></p>
                </div>
                <div className="p-6 bg-zinc-900/50 border border-zinc-700/20 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest  group-hover/stat:text-emerald-500 transition-colors">Số lần thực hiện</p>
                  <p className="text-2xl font-black text-white  font-mono tracking-tighter">{totalAttempts} / {quizMaxAttempts}</p>
                </div>
              </div>

              <div className="pt-4 relative z-10">
                <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-700/20 mb-8 flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-600 uppercase  tracking-widest">Trạng thái:</span>
                  <Badge
                    variant={course.isCompleted ? 'success' : hasUsedAttempt ? 'warning' : 'default'}
                    className={cn(
                      "px-4 py-1.5 font-black uppercase text-[9px]  border-none leading-none shadow-xl",
                      course.isCompleted
                        ? 'bg-emerald-500 text-white'
                        : hasUsedAttempt
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-zinc-800 text-zinc-500'
                    )}
                  >
                    {course.isCompleted
                      ? 'ĐÃ HOÀN THÀNH'
                      : alreadyPassedThreshold
                        ? 'ĐÃ ĐẠT YÊU CẦU'
                        : hasUsedAttempt
                          ? 'ĐÃ SỬ DỤNG HẾT LƯỢT'
                          : 'CHƯA LÀM BÀI'}
                  </Badge>
                </div>

                <Button
                  disabled={quizDisabled}
                  onClick={() => onStartQuiz(course.quizId)}
                  className={cn(
                    "w-full h-20 rounded-[2rem] font-black uppercase text-sm  tracking-[0.3em] transition-all flex items-center justify-center gap-5 shadow-2xl",
                    quizDisabled
                      ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 animate-pulse-slow hover:animate-none'
                  )}
                >
                  {hasUsedAttempt
                    ? 'ĐÃ HẾT LƯỢT LÀM BÀI (1/1)'
                    : 'Bắt đầu làm bài test'}
                  {!quizDisabled ? <ArrowRight className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                </Button>

                <div className="mt-8 flex items-center justify-center gap-3 opacity-60">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Kết quả được đồng bộ trực tiếp về Lark</span>
                </div>
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

interface CourseModuleProps {
  mode: 'list' | 'detail';
  courses?: Course[];
  course?: Course;
  userId?: string;
  employeeId?: string;
  onSelectCourse?: (course: Course) => void;
  onBack?: () => void;
  onStartQuiz?: (quizId?: string) => void;
  onSlideCompleted?: (courseId: string) => void;
  initialGroup?: 'product' | 'general' | 'department' | null;
}

export default function CourseModule({ mode, courses = [], course, userId = '', employeeId, onSelectCourse, onBack, onStartQuiz, onSlideCompleted, initialGroup }: CourseModuleProps) {
  if (mode === 'detail' && course) {
    return (
      <CourseDetail
        course={course}
        userId={userId}
        employeeId={employeeId}
        onBack={onBack || (() => { })}
        onStartQuiz={onStartQuiz || (() => { })}
        onSlideCompleted={onSlideCompleted}
      />
    );
  }
  return (
    <CourseCatalog
      courses={courses}
      userId={userId}
      onCourseClick={onSelectCourse || (() => { })}
      initialGroup={initialGroup}
    />
  );
}
