import React from "react";
import Layout from "./components/layout";
import Dashboard, { AdminDashboard } from "./components/dashboard";
import ProductModule from "./components/product";
import CourseModule from "./components/course";
import QuizView from "./components/course/QuizView";
import AdminPage from "./components/admin/AdminPage";
import ProfilePage from "./components/profile/ProfilePage";
import GuidePage from "./components/guide";
import ExamHubPage from "./components/exam/ExamHubPage";
import ExamWheelPage from "./components/exam/ExamWheelPage";
import DailyTestView from "./components/daily-test/DailyTestView";
import OnboardingTestPage from "./components/onboarding-test/OnboardingTestPage";
import OnboardingTestView from "./components/onboarding-test/OnboardingTestView";
import { AttendanceTab } from "./components/dashboard/AttendanceTab";

import LoginPage from "./components/auth/LoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import ChangePasswordModal from "./components/auth/ChangePasswordModal";
import ThemeSwitcher from "./themes/ThemeSwitcher";

import { ViewType, Product, Course, Quiz, Employee } from "./types";
import type { User } from "@supabase/supabase-js";

import { getProducts } from "./services/productService";
import { getCourses } from "./services/courseService";
import { supabase } from "./services/supabaseClient";
import { getQuizById, getQuizByCourseId } from "./services/quizService";
import { getDashboardSummary } from "./services/dashboardService";
import { saveQuizResult as saveQuizToSupabase } from "./services/trainingProgressService";
import { pushSingleRowToLark } from "./services/larkSyncService";
import {
  getSession,
  getEmployeeProfile,
  signOut,
  onAuthStateChange,
} from "./services/authService";

function getQuizAttemptsKey(userId: string) {
  return `lms_quiz_attempts_${userId}`;
}

function getQuizAttempts(courseId: string, userId: string): number {
  try {
    const data = JSON.parse(localStorage.getItem(getQuizAttemptsKey(userId)) || '{}');
    return data[courseId] || 0;
  } catch { return 0; }
}

