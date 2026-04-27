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
  Eye
} from 'lucide-react';
// Play is used in CourseCatalog, MonitorPlay/FileText in CourseDetail
import { Course, Brand } from '../../types';
import { Card, Badge, Button, Progress, cn } from '../ui';

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
  } catch {}
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
          <h1 className="text-5xl font-black tracking-tight text-white italic uppercase leading-none">KHÓA HỌC PHÁT TRIỂN</h1>
          <p className="text-emerald-500 font-black font-mono text-[10px] tracking-[0.3em] uppercase italic bg-emerald-500/5 inline-block px-4 py-1.5 rounded-full ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
             Dành riêng cho nhân sự khối vận hành Doscom
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setActiveBrand(brand as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest italic ${
                activeBrand === brand 
                  ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' 
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {courses
          .filter(c => activeBrand === 'Tất cả' || c.brand === activeBrand)
          .map((course) => {
          const videoProgress = getVideoProgress(course.id, userId);
          return (
          <Card 
            key={course.id} 
            className="group flex flex-col h-full bg-[#0C0C0E] border-zinc-900 hover:border-emerald-500/30 transition-all duration-700 rounded-[2.5rem] overflow-hidden shadow-2xl relative cursor-pointer"
            onClick={() => onCourseClick(course)}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute top-6 left-6 flex gap-3">
                <Badge variant="default" className="bg-black/80 backdrop-blur-xl text-white border-zinc-800/80 px-4 py-1.5 font-black uppercase text-[9px] tracking-widest leading-none">{course.category}</Badge>
                {course.isCompleted && <Badge className="bg-emerald-500 text-white border-none shadow-2xl font-black italic px-4 py-1.5 uppercase text-[9px] tracking-widest leading-none">HOÀN THÀNH</Badge>}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-transparent to-transparent opacity-90 transition-opacity" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-[#10B981]/10 backdrop-blur-md p-5 rounded-full border border-emerald-500/30">
                    <Play className="w-8 h-8 text-[#10B981] fill-current" />
                </div>
              </div>
            </div>

            <div className="p-8 flex flex-col flex-1 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">{course.brand}</span>
                   <div className="flex items-center gap-1.5 opacity-60">
                        <Users className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] font-black italic text-zinc-600 uppercase">942 HỌC VIÊN</span>
                   </div>
                </div>
                <h3 className="font-extrabold text-2xl text-zinc-100 leading-tight group-hover:text-emerald-400 transition-colors uppercase italic tracking-tighter line-clamp-2">
                  {course.title}
                </h3>
              </div>

              <div className="mt-auto space-y-6 pt-8 border-t border-zinc-900/50">
                {/* Video Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black italic tracking-widest uppercase">
                        <span className="text-zinc-600 italic leading-none flex items-center gap-1.5">
                          <Eye className="w-3 h-3" /> Tiến độ xem video
                        </span>
                        <span className="text-cyan-400 font-mono italic">{videoProgress}%</span>
                    </div>
                    <Progress value={videoProgress} className="h-1" />
                </div>

                {/* Training Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black italic tracking-widest uppercase">
                        <span className="text-zinc-600 italic leading-none">Tiến độ đào tạo</span>
                        <span className="text-emerald-500 font-mono italic underline decoration-emerald-500/30 underline-offset-4 decoration-2">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-1.5" />
                </div>

                <Button variant={course.isCompleted ? 'outline' : 'primary'} className={`w-full text-[11px] font-black h-14 uppercase tracking-widest rounded-2xl group/btn italic ${course.isCompleted ? 'border-zinc-800 text-emerald-500 hover:bg-emerald-500 hover:text-white mt-2' : 'mt-2'}`}>
                    {course.isCompleted ? 'Xem lại bài học' : course.progress > 0 ? 'Tiếp tục học tập' : 'Bắt đầu ngay'}
                    <ArrowRight className="w-4 h-4 ml-3 group-hover/btn:translate-x-2 transition-transform" />
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
  onBack: () => void;
  onStartQuiz: (quizId?: string) => void;
}

export const CourseDetail = ({ course, userId, onBack, onStartQuiz }: CourseDetailProps) => {
  const [activeTab, setActiveTab] = React.useState<'video' | 'slide'>('video');

  // ── Udemy-style Video Progress Tracking ────────────────────────────────
  // Supports both:
  // - HTML5 <video> (Supabase Storage .mp4): uses timeupdate for accurate progress
  // - <iframe> (Google Drive): uses focus-polling for approximate progress
  const [videoWatchProgress, setVideoWatchProgress] = React.useState(() => getVideoProgress(course.id, userId));
  const [isWatching, setIsWatching] = React.useState(false);
  const videoTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeContainerRef = React.useRef<HTMLDivElement>(null);

  const isDirectVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(course.videoUrl || '');
  const VIDEO_TOTAL_SECONDS = 600;

  // Native <video> progress tracking via timeupdate
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

  // Iframe focus-polling (fallback for Google Drive embeds)
  React.useEffect(() => {
    if (activeTab !== 'video' || !course.videoUrl || isDirectVideoFile) {
      if (!isDirectVideoFile) setIsWatching(false);
      return;
    }

    const pollInterval = setInterval(() => {
      const activeEl = document.activeElement;
      const iframeEl = iframeContainerRef.current?.querySelector('iframe');
      if (!iframeEl) return;

      const iframeFocused = activeEl === iframeEl;
      const pageVisible = !document.hidden;
      setIsWatching(iframeFocused && pageVisible);
    }, 500);

    return () => clearInterval(pollInterval);
  }, [activeTab, course.videoUrl, isDirectVideoFile]);

  // Timer: only increments when isWatching is true (for iframe mode)
  React.useEffect(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    // Skip timer for native video — progress comes from timeupdate events
    if (!isWatching || isDirectVideoFile) return;

    videoTimerRef.current = setInterval(() => {
      setVideoWatchProgress(prev => {
        if (prev >= 100) return 100;
        const newProg = Math.min(100, prev + Math.round((3 / VIDEO_TOTAL_SECONDS) * 100));
        setVideoProgress(course.id, newProg, userId);
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

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <header className="flex flex-col gap-8">
        <button onClick={onBack} className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all italic underline underline-offset-8 decoration-zinc-800">
          QUAY LẠI KHÓA HỌC
        </button>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-zinc-900 pb-12">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Badge variant="success" className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border-none font-black italic tracking-widest uppercase">
                        KHỐI ĐÀO TẠO
                    </Badge>
                    <Badge className="px-6 py-2 bg-zinc-800 text-zinc-500 border-none font-black tracking-widest uppercase">
                        {course.brand}
                    </Badge>
                </div>
                <h1 className="text-6xl font-black tracking-tighter text-white italic uppercase leading-tight">
                    {course.title}
                </h1>
            </div>
            
            <div className="flex flex-col items-end gap-5">
                <div className="flex justify-between items-center w-full min-w-[320px] mb-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] italic">Tiến độ khóa học</span>
                    <span className="text-emerald-500 font-mono font-black text-lg italic">{course.progress}%</span>
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
                <span className="text-xl font-black italic uppercase tracking-wider">Video</span>
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
                  <span className="text-xl font-black italic uppercase tracking-wider">Slide</span>
                </button>
              )}
            </div>

            {/* Video Content */}
            {activeTab === 'video' && (
              <div className="space-y-4">
                <div
                  ref={iframeContainerRef}
                  className={cn(
                    "aspect-video bg-black rounded-[2.5rem] border-2 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative ring-1 transition-all duration-500",
                    isWatching
                      ? "border-emerald-500/40 ring-emerald-500/30"
                      : "border-zinc-900 ring-emerald-500/10"
                  )}
                >
                  {course.videoUrl ? (
                    /\.(mp4|webm|ogg)(\?.*)?$/i.test(course.videoUrl) ? (
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
                        <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest italic">Chưa có video đào tạo</p>
                      </div>
                    </div>
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
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Tiến độ xem video</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isWatching ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang xem
                        </span>
                      ) : videoWatchProgress > 0 && videoWatchProgress < 100 ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          Tạm dừng
                        </span>
                      ) : null}
                      <span className="text-sm font-black text-cyan-400 italic font-mono">{videoWatchProgress}%</span>
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
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider italic">
                    {videoWatchProgress >= 100 
                      ? '✓ Bạn đã xem hoàn tất video đào tạo' 
                      : isWatching 
                        ? 'Đang theo dõi tiến độ xem video...'
                        : 'Bấm vào video để phát — hệ thống tự động theo dõi khi bạn xem'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Slide Content */}
            {activeTab === 'slide' && course.slideUrl && (
              <div className="aspect-video bg-black rounded-[2.5rem] border-2 border-zinc-900 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative ring-1 ring-emerald-500/10">
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
                <h2 className="text-3xl font-black text-white italic uppercase tracking-wider underline decoration-zinc-800 decoration-4 underline-offset-[12px]">Bài kiểm tra đánh giá</h2>
            </div>
            
            <Card className="p-12 bg-zinc-900/50 border-zinc-800 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] space-y-12 relative overflow-hidden group border-dashed hover:border-emerald-500/30 transition-all">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
                
                <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-5 h-5 text-emerald-500" />
                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] italic font-mono">CHỨNG CHỈ NỘI BỘ</span>
                    </div>
                    <p className="text-sm font-bold text-zinc-500 italic leading-relaxed uppercase tracking-tight opacity-70 border-l-2 border-emerald-500/20 pl-6">Hệ thống đánh giá gồm 10 câu hỏi ngẫu nhiên. Nhân viên cần trả lời đúng tối thiểu 8/10 câu để được xét đạt. <span className="text-amber-500 font-black">Mỗi người chỉ được làm bài 1 lần duy nhất.</span></p>
                </div>

                <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all shadow-inner">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic group-hover/stat:text-emerald-500 transition-colors">Kết quả cao nhất</p>
                        <p className="text-2xl font-black text-white italic font-mono tracking-tighter">{course.lastQuizScore || '--'} <span className="text-xs text-zinc-700">PDS</span></p>
                    </div>
                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2 group/stat hover:border-emerald-500/30 transition-all shadow-inner">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic group-hover/stat:text-emerald-500 transition-colors">Số lần thực hiện</p>
                        <p className="text-2xl font-black text-white italic font-mono tracking-tighter">{totalAttempts} / 1</p>
                    </div>
                </div>

                <div className="pt-4 relative z-10">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 mb-8 flex items-center justify-between">
                         <span className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest">Trạng thái:</span>
                         <Badge variant={course.isCompleted ? 'success' : hasUsedAttempt ? 'warning' : 'default'} className={cn("px-4 py-1.5 font-black uppercase text-[9px] italic border-none leading-none shadow-xl", course.isCompleted ? 'bg-emerald-500 text-white' : hasUsedAttempt ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-500')}>
                             {course.isCompleted ? 'ĐÃ HOÀN THÀNH' : hasUsedAttempt ? 'ĐÃ SỬ DỤNG HẾT LƯỢT' : 'CHƯA LÀM BÀI'}
                         </Badge>
                    </div>

                    <Button 
                        disabled={hasUsedAttempt}
                        onClick={() => onStartQuiz(course.quizId)}
                        className={cn(
                            "w-full h-20 rounded-[2rem] font-black uppercase text-sm italic tracking-[0.3em] transition-all flex items-center justify-center gap-5 shadow-2xl",
                            hasUsedAttempt
                                ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 animate-pulse-slow hover:animate-none'
                        )}
                    >
                        {hasUsedAttempt ? 'ĐÃ HẾT LƯỢT LÀM BÀI (1/1)' : 'Bắt đầu làm bài test'}
                        <ArrowRight className="w-6 h-6" />
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
  onSelectCourse?: (course: Course) => void;
  onBack?: () => void;
  onStartQuiz?: (quizId?: string) => void;
}

export default function CourseModule({ mode, courses = [], course, userId = '', onSelectCourse, onBack, onStartQuiz }: CourseModuleProps) {
  if (mode === 'detail' && course) {
    return (
      <CourseDetail
        course={course}
        userId={userId}
        onBack={onBack || (() => {})}
        onStartQuiz={onStartQuiz || (() => {})}
      />
    );
  }
  return (
    <CourseCatalog
      courses={courses}
      userId={userId}
      onCourseClick={onSelectCourse || (() => {})}
    />
  );
}
