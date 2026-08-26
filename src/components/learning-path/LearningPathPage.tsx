import * as React from 'react';
import { Check } from 'lucide-react';
import type { Course, Employee } from '../../types';
import { supabase } from '../../services/supabaseClient';
import {
  SEQUENTIAL_PATH_BRANDS,
  sortByLessonNumber,
  computeLockedLessonIds,
} from '../../services/sequentialCourseHelpers';

interface LearningPathPageProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
  employee: Employee;
  onOpenQuiz?: (course: Course) => void;   // mở bài kiểm tra "hộp quà" cuối lộ trình
}

// Độ lệch ngang zig-zag cho con đường uốn lượn (lặp lại)
const OFFSETS = [0, 44, 26, -26, -44, -26, 26, 44];

// Giá trị trong cột department nhưng KHÔNG phải phòng ban (chức danh) → không hiện ở tab Phòng ban
const NON_DEPARTMENTS = ['Chủ tịch'];

function lessonTitle(title: string): string {
  return title.replace(/^Bài\s+\d+\s*[:.]\s*/i, '').replace(/^Khóa học về\s+/i, '');
}
// Nhãn "Bài X" (Bài chia nhiều Phần thì các Phần cùng nhãn Bài X)
function baiLabel(title: string): string {
  const m = title.match(/^(Bài\s+\d+)/i);
  return m ? m[1] : '';
}

// ── Con đường uốn lượn (đo tâm node → vẽ đường nối chấm) ─────────────────────
interface WindingPathProps {
  courses: Course[];
  lockedIds: Set<string>;
  allDone: boolean;
  viewOnly: boolean;
  onOpenCourse: (id: string) => void;
  onOpenChest: () => void;
  quizCourse: Course | null;               // bài cuối có gắn bài kiểm tra (nếu có)
  onOpenQuiz?: (course: Course) => void;    // mở bài kiểm tra từ hộp quà
}
function WindingPath({ courses, lockedIds, allDone, viewOnly, onOpenCourse, onOpenChest, quizCourse, onOpenQuiz }: WindingPathProps) {
  const pathRef = React.useRef<HTMLDivElement>(null);
  const capRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [pathD, setPathD] = React.useState('');

  React.useLayoutEffect(() => {
    const cont = pathRef.current;
    if (!cont) return;
    const measure = () => {
      const cr = cont.getBoundingClientRect();
      const keys = [...courses.map(c => c.id), '__chest__'];
      const pts = keys
        .map(k => capRefs.current.get(k))
        .filter((el): el is HTMLElement => Boolean(el))
        .map(el => {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top };
        });
      if (pts.length < 2) { setPathD(''); return; }
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], c = pts[i], my = (p.y + c.y) / 2;
        d += ` C ${p.x} ${my}, ${c.x} ${my}, ${c.x} ${c.y}`;
      }
      setPathD(d);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(cont);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [courses]);

  const chestOff = OFFSETS[courses.length % OFFSETS.length];

  return (
    <div className="lp-path" ref={pathRef}>
      <svg className="lp-svg" aria-hidden="true">
        <path d={pathD} className="lp-conn" />
      </svg>
      {courses.map((c, i) => {
        const locked = lockedIds.has(c.id);
        const state: 'done' | 'cur' | 'lock' = c.isCompleted ? 'done' : locked ? 'lock' : 'cur';
        const off = OFFSETS[i % OFFSETS.length];
        const num = i + 1; // số thứ tự xem trong khóa nhỏ (1→N)
        return (
          <div key={c.id} className="lp-row" style={{ transform: `translateX(${off}px)` }}>
            <button
              className={`lp-node lp-${state}`}
              disabled={locked || viewOnly}
              onClick={() => { if (!locked && !viewOnly) onOpenCourse(c.id); }}
              title={c.title}
            >
              {state === 'cur' && <span className="lp-badge">Bắt đầu</span>}
              <span
                className="lp-cap"
                ref={el => { if (el) capRefs.current.set(c.id, el); else capRefs.current.delete(c.id); }}
              >
                {state === 'done' ? <Check className="lp-check" strokeWidth={3.5} /> : num}
              </span>
            </button>
            <div className={`lp-label ${locked ? 'lp-mut' : ''}`}>
              <span className="lp-bai">{baiLabel(c.title) || `Bước ${num}`}</span>
              <span className="lp-ttl">{lessonTitle(c.title)}</span>
            </div>
          </div>
        );
      })}

      {/* Rương phần thưởng cuối lộ trình */}
      <div className="lp-row" style={{ transform: `translateX(${chestOff}px)` }}>
        <button
          className={`lp-node lp-chest ${allDone ? 'lp-chest-on' : 'lp-chest-off'}`}
          disabled={!allDone || viewOnly}
          onClick={() => {
            if (!allDone || viewOnly) return;
            if (quizCourse && onOpenQuiz) onOpenQuiz(quizCourse);
            else onOpenChest();
          }}
          title={!allDone ? 'Hoàn thành hết các bài để mở' : (quizCourse ? 'Làm bài kiểm tra cuối' : 'Mở rương phần thưởng')}
        >
          <span className="lp-cap" ref={el => { if (el) capRefs.current.set('__chest__', el); else capRefs.current.delete('__chest__'); }}>{quizCourse ? '📝' : '🎁'}</span>
        </button>
        <div className={`lp-label ${allDone ? '' : 'lp-mut'}`}>
          <span className="lp-bai">{allDone ? (quizCourse ? 'Bài kiểm tra' : 'Phần thưởng') : 'Chốt lộ trình'}</span>
          <span className="lp-ttl">{allDone ? (quizCourse ? 'Làm bài kiểm tra cuối' : 'Mở rương ăn mừng!') : (quizCourse ? 'Hoàn thành hết bài để mở bài kiểm tra' : 'Hoàn thành hết bài để mở')}</span>
        </div>
      </div>
    </div>
  );
}