function saveQuizAttempt(courseId: string, userId: string) {
  try {
    const key = getQuizAttemptsKey(userId);
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[courseId] = (data[courseId] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

interface QuizResult {
  score: number;
  passed: boolean;
  answers?: Record<string, number>;
}

// ============================================================
// AUTH VIEWS (Chưa đăng nhập)
// ============================================================
type AuthView = 'login' | 'forgot-password' | 'reset-password';

// ============================================================
// URL ROUTING HELPERS
// ============================================================
const VIEW_TO_PATH: Record<string, string> = {
  [ViewType.DASHBOARD]: '/dashboard',
  [ViewType.PRODUCT_LIBRARY]: '/products',
  [ViewType.PRODUCT_DETAIL]: '/products',   // + /:id
  [ViewType.COURSE_CATALOG]: '/courses',
  [ViewType.COURSE_DETAIL]: '/courses',     // + /:id
  [ViewType.QUIZ]: '/quiz',
  [ViewType.REPORT]: '/report',
  [ViewType.ADMIN]: '/admin',
  [ViewType.PROFILE]: '/profile',
  [ViewType.GUIDE]: '/guide',
  [ViewType.EXAM_HUB]: '/exam',
  [ViewType.EXAM_WHEEL]: '/exam/wheel',
  [ViewType.DAILY_TEST]: '/daily-test',
  [ViewType.ONBOARDING_TEST]: '/onboarding-test',
  [ViewType.ATTENDANCE]: '/attendance',
};

function parseUrlToState(): { view: ViewType; productId?: string; courseId?: string; authView?: AuthView } {
  const path = window.location.pathname.replace(/\/+$/, '') || '/dashboard';
  const segments = path.split('/').filter(Boolean); // e.g. ['products', 'abc123']

  switch (segments[0]) {
    case 'login':
      return { view: ViewType.LOGIN, authView: 'login' };
    case 'forgot-password':
      return { view: ViewType.FORGOT_PASSWORD, authView: 'forgot-password' };
    case 'reset-password':
      return { view: ViewType.RESET_PASSWORD, authView: 'reset-password' };
    case 'products':
      if (segments[1]) return { view: ViewType.PRODUCT_DETAIL, productId: segments[1] };
      return { view: ViewType.PRODUCT_LIBRARY };
    case 'courses':
      if (segments[1]) return { view: ViewType.COURSE_DETAIL, courseId: segments[1] };
      return { view: ViewType.COURSE_CATALOG };
    case 'quiz':
      return { view: ViewType.QUIZ };
    case 'report':
      return { view: ViewType.REPORT };
    case 'admin':
      return { view: ViewType.ADMIN };
    case 'profile':
      return { view: ViewType.PROFILE };
    case 'guide':
      return { view: ViewType.GUIDE };
    case 'exam':
      if (segments[1] === 'wheel') return { view: ViewType.EXAM_WHEEL };
      return { view: ViewType.EXAM_HUB };
    case 'daily-test':
      return { view: ViewType.DAILY_TEST };
    case 'onboarding-test':
      return { view: ViewType.ONBOARDING_TEST };
    case 'attendance':
      return { view: ViewType.ATTENDANCE };
    case 'dashboard':
    default:
      return { view: ViewType.DASHBOARD };
  }
}

function pushUrl(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({ path }, '', path);
  }
}

function App() {
  // ============================================================
  // AUTH STATE
  // ============================================================
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authView, setAuthViewRaw] = React.useState<AuthView>(() => {
    const urlState = parseUrlToState();
    return urlState.authView || 'login';
  });

  // Wrapper: set authView + push URL
  const setAuthView = React.useCallback((view: AuthView) => {
    setAuthViewRaw(view);
    const authPaths: Record<AuthView, string> = {
      'login': '/login',
      'forgot-password': '/forgot-password',
      'reset-password': '/reset-password',
    };
    pushUrl(authPaths[view]);
  }, []);
  const [mustChangePassword, setMustChangePassword] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  // ============================================================
  // APP STATE — initial view read from URL
  // ============================================================
  const initialUrlState = React.useMemo(() => parseUrlToState(), []);
  const [currentView, setCurrentView] = React.useState<ViewType>(initialUrlState.view);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [dashboardSummary, setDashboardSummary] = React.useState<any>(null);

  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(initialUrlState.productId || null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(initialUrlState.courseId || null);
  const [activeQuiz, setActiveQuiz] = React.useState<Quiz | null>(null);
  const quizStartRef = React.useRef<number | null>(null);

  // Course group filter (product / general / null = all)
  const [courseGroup, setCourseGroup] = React.useState<'product' | 'general' | null>(null);

  // Exam wheel state
  const [examBrand, setExamBrand] = React.useState<'Doscom' | 'Noma' | null>(null);
  const [quizReturnView, setQuizReturnView] = React.useState<ViewType | null>(null);

  // Onboarding test: true = đang trong màn làm bài, false = hub page
  const [onboardingTestActive, setOnboardingTestActive] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(true);

  // ============================================================
  // URL SYNC — push URL when view changes + handle browser back/forward
  // ============================================================
  React.useEffect(() => {
    // Build the correct URL path based on current view + selected IDs
    let path = VIEW_TO_PATH[currentView] || '/dashboard';
    if (currentView === ViewType.PRODUCT_DETAIL && selectedProductId) {
      path = `/products/${selectedProductId}`;
    } else if (currentView === ViewType.COURSE_DETAIL && selectedCourseId) {
      path = `/courses/${selectedCourseId}`;
    } else if (currentView === ViewType.QUIZ && selectedCourseId) {
      path = `/quiz/${selectedCourseId}`;
    }
    pushUrl(path);
  }, [currentView, selectedProductId, selectedCourseId]);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => {
      const urlState = parseUrlToState();
      setCurrentView(urlState.view);
      if (urlState.productId) setSelectedProductId(urlState.productId);
      else if (urlState.view === ViewType.PRODUCT_LIBRARY) setSelectedProductId(null);
      if (urlState.courseId) setSelectedCourseId(urlState.courseId);
      else if (urlState.view === ViewType.COURSE_CATALOG) setSelectedCourseId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ============================================================
  // AUTH INITIALIZATION — Kiểm tra session khi mở app
  // ============================================================
  React.useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      let handledByEvent = false;
      try {
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const currentPath = window.location.pathname.replace(/\/+$/, '');

        // Implicit flow: #access_token=...&type=recovery
        const isImplicitRecovery =
          hash.includes('type=recovery') ||
          searchParams.get('type') === 'recovery' ||
          hashParams.get('type') === 'recovery';

        // PKCE flow: /reset-password?code=...
        const isPkceRecovery =
          currentPath.includes('reset-password') && !!searchParams.get('code');

        // Link lỗi từ Supabase (hết hạn, không hợp lệ)
        const hashError = hashParams.get('error_description');
        if (hashError) {
          console.warn('[Auth] Link error:', hashError);
          window.history.replaceState(null, '', window.location.pathname);
          setAuthLoading(false);
          return;
        }

        if (isImplicitRecovery || isPkceRecovery) {
          // Để onAuthStateChange xử lý PASSWORD_RECOVERY event —
          // Supabase chỉ fire event sau khi session đã sẵn sàng.
          // Giữ authLoading = true cho đến khi event được nhận.
          // Nếu sau 8s không có event → link hết hạn, show trang reset với lỗi.
          handledByEvent = true;
          setTimeout(() => {
            if (isMounted) {
              setAuthViewRaw('reset-password');
              setAuthLoading(false);
            }
          }, 8000);
          return;
        }

        const session = await getSession();

        if (!session?.user) {
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }

        // Lấy employee profile
        const emp = await getEmployeeProfile(session.user.id);

        if (!emp) {
          await signOut();
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }

        if (emp.employment_status !== 'active') {
          await signOut();
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }

        if (isMounted) {
          setAuthUser(session.user);
          setEmployee(emp);
          setMustChangePassword(emp.must_change_password);
          // Khôi phục view từ URL (nếu người dùng mở trực tiếp link /courses, /admin, v.v.)
          const urlState = parseUrlToState();
          setCurrentView(urlState.view);
          if (urlState.productId) setSelectedProductId(urlState.productId);
          if (urlState.courseId) setSelectedCourseId(urlState.courseId);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (isMounted && !handledByEvent) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    // Lắng nghe auth state changes (ví dụ: token refresh, password recovery)
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase fire event này sau khi session đã sẵn sàng → an toàn để show trang reset
        if (isMounted) {
          setAuthView('reset-password');
          setAuthLoading(false);
        }
      }

      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setAuthUser(null);
          setEmployee(null);
          setMustChangePassword(false);
          setAuthView('login');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // AUTH HANDLERS
  // ============================================================
  const handleLoginSuccess = (user: User, emp: Employee, needsPasswordChange: boolean) => {
    setAuthUser(user);
    setEmployee(emp);
    setMustChangePassword(needsPasswordChange);
    // Sau khi đăng nhập → chuyển về dashboard (hoặc URL trước đó nếu không phải auth page)
    const urlState = parseUrlToState();
    const isAuthPage = urlState.authView !== undefined;
    const targetView = isAuthPage ? ViewType.DASHBOARD : urlState.view;
    setCurrentView(targetView);
    if (!isAuthPage) {
      if (urlState.productId) setSelectedProductId(urlState.productId);
      if (urlState.courseId) setSelectedCourseId(urlState.courseId);
    }
    pushUrl(isAuthPage ? '/dashboard' : window.location.pathname);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setEmployee(null);
      setMustChangePassword(false);
      setShowChangePassword(false);
      setCurrentView(ViewType.DASHBOARD);
      setAuthViewRaw('login');
      pushUrl('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false);
    setShowChangePassword(false);

    // Cập nhật employee state
    if (employee) {
      setEmployee({ ...employee, must_change_password: false });
    }
  };

  const handleResetPasswordSuccess = () => {
    // Sau khi reset password xong, chuyển về login
    setAuthView('login');
  };

  // ============================================================
  // DATA LOADING
  // ============================================================
  const selectedProduct = React.useMemo(
    () => products.find((item) => item.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const selectedCourse = React.useMemo(
    () => courses.find((item) => item.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const refreshDashboard = React.useCallback(async (courseData?: Course[]) => {
    try {
      const summary = await getDashboardSummary(courseData || []);
      setDashboardSummary(summary);
    } catch (error) {
      console.error("Lỗi tải dashboard:", error);
    }
  }, []);

  const initData = React.useCallback(async (silent = false) => {
    try {
      // silent=true → không toggle loading spinner (tránh unmount AdminPage khi admin refresh data)
      if (!silent) setIsLoading(true);

      const [productData, courseData] = await Promise.all([getProducts(), getCourses()]);

      setProducts(productData);

      // Merge tiến độ từ Supabase vào courses + sync localStorage → Supabase
      if (employee?.id && employee?.auth_user_id) {
        try {
          const { data: progressData } = await supabase
            .from('training_progress')
            .select('course_id, video_progress, quiz_score, quiz_time_seconds, quiz_passed, quiz_completed_at, status')
            .eq('employee_id', employee.id);

          const progressMap = new Map((progressData || []).map((p: any) => [p.course_id, p]));

          // Read localStorage video progress
          const localVideoKey = `lms_video_progress_${employee.auth_user_id}`;
          const localVideoData = JSON.parse(localStorage.getItem(localVideoKey) || '{}');

          for (const course of courseData) {
            const supaProgress = progressMap.get(course.id);
            const localVideoProg = localVideoData[course.id] || 0;

            // Get the best video progress between Supabase and localStorage
            const supaVideoProg = supaProgress?.video_progress || 0;
            const bestVideoProg = Math.max(supaVideoProg, localVideoProg);

            // Sync localStorage video progress to Supabase if higher
            // Chỉ sync khi Supabase ĐÃ CÓ record (tránh tạo lại bản ghi đã bị admin xóa)
            if (supaProgress && localVideoProg > supaVideoProg && localVideoProg > 0) {
              supabase.from('training_progress').upsert({
                employee_id: employee.id,
                course_id: course.id,
                video_progress: localVideoProg,
                status: supaProgress?.quiz_passed ? 'completed' : 'in_progress',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'employee_id,course_id' }).then(({ error }) => {
                if (error) console.error('Sync video progress error:', error);
              });
            }

            // Nếu Supabase không có record (admin đã xóa), xóa localStorage để reset
            if (!supaProgress && localVideoProg > 0) {
              delete localVideoData[course.id];
              localStorage.setItem(localVideoKey, JSON.stringify(localVideoData));
              // Xóa quiz attempts cũ để nhân viên có thể làm lại
              try {
                const quizAttemptsKey = `lms_quiz_attempts_${employee.auth_user_id}`;
                const quizData = JSON.parse(localStorage.getItem(quizAttemptsKey) || '{}');
                if (quizData[course.id]) {
                  delete quizData[course.id];
                  localStorage.setItem(quizAttemptsKey, JSON.stringify(quizData));
                }
              } catch { /* ignore */ }
            }

            // Sync Supabase video progress back to localStorage if higher
            if (supaVideoProg > localVideoProg) {
              localVideoData[course.id] = supaVideoProg;
              localStorage.setItem(localVideoKey, JSON.stringify(localVideoData));
            }

            // Merge into course object
            if (supaProgress) {
              course.videoProgress = bestVideoProg;
              const courseHasQuiz = Boolean(course.quizId);
              const courseHasVideo = Boolean(course.videoUrl);

              if (courseHasQuiz) {
                // Courses WITH quiz: video chiếm 50%, quiz chiếm 50%
                const videoPart = Math.round(bestVideoProg / 2);
                const quizSubmitted = Boolean(supaProgress.quiz_completed_at);
                course.progress = videoPart + (quizSubmitted ? 50 : 0);
              } else if (courseHasVideo) {
                // Courses WITHOUT quiz, WITH video: video progress = overall progress
                course.progress = bestVideoProg;
              } else {
                // Slide-only courses: completed only when DB explicitly says so
                const slideCompleted = supaProgress.status === 'completed';
                course.progress = slideCompleted ? 100 : 0;
                course.isCompleted = slideCompleted;
              }
              course.lastQuizScore = supaProgress.quiz_score ?? undefined;
              course.attempts = supaProgress.quiz_completed_at ? 1 : 0;
              // Hoàn thành = xem đủ video 100% AND đã nộp quiz (pass/fail OK)
              if (courseHasQuiz) {
                course.isCompleted = bestVideoProg >= 100 && Boolean(supaProgress.quiz_completed_at);
              }
            }
            // Khi không có supaProgress và localStorage đã bị xóa ở trên → progress = 0
            // Slide-only courses with no progress record: progress stays 0, not completed
          }
        } catch (e) {
          console.error('Error loading training progress:', e);
        }
      }

      // Lọc khoá học theo phòng ban của user (admin/manager thấy tất cả)
      const isPrivileged = employee?.role === 'admin' || employee?.role === 'manager';
      const visibleCourses = isPrivileged
        ? courseData
        : courseData.filter(c => !c.department || c.department === (employee?.department || ''));

      setCourses(visibleCourses);

      await refreshDashboard(visibleCourses);
    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshDashboard, employee?.id, employee?.auth_user_id, employee?.role, employee?.department]);

  // Chỉ load data khi đã đăng nhập thành công
  React.useEffect(() => {
    if (authUser && employee && !mustChangePassword) {
      initData();
    }
  }, [authUser, employee, mustChangePassword, initData]);

  // ============================================================
  // NAVIGATION
  // ============================================================
  const handleNavigate = (view: string) => {
    switch (view) {
      case "dashboard":
        setCurrentView(ViewType.DASHBOARD);
        // Silently refresh data so progress is always up-to-date
        initData(true);
        break;
      case "products":
        setSelectedProductId(null);
        setCurrentView(ViewType.PRODUCT_LIBRARY);
        break;
      case "courses":
        setSelectedCourseId(null);
        setCurrentView(ViewType.COURSE_CATALOG);
        // Silently refresh data so progress is always up-to-date
        initData(true);
        break;
      case "report":
        setCurrentView(ViewType.REPORT);
        break;
      case "admin":
        setCurrentView(ViewType.ADMIN);
        break;
      case "profile":
        setCurrentView(ViewType.PROFILE);
        break;
      case "guide":
        setCurrentView(ViewType.GUIDE);
        break;
      case "exam-hub":
        setExamBrand(null);
        setCurrentView(ViewType.EXAM_HUB);
        break;
      case "exam-wheel":
        setCurrentView(ViewType.EXAM_WHEEL);
        break;
      case "onboarding-test":
        setOnboardingTestActive(false);
        setCurrentView(ViewType.ONBOARDING_TEST);
        break;
      case "attendance":
        setCurrentView(ViewType.ATTENDANCE);
        break;
      default:
        setCurrentView(ViewType.DASHBOARD);
        initData(true);
    }
  };

  const handleOpenProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentView(ViewType.PRODUCT_DETAIL);
  };

  const handleBackToProducts = () => {
    setSelectedProductId(null);
    setCurrentView(ViewType.PRODUCT_LIBRARY);
  };

  const handleOpenCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentView(ViewType.COURSE_DETAIL);
  };

  const handleBackToCourses = () => {
    setSelectedCourseId(null);
    setCurrentView(ViewType.COURSE_CATALOG);
    // Refresh data so course list shows updated progress
    initData(true);
  };

  const handleStartQuiz = async (quizId?: string, courseIdOverride?: string) => {
    try {
      // Khi gọi từ vòng quay, selectedCourseId state chưa kịp update vì cùng tick
      // → dùng courseIdOverride truyền trực tiếp.
      const targetCourseId = courseIdOverride || selectedCourseId;
      const userId = employee?.auth_user_id || '';
      if (targetCourseId && getQuizAttempts(targetCourseId, userId) >= 1) {
        alert('Bạn đã sử dụng hết lượt làm bài kiểm tra (1/1). Không thể làm lại.');
        return;
      }

      let quiz: Quiz | null = null;

      if (quizId) {
        quiz = await getQuizById(quizId);
      }

      if (!quiz && targetCourseId) {
        quiz = await getQuizByCourseId(targetCourseId);
      }

      if (!quiz) {
        console.warn("Không tìm thấy bài quiz");
        return;
      }

      setActiveQuiz(quiz);
      quizStartRef.current = Date.now();
      setCurrentView(ViewType.QUIZ);
    } catch (error) {
      console.error("Lỗi mở quiz:", error);
    }
  };

  const handleExitQuiz = () => {
    setActiveQuiz(null);
    // Nếu quiz được mở từ vòng quay → quay lại wheel + refresh data để loại sản phẩm vừa làm
    if (quizReturnView === ViewType.EXAM_WHEEL) {
      setQuizReturnView(null);
      setCurrentView(ViewType.EXAM_WHEEL);
      initData(true);
      return;
    }
    setQuizReturnView(null);
    setCurrentView(ViewType.COURSE_DETAIL);
  };

  // Vòng quay → khởi động quiz cho course được chọn
  const handleStartQuizFromWheel = (course: Course) => {
    setSelectedCourseId(course.id);
    setQuizReturnView(ViewType.EXAM_WHEEL);
    // Truyền course.id thẳng để né race condition với selectedCourseId state
    handleStartQuiz(course.quizId, course.id);
  };

  // Lưu kết quả quiz vào Supabase + cập nhật state local. Không navigate.
  const persistQuizResult = async (result: QuizResult) => {
    if (!selectedCourseId) return;
    const userId = employee?.auth_user_id || '';

    let supabaseSaved = false;
    if (employee?.id) {
      const quizTimeSeconds = quizStartRef.current ? Math.round((Date.now() - quizStartRef.current) / 1000) : 0;
      supabaseSaved = await saveQuizToSupabase(employee.id, selectedCourseId, result.score, quizTimeSeconds, result.passed, result.answers);
      quizStartRef.current = null;
    }

    if (supabaseSaved) {
      saveQuizAttempt(selectedCourseId, userId);
      // Auto-sync record vừa lưu lên Lark (fire-and-forget, không await để không chặn UI)
      void pushSingleRowToLark(employee!.id, selectedCourseId);
    }

    const updatedCourses = courses.map((course) => {
      if (course.id !== selectedCourseId) return course;
      const previousBestScore = course.lastQuizScore || 0;
      const bestScore = Math.max(previousBestScore, result.score);
      // Submit quiz → +50% progress. Chỉ mark hoàn thành nếu video đủ 100%.
      const videoProg = course.videoProgress || 0;
      const videoPart = Math.round(videoProg / 2);
      const newProgress = videoPart + 50;
      return {
        ...course,
        attempts: supabaseSaved ? 1 : course.attempts,
        lastQuizScore: bestScore,
        isCompleted: videoProg >= 100,
        progress: Math.max(course.progress, newProgress),
      };
    });

    setCourses(updatedCourses);
    await refreshDashboard(updatedCourses);

    if (!supabaseSaved) {
      console.error('Quiz result could not be saved to Supabase. Attempt not counted.');
    }
  };

  const handleQuizComplete = async (result: QuizResult) => {
    await persistQuizResult(result);
    setActiveQuiz(null);
    setCurrentView(ViewType.COURSE_DETAIL);
  };

  const handleQuizFinishAndExit = async (result: QuizResult) => {
    await persistQuizResult(result);
    setActiveQuiz(null);
    setCurrentView(ViewType.COURSE_DETAIL);
  };

  // ============================================================
  // RENDER: AUTH LOADING
  // ============================================================
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090B]">
        <div className="text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold ">
            Đang kiểm tra phiên đăng nhập...
          </p>
        </div>
        <ThemeSwitcher />
      </div>
    );
  }

  // ============================================================
  // RENDER: AUTH PAGES (Chưa đăng nhập)
  // ============================================================
  if (!authUser || !employee) {
    // Đồng bộ URL với authView khi chưa đăng nhập
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    if (authView === 'login' && currentPath !== '/login' && currentPath !== '/forgot-password' && currentPath !== '/reset-password') {
      pushUrl('/login');
    }

    let authPage: React.ReactNode;
    switch (authView) {
      case 'forgot-password':
        authPage = <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />;
        break;

      case 'reset-password':
        authPage = <ResetPasswordPage onSuccess={handleResetPasswordSuccess} onBackToLogin={() => setAuthView('forgot-password')} />;
        break;

      default:
        authPage = (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
    return (
      <>
        {authPage}
        <ThemeSwitcher />
      </>
    );
  }

  // ============================================================
  // RENDER: FORCE CHANGE PASSWORD
  // ============================================================
  if (mustChangePassword) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090B]">
        <ChangePasswordModal
          authUserId={authUser.id}
          isForced={true}
          onSuccess={handlePasswordChangeSuccess}
          onClose={() => {}} // Không cho đóng khi forced
        />
        <ThemeSwitcher />
      </div>
    );
  }

  // ============================================================
  // RENDER: MAIN APP (Đã đăng nhập)
  // ============================================================
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
              Đang tải dữ liệu...
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case ViewType.DASHBOARD:
        // Employee: xem dashboard cá nhân, Manager/Admin: xem dashboard tổng quan
        if (employee.role === 'employee') {
          return (
            <Dashboard
              courses={courses}
              summary={dashboardSummary}
              onCourseClick={(course: Course) => handleOpenCourse(course.id)}
              employeeId={employee.id}
              department={employee.department || ''}
            />
          );
        }
        return (
          <AdminDashboard employee={employee} />
        );

      case ViewType.PRODUCT_LIBRARY:
        return (
          <ProductModule
            mode="list"
            products={products}
            onSelectProduct={(product: Product) => handleOpenProduct(product.id)}
          />
        );

      case ViewType.PRODUCT_DETAIL:
        if (!selectedProduct) {
          return (
            <div className="p-8 text-zinc-400">
              Không tìm thấy sản phẩm. Vui lòng quay lại danh sách.
            </div>
          );
        }

        return (
          <ProductModule
            mode="detail"
            product={selectedProduct}
            onBack={handleBackToProducts}
          />
        );

      case ViewType.COURSE_CATALOG:
        return (
          <CourseModule
            mode="list"
            courses={courses}
            userId={employee.auth_user_id}
            employeeId={employee.id}
            onSelectCourse={(course: Course) => handleOpenCourse(course.id)}
            initialGroup={courseGroup}
          />
        );

      case ViewType.COURSE_DETAIL:
        if (!selectedCourse) {
          return (
            <div className="p-8 text-zinc-400">
              Không tìm thấy khóa học. Vui lòng quay lại danh sách.
            </div>
          );
        }

        return (
          <CourseModule
            mode="detail"
            course={selectedCourse}
            userId={employee.auth_user_id}
            employeeId={employee.id}
            onBack={handleBackToCourses}
            onStartQuiz={(quizId?: string) => handleStartQuiz(quizId)}
          />
        );

      case ViewType.QUIZ:
        if (!activeQuiz) {
          return (
            <div className="p-8 text-zinc-400">
              Không tìm thấy bài kiểm tra. Vui lòng quay lại khóa học.
            </div>
          );
        }

        return (
          <QuizView
            quiz={activeQuiz}
            attempts={selectedCourse?.attempts || 0}
            onComplete={handleQuizComplete}
            onExit={handleExitQuiz}
            onFinishAndExit={handleQuizFinishAndExit}
          />
        );

      case ViewType.REPORT:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
              <h1 className="text-5xl font-black tracking-tighter text-white  uppercase leading-none">BÁO CÁO</h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Báo cáo tiến độ đào tạo và hiệu suất</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black ">Tổng sản phẩm</p>
                <p className="mt-4 text-5xl font-black  text-white">{products.length}</p>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black ">Tổng khóa học</p>
                <p className="mt-4 text-5xl font-black  text-white">{courses.length}</p>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black ">Tỷ lệ hoàn thành</p>
                <p className="mt-4 text-5xl font-black  text-white">{dashboardSummary?.completionRate || 0}%</p>
              </div>
            </div>
          </div>
        );

      case ViewType.ADMIN:
        // Employee không được truy cập trang quản trị
        if (employee.role === 'employee') {
          return (
            <div className="flex h-full min-h-[60vh] items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-5.364l-1.414 1.414A2 2 0 0116 11V7a4 4 0 00-8 0v4a2 2 0 01-1.95 1.95l-1.414-1.414" />
                  </svg>
                </div>
                <p className="text-xl font-black text-white uppercase tracking-tight">Không có quyền truy cập</p>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Bạn không có quyền truy cập trang quản trị hệ thống.</p>
              </div>
            </div>
          );
        }
        return <AdminPage onDataChanged={() => initData(true)} employee={employee} />;

      case ViewType.PROFILE:
        return (
          <ProfilePage
            employee={employee}
            onBack={() => setCurrentView(ViewType.DASHBOARD)}
            onLogout={handleLogout}
            onChangePassword={() => setShowChangePassword(true)}
            onEmployeeUpdate={(emp) => setEmployee(emp)}
          />
        );

      case ViewType.GUIDE:
        return <GuidePage />;

      case ViewType.EXAM_HUB:
        return (
          <ExamHubPage
            products={products}
            courses={courses}
            onSelectBrand={(brand) => {
              setExamBrand(brand);
              setCurrentView(ViewType.EXAM_WHEEL);
            }}
            onStartDailyTest={() => setCurrentView(ViewType.DAILY_TEST)}
            employeeId={employee.id}
            department={employee.department || ''}
          />
        );

      case ViewType.EXAM_WHEEL:
        if (!examBrand) {
          setCurrentView(ViewType.EXAM_HUB);
          return null;
        }
        return (
          <ExamWheelPage
            brand={examBrand}
            products={products}
            courses={courses}
            userId={employee.auth_user_id}
            onBack={() => setCurrentView(ViewType.EXAM_HUB)}
            onStartQuiz={handleStartQuizFromWheel}
          />
        );

      case ViewType.DAILY_TEST:
        return (
          <DailyTestView
            employeeId={employee.id}
            department={employee.department || ''}
            onBack={() => setCurrentView(ViewType.EXAM_HUB)}
          />
        );

      case ViewType.ONBOARDING_TEST: {
        const isAdminRole = employee.role === 'admin' || employee.role === 'manager';
        const onboardingDate = employee.onboarding_available_date
          || (isAdminRole ? new Date().toISOString().slice(0, 10) : null);
        if (onboardingTestActive) {
          return (
            <OnboardingTestView
              employeeId={employee.id}
              onBack={() => setOnboardingTestActive(false)}
            />
          );
        }
        return (
          <OnboardingTestPage
            employeeId={employee.id}
            onboardingAvailableDate={onboardingDate}
            onStartTest={() => setOnboardingTestActive(true)}
          />
        );
      }

      case ViewType.ATTENDANCE:
        if (employee.role === 'employee') return null;
        return <AttendanceTab />;

      default:
        return null;
    }
  };

  return (
    <>
      <Layout
        currentView={currentView}
        onNavigate={handleNavigate}
        employee={employee}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
        courses={courses}
        products={products}
        onCourseClick={(courseId: string) => handleOpenCourse(courseId)}
        onProductClick={(productId: string) => handleOpenProduct(productId)}
        courseGroup={courseGroup}
        onSetCourseGroup={setCourseGroup}
      >
        {renderContent()}
      </Layout>

      {/* Change Password Modal (voluntary) */}
      {showChangePassword && (
        <ChangePasswordModal
          authUserId={authUser.id}
          isForced={false}
          onSuccess={handlePasswordChangeSuccess}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* Floating theme switcher — visible everywhere */}
      <ThemeSwitcher />
    </>
  );
}

export default App;