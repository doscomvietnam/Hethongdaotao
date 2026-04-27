import React from "react";
import Layout from "./components/layout";
import Dashboard, { AdminDashboard } from "./components/dashboard";
import ProductModule from "./components/product";
import CourseModule from "./components/course";
import QuizView from "./components/course/QuizView";
import AdminPage from "./components/admin/AdminPage";
import ProfilePage from "./components/profile/ProfilePage";

import LoginPage from "./components/auth/LoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import ChangePasswordModal from "./components/auth/ChangePasswordModal";

import { ViewType, Product, Course, Quiz, Employee } from "./types";
import type { User } from "@supabase/supabase-js";

import { getProducts } from "./services/productService";
import { getCourses } from "./services/courseService";
import { getQuizById, getQuizByCourseId } from "./services/quizService";
import { getDashboardSummary } from "./services/dashboardService";
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
  answers?: number[];
}

// ============================================================
// AUTH VIEWS (Chưa đăng nhập)
// ============================================================
type AuthView = 'login' | 'forgot-password' | 'reset-password';

function App() {
  // ============================================================
  // AUTH STATE
  // ============================================================
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authView, setAuthView] = React.useState<AuthView>('login');
  const [mustChangePassword, setMustChangePassword] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  // ============================================================
  // APP STATE
  // ============================================================
  const [currentView, setCurrentView] = React.useState<ViewType>(ViewType.DASHBOARD);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [dashboardSummary, setDashboardSummary] = React.useState<any>(null);

  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = React.useState<Quiz | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);

  // ============================================================
  // AUTH INITIALIZATION — Kiểm tra session khi mở app
  // ============================================================
  React.useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Kiểm tra nếu URL chứa recovery token hoặc error
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        
        const isRecovery = 
          hash.includes('type=recovery') || 
          searchParams.get('type') === 'recovery' ||
          hashParams.get('type') === 'recovery';

        // Kiểm tra nếu link reset bị lỗi (hết hạn, không hợp lệ)
        const hashError = hashParams.get('error_description');
        if (hashError) {
          console.warn('[Auth] Link error:', hashError);
          // Xóa hash khỏi URL
          window.history.replaceState(null, '', window.location.pathname);
          setAuthLoading(false);
          return;
        }

        if (isRecovery) {
          // Đợi Supabase xử lý token từ URL
          await new Promise(resolve => setTimeout(resolve, 500));
          setAuthView('reset-password');
          setAuthLoading(false);
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
          // Tất cả roles đều vào Dashboard mặc định
          setCurrentView(ViewType.DASHBOARD);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    // Lắng nghe auth state changes (ví dụ: token refresh, password recovery)
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (isMounted) {
          setAuthView('reset-password');
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
    // Tất cả roles đều vào Dashboard mặc định
    setCurrentView(ViewType.DASHBOARD);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setEmployee(null);
      setMustChangePassword(false);
      setShowChangePassword(false);
      setCurrentView(ViewType.DASHBOARD);
      setAuthView('login');
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
    // Clear URL hash
    window.history.replaceState(null, '', window.location.pathname);
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

  const initData = React.useCallback(async () => {
    try {
      setIsLoading(true);

      const [productData, courseData] = await Promise.all([getProducts(), getCourses()]);

      setProducts(productData);
      setCourses(courseData);

      await refreshDashboard(courseData);
    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshDashboard]);

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
        break;
      case "products":
        setSelectedProductId(null);
        setCurrentView(ViewType.PRODUCT_LIBRARY);
        break;
      case "courses":
        setSelectedCourseId(null);
        setCurrentView(ViewType.COURSE_CATALOG);
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
      default:
        setCurrentView(ViewType.DASHBOARD);
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
  };

  const handleStartQuiz = async (quizId?: string) => {
    try {
      // Check localStorage — only 1 attempt allowed
      const userId = employee?.auth_user_id || '';
      if (selectedCourseId && getQuizAttempts(selectedCourseId, userId) >= 1) {
        alert('Bạn đã sử dụng hết lượt làm bài kiểm tra (1/1). Không thể làm lại.');
        return;
      }

      let quiz: Quiz | null = null;

      if (quizId) {
        quiz = await getQuizById(quizId);
      }

      if (!quiz && selectedCourseId) {
        quiz = await getQuizByCourseId(selectedCourseId);
      }

      if (!quiz) {
        console.warn("Không tìm thấy bài quiz");
        return;
      }

      setActiveQuiz(quiz);
      setCurrentView(ViewType.QUIZ);
    } catch (error) {
      console.error("Lỗi mở quiz:", error);
    }
  };

  const handleExitQuiz = () => {
    setActiveQuiz(null);
    setCurrentView(ViewType.COURSE_DETAIL);
  };

  const handleQuizComplete = async (result: QuizResult) => {
    if (!selectedCourseId) return;

    // Persist attempt to localStorage (max 1)
    const userId = employee?.auth_user_id || '';
    saveQuizAttempt(selectedCourseId, userId);

    const updatedCourses = courses.map((course) => {
      if (course.id !== selectedCourseId) return course;

      const previousBestScore = course.lastQuizScore || 0;
      const bestScore = Math.max(previousBestScore, result.score);

      return {
        ...course,
        attempts: 1, // Always 1 since only 1 attempt allowed
        lastQuizScore: bestScore,
        isCompleted: course.isCompleted || result.passed,
        progress: result.passed ? 100 : course.progress === 0 ? 50 : course.progress,
      };
    });

    setCourses(updatedCourses);
    await refreshDashboard(updatedCourses);

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
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold italic">
            Đang kiểm tra phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: AUTH PAGES (Chưa đăng nhập)
  // ============================================================
  if (!authUser || !employee) {
    switch (authView) {
      case 'forgot-password':
        return <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />;

      case 'reset-password':
        return <ResetPasswordPage onSuccess={handleResetPasswordSuccess} />;

      default:
        return (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
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
            />
          );
        }
        return (
          <AdminDashboard />
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
            onSelectCourse={(course: Course) => handleOpenCourse(course.id)}
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
          />
        );

      case ViewType.REPORT:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
              <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">BÁO CÁO</h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Báo cáo tiến độ đào tạo và hiệu suất</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black italic">Tổng sản phẩm</p>
                <p className="mt-4 text-5xl font-black italic text-white">{products.length}</p>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black italic">Tổng khóa học</p>
                <p className="mt-4 text-5xl font-black italic text-white">{courses.length}</p>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 hover:border-emerald-500/20 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black italic">Tỷ lệ hoàn thành</p>
                <p className="mt-4 text-5xl font-black italic text-white">{dashboardSummary?.completionRate || 0}%</p>
              </div>
            </div>
          </div>
        );

      case ViewType.ADMIN:
        return <AdminPage />;

      case ViewType.PROFILE:
        return (
          <ProfilePage
            employee={employee}
            onBack={() => setCurrentView(ViewType.DASHBOARD)}
            onLogout={handleLogout}
            onChangePassword={() => setShowChangePassword(true)}
          />
        );

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
    </>
  );
}

export default App;