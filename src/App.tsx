import React from "react";
import Layout from "./components/layout";
import Dashboard from "./components/dashboard";
import ProductModule from "./components/product";
import CourseModule from "./components/course";
import QuizView from "./components/course/QuizView";

import { ViewType, Product, Course, Quiz } from "./types";

import { getProducts } from "./services/productService";
import { getCourses } from "./services/courseService";
import { getQuizById, getQuizByCourseId } from "./services/quizService";
import { getDashboardSummary } from "./services/dashboardService";

const QUIZ_ATTEMPTS_KEY = 'lms_quiz_attempts';

function getQuizAttempts(courseId: string): number {
  try {
    const data = JSON.parse(localStorage.getItem(QUIZ_ATTEMPTS_KEY) || '{}');
    return data[courseId] || 0;
  } catch { return 0; }
}

function saveQuizAttempt(courseId: string) {
  try {
    const data = JSON.parse(localStorage.getItem(QUIZ_ATTEMPTS_KEY) || '{}');
    data[courseId] = (data[courseId] || 0) + 1;
    localStorage.setItem(QUIZ_ATTEMPTS_KEY, JSON.stringify(data));
  } catch {}
}

interface QuizResult {
  score: number;
  passed: boolean;
  answers?: number[];
}

function App() {
  const [currentView, setCurrentView] = React.useState<ViewType>(ViewType.DASHBOARD);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [dashboardSummary, setDashboardSummary] = React.useState<any>(null);

  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = React.useState<Quiz | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);

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

  React.useEffect(() => {
    initData();
  }, [initData]);

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
      case "admin":
        setCurrentView(ViewType.ADMIN);
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
      if (selectedCourseId && getQuizAttempts(selectedCourseId) >= 1) {
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
    saveQuizAttempt(selectedCourseId);

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
        return (
          <Dashboard
            courses={courses}
            summary={dashboardSummary}
            onCourseClick={(course: Course) => handleOpenCourse(course.id)}
          />
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

      case ViewType.ADMIN:
        return (
          <div className="space-y-6 p-8">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-white">
                Quản trị hệ thống
              </h1>
              <p className="mt-3 text-sm uppercase tracking-[0.3em] text-zinc-500">
                Khu vực quản trị đang được hoàn thiện
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Tổng sản phẩm
                </p>
                <p className="mt-4 text-5xl font-black italic text-white">{products.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Tổng khóa học
                </p>
                <p className="mt-4 text-5xl font-black italic text-white">{courses.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Tỷ lệ hoàn thành
                </p>
                <p className="mt-4 text-5xl font-black italic text-white">
                  {dashboardSummary?.completionRate || 0}%
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <Layout currentView={currentView} onNavigate={handleNavigate}>{renderContent()}</Layout>;
}

export default App;