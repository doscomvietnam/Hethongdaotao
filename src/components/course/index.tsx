import * as React from 'react';
import { motion } from 'motion/react';
import {
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
  MonitorPlay,
  Trophy,
  Users,
  FileText,
  Eye,
  Lock,
} from 'lucide-react';
import { Course, Brand } from '../../types';
import { Card, Badge, Button, Progress, cn } from '../ui';
import { upsertVideoProgress } from '../../services/trainingProgressService';

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

// ─── Course Catalog ─────────────────────────────────────────────────────────

interface CourseCatalogProps {
  courses: Course[];
  userId: string;
  onCourseClick: (course: Course) => void;
}

export const CourseCatalog = ({ courses, userId, onCourseClick }: CourseCatalogProps) => {
  const [activeBrand, setActiveBrand] = React.useState<Brand | 'Tất cả'>('Tất cả');
  const brands: (Brand | 'Tất cả')[] = ['Tất cả', 'Doscom', 'Noma', 'Nội bộ'];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tight text-white  uppercase leading-none">KHÓA HỌC PHÁT TRIỂN</h1>
          <p className="text-emerald-500 font-black font-mono text-[10px] tracking-[0.3em] uppercase  bg-emerald-500/5 inline-block px-4 py-1.5 rounded-full ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            Dành riêng cho nhân sự khối vận hành Doscom
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setActiveBrand(brand as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest  ${activeBrand === brand
                  ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                  : 'text-zinc-600 hover:text-zinc-300'
                }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses
          .filter(c => activeBrand === 'Tất cả' || c.brand === activeBrand)
          .map((course) => {
            const videoProgress = Math.max(getVideoProgress(course.id, userId), course.videoProgress || 0);
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
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <span className="inline-block backdrop-blur-xl px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none border" style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.1)' }}>{course.category}</span>
                    {course.isCompleted && <span className="inline-block px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest leading-none shadow-2xl" style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>HOÀN THÀNH</span>}
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
                    {/* Video Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-black  tracking-widest uppercase">
                        <span className="text-zinc-600  leading-none flex items-center gap-1.5">
                          <Eye className="w-3 h-3" /> Tiến độ xem video
                        </span>
                        <span className="text-cyan-400 font-mono ">{videoProgress}%</span>
                      </div>
                      <Progress value={videoProgress} className="h-1" />
                    </div>

                    {/* Training Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-black  tracking-widest uppercase">
                        <span className="text-zinc-600  leading-none">Tiến độ đào tạo</span>
                        <span className="text-emerald-500 font-mono ">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-1.5" />
                    </div>

                    <Button variant={course.isCompleted ? 'outline' : 'primary'} className={`w-full text-[10px] font-black h-12 uppercase tracking-widest rounded-xl group/btn  ${course.isCompleted ? 'border-zinc-800 text-emerald-500 hover:bg-emerald-500 hover:text-white' : ''}`}>
                      {course.isCompleted ? 'Xem lại bài học' : course.progress > 0 ? 'Tiếp tục học tập' : 'Bắt đầu ngay'}
                      <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
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
}

export const CourseDetail = ({ course, userId, employeeId, onBack, onStartQuiz }: CourseDetailProps) => {
  const [activeTab, setActiveTab] = React.useState<'video' | 'slide'>('video');

  // ── Video Progress Tracking ────────────────────────────────────────────
  const [videoWatchProgress, setVideoWatchProgress] = React.useState(() => Math.max(getVideoProgress(course.id, userId), course.videoProgress || 0));
  const [isWatching, setIsWatching] = React.useState(false);
  const videoTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeContainerRef = React.useRef<HTMLDivElement>(null);
  const supabaseSyncRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusDummyRef = React.useRef<HTMLButtonElement>(null);
  const programmaticFocusRef = React.useRef(false);

  const isDirectVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(course.videoUrl || '');
  const VIDEO_TOTAL_SECONDS = 600;

  // ── Sync video progress to Supabase (debounced) ────────────────────────
  const syncToSupabase = React.useCallback((progress: number) => {
    if (!employeeId) return;
    if (supabaseSyncRef.current) clearTimeout(supabaseSyncRef.current);
    supabaseSyncRef.current = setTimeout(() => {
      upsertVideoProgress(employeeId, course.id, progress);
    }, 2000);
  }, [employeeId, course.id]);

  // ── Native <video> progress tracking via timeupdate ────────────────────
  React.useEffect(() => {
    if (activeTab !== 'video' || !course.videoUrl || !isDirectVideoFile) return;

    const container = iframeContainerRef.current;
    if (!container) return;

    const videoEl = container.querySelector('video');
    if (!videoEl) return;

    const handleTimeUpdate = () => {
      if (videoEl.duration && videoEl.duration > 0) {
        const pct = Math.round((videoEl.currentTime / videoEl.duration) * 100);
        setVideoWatchProgress(prev => {
          const newProg = Math.max(prev, pct);
          setVideoProgress(course.id, newProg, userId);
          return newProg;
        });
      }
    };
    const handlePlay = () => setIsWatching(true);
    const handlePause = () => setIsWatching(false);
    const handleEnded = () => {
      setIsWatching(false);
      setVideoWatchProgress(100);
      setVideoProgress(course.id, 100, userId);
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [activeTab, course.videoUrl, course.id, isDirectVideoFile]);

  // ── ALL iframe videos: blur/focus toggle with focus stealing ───────────
  // Each click on the iframe toggles tracking ON/OFF.
  // After detecting a click (via window blur), we steal focus back so the
  // NEXT click on the iframe also triggers a new blur event.
  // This keeps tracking in sync with the video's play/pause state.
  React.useEffect(() => {
    if (isDirectVideoFile || activeTab !== 'video' || !course.videoUrl) return;

    const handleWindowBlur = () => {
      setTimeout(() => {
        const iframeEl = iframeContainerRef.current?.querySelector('iframe');
        if (iframeEl && document.activeElement === iframeEl) {
          // Toggle tracking (each click = play/pause in iframe)
          setIsWatching(prev => !prev);
          // Steal focus back so next click triggers another blur event
          setTimeout(() => {
            programmaticFocusRef.current = true;
            focusDummyRef.current?.focus();
            setTimeout(() => { programmaticFocusRef.current = false; }, 200);
          }, 400);
        }
      }, 100);
    };

    const handleWindowFocus = () => {
      // Ignore our own programmatic focus stealing
      if (programmaticFocusRef.current) return;
      // User clicked outside iframe → stop tracking
      setIsWatching(false);
    };

    const handleVisibility = () => {
      if (document.hidden) setIsWatching(false);
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isDirectVideoFile, activeTab, course.videoUrl]);

  // Stop tracking when switching content tabs
  React.useEffect(() => {
    if (activeTab !== 'video') setIsWatching(false);
  }, [activeTab]);

  // Timer: only increments when isWatching is true (for iframe mode)
  React.useEffect(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (!isWatching || isDirectVideoFile) return;

    videoTimerRef.current = setInterval(() => {
      setVideoWatchProgress(prev => {
        if (prev >= 100) return 100;
        const newProg = Math.min(100, prev + Math.round((3 / VIDEO_TOTAL_SECONDS) * 100));
        setVideoProgress(course.id, newProg, userId);
        syncToSupabase(newProg);
        return newProg;
      });
    }, 3000);

    return () => {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };
  }, [isWatching, course.id, isDirectVideoFile]);

  const handleTabChange = (tab: 'video' | 'slide') => {
    setActiveTab(tab);
  };

  // ── Quiz Attempts from localStorage ──────────────────────────────────
  const localAttempts = getQuizAttempts(course.id, userId);
  const totalAttempts = Math.max(course.attempts, localAttempts);
  const hasUsedAttempt = totalAttempts >= 1;

  // ── Quiz access (video gate removed) ────────────────────────────────
  const videoGatePassed = true;
  const quizDisabled = hasUsedAttempt;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <header className="flex flex-col gap-8">
        <button onClick={onBack} className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all  underline underline-offset-8 decoration-zinc-800">
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
            <h1 className="text-6xl font-black tracking-tighter text-white  uppercase leading-tight">
              {course.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-5">
            <div className="flex justify-between items-center w-full min-w-[320px] mb-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ">Tiến độ khóa học</span>
              <span className="text-emerald-500 font-mono font-black text-lg ">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="w-[320px] h-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-zinc-900" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* VIDEO & SLIDE ĐÀO TẠO */}
        <section className="space-y-8">
          {/* Tab Toggle */}
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
            {course.slideUrl && (
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
            )}
          </div>

          {/* Video Content */}
          {activeTab === 'video' && (
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
                {course.videoUrl ? (
                  isDirectVideoFile ? (
                    <video
                      src={course.videoUrl}
                      className="w-full h-full"
                      controls
                      controlsList="nodownload"
                      title={course.title}
                      playsInline
                    />
                  ) : (
                    <iframe
                      src={course.videoUrl}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={course.title}
                      style={{ border: 'none' }}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <MonitorPlay className="w-16 h-16 text-zinc-700 mx-auto" />
                      <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest ">Chưa có video đào tạo</p>
                    </div>
                  </div>
                )}
                {/* Hidden focus target for focus-stealing mechanism */}
                <button ref={focusDummyRef} tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} />
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
                  {videoWatchProgress >= 100
                    ? '✓ Bạn đã xem hoàn tất video đào tạo'
                    : isWatching
                      ? 'Đang theo dõi — click vào video để dừng'
                      : 'Click vào video để bắt đầu theo dõi'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Slide Content */}
          {activeTab === 'slide' && course.slideUrl && (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
              <iframe
                src={course.slideUrl}
                className="w-full h-full"
                allow="autoplay"
                allowFullScreen
                title={`Slide - ${course.title}`}
              />
            </div>
          )}
        </section>

        {/* BÀI KIỂM TRA */}
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
              <p className="text-sm font-bold text-zinc-500  leading-relaxed uppercase tracking-tight opacity-70 border-l-2 border-emerald-500/20 pl-6">Hệ thống đánh giá gồm 10 câu hỏi ngẫu nhiên. Nhân viên cần trả lời đúng tối thiểu 8/10 câu để được xét đạt. <span className="text-amber-500 font-black">Mỗi người chỉ được làm bài 1 lần duy nhất.</span></p>

            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="p-6 bg-zinc-900/50 border border-zinc-700/20 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest  group-hover/stat:text-emerald-500 transition-colors">Kết quả cao nhất</p>
                <p className="text-2xl font-black text-white  font-mono tracking-tighter">{course.lastQuizScore != null && course.lastQuizScore > 0 ? course.lastQuizScore : '--'} <span className="text-xs text-zinc-700">PDS</span></p>
              </div>
              <div className="p-6 bg-zinc-900/50 border border-zinc-700/20 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest  group-hover/stat:text-emerald-500 transition-colors">Số lần thực hiện</p>
                <p className="text-2xl font-black text-white  font-mono tracking-tighter">{totalAttempts} / 1</p>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-700/20 mb-8 flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-600 uppercase  tracking-widest">Trạng thái:</span>
                <Badge variant={course.isCompleted ? 'success' : hasUsedAttempt ? 'warning' : 'default'} className={cn("px-4 py-1.5 font-black uppercase text-[9px]  border-none leading-none shadow-xl", course.isCompleted ? 'bg-emerald-500 text-white' : hasUsedAttempt ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-500')}>
                  {course.isCompleted ? 'ĐÃ HOÀN THÀNH' : hasUsedAttempt ? 'ĐÃ SỬ DỤNG HẾT LƯỢT' : 'CHƯA LÀM BÀI'}
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
                {hasUsedAttempt ? 'ĐÃ HẾT LƯỢT LÀM BÀI (1/1)' : 'Bắt đầu làm bài test'}
                {!quizDisabled ? <ArrowRight className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </Button>

              <div className="mt-8 flex items-center justify-center gap-3 opacity-60">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Kết quả được đồng bộ trực tiếp về Lark</span>
              </div>
            </div>
          </Card>
        </section>
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
}

export default function CourseModule({ mode, courses = [], course, userId = '', employeeId, onSelectCourse, onBack, onStartQuiz }: CourseModuleProps) {
  if (mode === 'detail' && course) {
    return (
      <CourseDetail
        course={course}
        userId={userId}
        employeeId={employeeId}
        onBack={onBack || (() => { })}
        onStartQuiz={onStartQuiz || (() => { })}
      />
    );
  }
  return (
    <CourseCatalog
      courses={courses}
      userId={userId}
      onCourseClick={onSelectCourse || (() => { })}
    />
  );
}