export default function LearningPathPage({ courses, onCourseClick, employee, onOpenQuiz }: LearningPathPageProps) {
  // Các course_id có bài kiểm tra (để hộp quà cuối lộ trình biến thành nút làm bài)
  const [quizCourseIds, setQuizCourseIds] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('quizzes').select('course_id').eq('status', 'active');
      if (alive && data) setQuizCourseIds(new Set(data.map((r: any) => r.course_id).filter(Boolean)));
    })();
    return () => { alive = false; };
  }, []);
  // Chỉ admin xem được tất cả phòng (có tab chọn phòng); manager & nhân viên chỉ thấy phòng của mình.
  const isAdmin = employee.role === 'admin';

  // Phòng ban (admin/manager xem trước từng phòng)
  const [depts, setDepts] = React.useState<string[]>([]);
  const [selectedDept, setSelectedDept] = React.useState<string>(employee.department || '');
  React.useEffect(() => {
    if (!isAdmin) return;
    supabase.from('employees').select('department').then(({ data }) => {
      const set = new Set<string>();
      (data || []).forEach((r: any) => { if (r.department && !NON_DEPARTMENTS.includes(r.department)) set.add(r.department); });
      setDepts(Array.from(set).sort((a, b) => a.localeCompare(b, 'vi')));
    });
  }, [isAdmin]);

  // Admin mặc định làm lộ trình của CHÍNH phòng mình; xem phòng khác qua tab thì chỉ để xem (không làm).
  const ownDept = employee.department || '';
  const isViewOnly = isAdmin && selectedDept !== ownDept;

  // Admin: lọc theo phòng đang chọn ở tab. Manager/nhân viên: chỉ phòng của chính mình.
  const visibleCourses = React.useMemo(
    () => (isAdmin
      ? courses.filter(c => !c.department || c.department === selectedDept)
      : courses.filter(c => !c.department || c.department === ownDept)),
    [courses, isAdmin, selectedDept, ownDept],
  );

  // Bộ khóa tuần tự (brand) có trong phòng này (Sale, CEO...)
  const seriesBrands = React.useMemo(
    () => SEQUENTIAL_PATH_BRANDS.filter(b => visibleCourses.some(c => c.brand === b)),
    [visibleCourses],
  );
  const [selectedSeries, setSelectedSeries] = React.useState<string>('');
  const activeSeries = seriesBrands.includes(selectedSeries) ? selectedSeries : seriesBrands[0] || '';

  // Khóa nhỏ (category) trong bộ đang chọn — sắp theo mã khóa nhỏ nhất của mỗi khóa nhỏ
  const subCourses = React.useMemo(() => {
    const minId = new Map<string, string>();
    for (const c of visibleCourses) {
      if (c.brand !== activeSeries) continue;
      const cat = c.category || '';
      const cur = minId.get(cat);
      if (cur === undefined || c.id.localeCompare(cur, undefined, { numeric: true }) < 0) minId.set(cat, c.id);
    }
    return Array.from(minId.entries())
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
      .map(([cat]) => cat);
  }, [visibleCourses, activeSeries]);
  const [selectedSub, setSelectedSub] = React.useState<string>('');
  const activeSub = subCourses.includes(selectedSub) ? selectedSub : subCourses[0] || '';

  const pathCourses = React.useMemo(
    () => sortByLessonNumber(
      visibleCourses.filter(c => c.brand === activeSeries && (subCourses.length <= 1 || c.category === activeSub)),
    ),
    [visibleCourses, activeSeries, subCourses.length, activeSub],
  );
  const lockedIds = React.useMemo(() => computeLockedLessonIds(visibleCourses), [visibleCourses]);

  const total = pathCourses.length;
  const doneCount = pathCourses.filter(c => c.isCompleted).length;
  const pct = total ? Math.round(doneCount / total * 100) : 0;
  const allDone = total > 0 && doneCount === total;
  // Bài kiểm tra "hộp quà" cuối lộ trình: quiz có trong bảng quizzes NHƯNG
  // KHÔNG gắn vào courses.quiz_id (để phân biệt với quiz theo từng bài như khóa Sale).
  const quizCourse = React.useMemo(
    () => pathCourses.find(c => quizCourseIds.has(c.id) && !c.quizId) || null,
    [pathCourses, quizCourseIds],
  );

  // Chúc mừng theo đúng khóa nhỏ/bộ đang học; chỉ Sale thực chiến có huy hiệu riêng.
  const celebrateLabel = subCourses.length > 1 ? activeSub : activeSeries;
  const celebrateHasBadge = activeSeries === SEQUENTIAL_PATH_BRANDS[0];

  const [showCelebrate, setShowCelebrate] = React.useState(false);

  const handleOpen = (id: string) => {
    const c = pathCourses.find(x => x.id === id);
    if (c) onCourseClick(c);
  };

  return (
    <div className="lp-root">
      <style>{LP_CSS}</style>

      {/* Bộ lọc: Phòng ban (admin) + Khóa học */}
      {isAdmin && depts.length > 0 && (
        <div className="lp-filter">
          <span className="lp-flabel">Phòng ban</span>
          <div className="lp-chips">
            {depts.map(d => (
              <button key={d} className={`lp-dept ${d === selectedDept ? 'on' : ''}`} onClick={() => setSelectedDept(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {seriesBrands.length > 0 && (
        <div className="lp-filter">
          <span className="lp-flabel">Khóa học</span>
          <div className="lp-chips">
            {seriesBrands.map(b => (
              <button key={b} className={`lp-course ${b === activeSeries ? 'on' : ''}`} onClick={() => { setSelectedSeries(b); setSelectedSub(''); }}>
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {subCourses.length > 1 && (
        <div className="lp-filter">
          <span className="lp-flabel">Khóa nhỏ</span>
          <div className="lp-chips">
            {subCourses.map(sc => (
              <button key={sc} className={`lp-sub ${sc === activeSub ? 'on' : ''}`} onClick={() => setSelectedSub(sc)}>
                {sc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thanh tiến độ chuỗi */}
      {total > 0 && (
        <div className="lp-progress">
          <div className="lp-pbar"><span style={{ width: `${pct}%` }} /></div>
          <div className="lp-pmeta"><b>{doneCount}/{total}</b> bài · {pct}%</div>
        </div>
      )}

      {/* Con đường */}
      {total > 0 ? (
        <WindingPath
          courses={pathCourses}
          lockedIds={lockedIds}
          allDone={allDone}
          viewOnly={isViewOnly}
          onOpenCourse={handleOpen}
          onOpenChest={() => setShowCelebrate(true)}
          quizCourse={quizCourse}
          onOpenQuiz={onOpenQuiz}
        />
      ) : (
        <div className="lp-empty">
          {isAdmin
            ? 'Phòng ban này chưa có lộ trình học tuần tự.'
            : 'Chưa có lộ trình học nào cho bạn.'}
        </div>
      )}

      {/* Chúc mừng hoàn thành lộ trình */}
      {showCelebrate && (
        <div className="lp-cele" onClick={() => setShowCelebrate(false)}>
          <div className="lp-confetti" aria-hidden="true">
            {['🎉','🎊','⭐','🏅','✨','🎈','🎉','⭐','🎊','✨','🏅','🎈'].map((e, i) => (
              <span key={i} style={{ left: `${(i * 8.3) % 100}%`, animationDelay: `${(i % 6) * 0.25}s` }}>{e}</span>
            ))}
          </div>
          <div className="lp-cele-card" onClick={e => e.stopPropagation()}>
            <div className="lp-cele-badge">🏅</div>
            <div className="lp-cele-title">Chinh phục {celebrateLabel}!</div>
            <div className="lp-cele-sub">Bạn đã hoàn thành cả {total} bài của lộ trình 🎉</div>
            {celebrateHasBadge && (
              <div className="lp-cele-reward">Huy hiệu <b>“Chinh phục {celebrateLabel}” 🏅</b> đã mở — xem ở mục Huy hiệu.</div>
            )}
            <button className="lp-cele-btn" onClick={() => setShowCelebrate(false)}>Tuyệt vời!</button>
          </div>
        </div>
      )}
    </div>
  );
}

const LP_CSS = `
.lp-root{
  --lp-bg:#F7F8FB; --lp-ink:#1E293B; --lp-muted:#64748B; --lp-faint:#B6C0CE;
  --lp-orange:#FF7A18; --lp-orange-deep:#E15E00; --lp-on-orange:#3B1B00;
  --lp-lock:#FFFFFF; --lp-lock-ring:#E2E8F0; --lp-lock-num:#94A3B8;
  background:var(--lp-bg); border-radius:26px; padding:26px 20px 60px; min-height:70vh;
  font-family:"Nunito",ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--lp-ink);
}
.lp-filter{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
.lp-flabel{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--lp-muted);min-width:82px;}
.lp-chips{display:flex;gap:8px;flex-wrap:wrap;}
.lp-dept{font-size:12px;font-weight:800;padding:8px 15px;border-radius:999px;background:#fff;border:1.5px solid var(--lp-lock-ring);color:var(--lp-ink);cursor:pointer;font-family:inherit;transition:all .15s;}
.lp-dept:hover{border-color:#CBD5E1;}
.lp-dept.on{background:#111827;border-color:#111827;color:#fff;}
.lp-course{font-size:12px;font-weight:900;letter-spacing:.02em;text-transform:uppercase;padding:9px 18px;border-radius:999px;background:#fff;border:2px solid var(--lp-lock-ring);color:var(--lp-muted);cursor:pointer;font-family:inherit;transition:all .15s;}
.lp-course:hover{border-color:#CBD5E1;}
.lp-course.on{background:#EAFBF6;border-color:#34D399;color:var(--lp-orange-deep);}
.lp-sub{font-size:12px;font-weight:800;padding:8px 15px;border-radius:999px;background:#fff;border:1.5px solid var(--lp-lock-ring);color:var(--lp-ink);cursor:pointer;transition:all .15s;}
.lp-sub:hover{border-color:#CBD5E1;}
.lp-sub.on{background:#FF7A18;border-color:#FF7A18;color:#3B1B00;}

.lp-progress{display:flex;align-items:center;gap:14px;max-width:520px;margin:6px auto 8px;}
.lp-pbar{flex:1;height:12px;border-radius:20px;background:#E7ECF3;overflow:hidden;}
.lp-pbar span{display:block;height:100%;border-radius:20px;background:linear-gradient(90deg,#FFB44D,var(--lp-orange));transition:width .6s ease;}
.lp-pmeta{font-size:12px;font-weight:800;color:var(--lp-muted);white-space:nowrap;}
.lp-pmeta b{color:var(--lp-orange-deep);}

.lp-path{position:relative;padding:34px 0 6px;max-width:520px;margin:0 auto;}
.lp-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0;}
.lp-conn{fill:none;stroke:#CBD5E1;stroke-width:6;stroke-linecap:round;stroke-dasharray:0.1 15;}

.lp-row{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;margin:0 0 34px;transition:transform .3s;}
.lp-node{position:relative;border:none;background:transparent;padding:0;cursor:pointer;}
.lp-node[disabled]{cursor:default;}
.lp-cap{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;transition:transform .12s,box-shadow .12s;}
.lp-done .lp-cap{background:var(--lp-orange);color:var(--lp-on-orange);box-shadow:0 6px 0 var(--lp-orange-deep);}
.lp-cur  .lp-cap{width:88px;height:88px;font-size:32px;background:var(--lp-orange);color:var(--lp-on-orange);box-shadow:0 7px 0 var(--lp-orange-deep),0 0 0 8px rgba(255,122,24,.16);}
.lp-lock .lp-cap{background:var(--lp-lock);color:var(--lp-lock-num);box-shadow:0 4px 0 #EDF1F6,inset 0 0 0 2px var(--lp-lock-ring);}
.lp-node:not([disabled]):active .lp-cap{transform:translateY(3px);box-shadow:0 3px 0 var(--lp-orange-deep);}
.lp-check{width:32px;height:32px;}

.lp-badge{position:absolute;top:-40px;left:50%;transform:translateX(-50%);background:var(--lp-orange);color:var(--lp-on-orange);font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:7px 14px;border-radius:13px;white-space:nowrap;box-shadow:0 4px 0 var(--lp-orange-deep);animation:lpbob 1.6s ease-in-out infinite;}
.lp-badge::after{content:"";position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid var(--lp-orange);}
@keyframes lpbob{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-50%) translateY(-5px);}}

.lp-label{text-align:center;margin-top:10px;max-width:168px;line-height:1.3;position:relative;z-index:3;background:var(--lp-bg);padding:3px 9px;border-radius:11px;overflow-wrap:break-word;}
.lp-bai{display:block;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--lp-orange-deep);}
.lp-ttl{display:block;font-size:12px;font-weight:800;color:var(--lp-muted);margin-top:2px;}
.lp-label.lp-mut .lp-bai{color:var(--lp-faint);}
.lp-label.lp-mut .lp-ttl{color:var(--lp-faint);}

.lp-empty{background:#fff;border:2px dashed var(--lp-lock-ring);border-radius:18px;padding:46px;text-align:center;color:var(--lp-muted);font-weight:800;font-size:13px;max-width:520px;margin:10px auto 0;}

/* Rương phần thưởng */
.lp-chest{background:transparent;}
.lp-chest .lp-cap{width:78px;height:78px;font-size:42px;background:transparent;box-shadow:none;}
.lp-chest-off .lp-cap{filter:grayscale(1);opacity:.45;}
.lp-chest-on{cursor:pointer;}
.lp-chest-on .lp-cap{filter:drop-shadow(0 8px 14px rgba(255,122,24,.45));animation:lpbob 1.4s ease-in-out infinite;}
.lp-chest-on .lp-bai{color:var(--lp-orange-deep);}

/* Modal chúc mừng */
.lp-cele{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 20px;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);animation:lpfade .25s ease;}
.lp-cele-card{position:relative;z-index:2;margin:auto;background:#fff;border-radius:26px;padding:32px 28px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 70px -20px rgba(0,0,0,.5);animation:lppop .35s cubic-bezier(.2,1.2,.4,1);}
.lp-cele-badge{font-size:72px;line-height:1;filter:drop-shadow(0 8px 14px rgba(255,122,24,.4));animation:lpbob 1.6s ease-in-out infinite;}
.lp-cele-title{font-size:22px;font-weight:900;color:var(--lp-ink);margin:14px 0 6px;letter-spacing:-0.01em;}
.lp-cele-sub{font-size:13px;font-weight:800;color:var(--lp-muted);}
.lp-cele-reward{margin-top:14px;padding:12px 14px;border-radius:14px;background:#FFF4E8;border:1.5px solid #FFD9B0;font-size:12px;font-weight:800;color:#8A4B00;line-height:1.5;}
.lp-cele-reward b{color:var(--lp-orange-deep);}
.lp-cele-btn{margin-top:18px;width:100%;padding:14px;border:none;border-radius:16px;background:var(--lp-orange);color:var(--lp-on-orange);font-family:inherit;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;box-shadow:0 5px 0 var(--lp-orange-deep);}
.lp-cele-btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--lp-orange-deep);}
.lp-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;}
.lp-confetti span{position:absolute;top:-30px;font-size:22px;animation:lpfall 2.6s linear infinite;}
@keyframes lpfall{0%{transform:translateY(-30px) rotate(0);opacity:1;}100%{transform:translateY(105vh) rotate(360deg);opacity:.2;}}
@keyframes lpfade{from{opacity:0;}to{opacity:1;}}
@keyframes lppop{from{opacity:0;transform:scale(.8) translateY(20px);}to{opacity:1;transform:none;}}
`;
