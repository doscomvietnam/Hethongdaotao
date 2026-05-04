import * as React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  BarChart3,
  Search,
  Bell,
  Building2,
  Box,
  ChevronRight,
  Settings,
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ViewType, Employee, Course, Product } from '../../types';
import { cn } from '../../lib/utils';

// ============================================================
// NOTIFICATION TYPES & DATA
// ============================================================
interface Notification {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    icon: BookOpen,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'Khóa học mới được giao',
    message: 'Bạn được phân công hoàn thành khóa đào tạo sản phẩm mới. Hãy bắt đầu ngay!',
    time: '10 phút trước',
    read: false,
  },
  {
    id: 'n2',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'Nhắc nhở deadline đào tạo',
    message: 'Bạn còn 3 ngày để hoàn thành khóa học đang học dở. Đừng để quá hạn!',
    time: '1 giờ trước',
    read: false,
  },
  {
    id: 'n3',
    icon: CheckCircle2,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'Kết quả bài kiểm tra',
    message: 'Chúc mừng! Bạn đã đạt điểm cao trong bài kiểm tra sản phẩm gần nhất.',
    time: '3 giờ trước',
    read: false,
  },
  {
    id: 'n4',
    icon: Megaphone,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: 'Thông báo hệ thống',
    message: 'Hệ thống đào tạo DOSCOM Academy đã được cập nhật phiên bản mới.',
    time: 'Hôm qua',
    read: true,
  },
];

// ============================================================
// SIDEBAR
// ============================================================
interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  employee: Employee;
}

export const Sidebar = ({ currentView, setView, employee }: SidebarProps) => {
  const allMenuItems = [
    { id: ViewType.DASHBOARD, icon: LayoutDashboard, label: 'Tổng quan học tập', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.PRODUCT_LIBRARY, icon: Box, label: 'Giới thiệu sản phẩm', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.COURSE_CATALOG, icon: GraduationCap, label: 'Khóa học đào tạo', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.ADMIN, icon: Settings, label: 'Quản trị hệ thống', roles: ['admin', 'manager'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(employee.role));

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    employee: 'Nhân viên',
  };

  const roleColors: Record<string, string> = {
    admin: 'text-emerald-500',
    manager: 'text-blue-400',
    employee: 'text-zinc-400',
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="w-72 border-r border-zinc-900 bg-[#0C0C0E] h-screen sticky top-0 flex flex-col z-20 overflow-hidden">
      <div className="px-6 py-8 flex items-center justify-center border-b border-zinc-900/50">
        <img
          src="/logo.png"
          alt="DOSCOM Academy"
          className="h-32 w-auto object-contain select-none"
          draggable={false}
        />
      </div>

      <nav className="flex-1 px-6 space-y-4 py-10 overflow-y-auto scrollbar-hide">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-4 mb-6 ">Hệ thống nội bộ</div>
        
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-xs font-black transition-all group relative uppercase tracking-widest ',
              currentView.startsWith(item.id.split('-')[0]) 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
            )}
          >
            {currentView.startsWith(item.id.split('-')[0]) && (
                <div className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_15px_#10B981]" />
            )}
            <item.icon className={cn('w-5 h-5', currentView.startsWith(item.id.split('-')[0]) ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-zinc-300')} />
            {item.label}
            {currentView.startsWith(item.id.split('-')[0]) && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
          </button>
        ))}
      </nav>

      {/* User card — bấm vào mở trang Profile */}
      <div className="p-8 border-t border-zinc-900 bg-black/20">
        <div
          onClick={() => setView(ViewType.PROFILE)}
          className={cn(
            "rounded-2xl p-5 border flex items-center gap-4 group cursor-pointer transition-all",
            currentView === ViewType.PROFILE
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800"
          )}
        >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-zinc-700/50 shadow-inner">
                 <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-emerald-500 font-black  text-xs uppercase">
                      {getInitials(employee.full_name)}
                    </span>
                 </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-white truncate  uppercase tracking-tighter">
                  {employee.full_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className={`text-[9px] truncate uppercase font-black tracking-widest  ${roleColors[employee.role]}`}>
                      {roleLabels[employee.role]}
                    </p>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
        </div>
      </div>
    </aside>
  );
};

// ============================================================
// SEARCH RESULT ITEM
// ============================================================
interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  type: 'course' | 'product';
}

// ============================================================
// NAVBAR
// ============================================================
interface NavbarProps {
  employee: Employee;
  courses: Course[];
  products: Product[];
  onCourseClick: (courseId: string) => void;
  onProductClick: (productId: string) => void;
}

export const Navbar = ({ employee, courses, products, onCourseClick, onProductClick }: NavbarProps) => {
  // --- Search state ---
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // --- Notification state (persisted via localStorage) ---
  const NOTIF_STORAGE_KEY = 'lms_notif_read_state';

  const loadNotifications = (): Notification[] => {
    try {
      const saved: Record<string, boolean> = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '{}');
      return INITIAL_NOTIFICATIONS.map(n => ({
        ...n,
        read: saved[n.id] !== undefined ? saved[n.id] : n.read,
      }));
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  };

  const [notifications, setNotifications] = React.useState<Notification[]>(loadNotifications);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Sync read state to localStorage whenever notifications change
  const persistReadState = React.useCallback((notifs: Notification[]) => {
    const readMap: Record<string, boolean> = {};
    notifs.forEach(n => { readMap[n.id] = n.read; });
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(readMap));
  }, []);

  // --- Click outside handlers ---
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Search filtering ---
  const searchResults = React.useMemo<SearchResultItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const courseResults: SearchResultItem[] = courses
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      )
      .map(c => ({
        id: c.id,
        title: c.title,
        subtitle: `${c.brand} • ${c.category}`,
        thumbnail: c.thumbnail,
        type: 'course' as const,
      }));

    const productResults: SearchResultItem[] = products
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      )
      .map(p => ({
        id: p.id,
        title: p.title,
        subtitle: `${p.code ? p.code + ' • ' : ''}${p.brand} • ${p.category}`,
        thumbnail: p.thumbnail,
        type: 'product' as const,
      }));

    return [...courseResults, ...productResults];
  }, [searchQuery, courses, products]);

  const courseMatches = searchResults.filter(r => r.type === 'course');
  const productMatches = searchResults.filter(r => r.type === 'product');

  const handleResultClick = (item: SearchResultItem) => {
    if (item.type === 'course') {
      onCourseClick(item.id);
    } else {
      onProductClick(item.id);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persistReadState(updated);
      return updated;
    });
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: !n.read } : n);
      persistReadState(updated);
      return updated;
    });
  };

  return (
    <header className="h-24 border-b border-zinc-900 bg-[#09090B]/80 backdrop-blur-3xl sticky top-0 z-10 px-12 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-500 opacity-50" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ">DoScom Enterprise • Ha Noi Hub</span>
        </div>
        
        {/* ========== SEARCH with dropdown ========== */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="flex items-center text-sm text-zinc-500 bg-zinc-900/50 px-6 py-3 rounded-2xl border border-zinc-800/50 w-[450px] group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
            <Search className="w-5 h-5 mr-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors flex-shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => { if (searchQuery.trim()) setShowSearchResults(true); }}
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearchResults(false); setSearchQuery(''); }}}
              placeholder="Tìm khóa học, sản phẩm, mã SP..." 
              className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase  tracking-[0.05em]"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearchResults(false); }} className="ml-2 p-1 rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 mt-3 w-[500px] bg-[#0C0C0E] border border-zinc-800 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
                {searchResults.length === 0 ? (
                  <div className="px-8 py-12 text-center">
                    <Search className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                    <p className="text-sm font-bold text-zinc-500">Không tìm thấy kết quả</p>
                    <p className="text-[10px] text-zinc-700 mt-1 uppercase tracking-widest">Thử từ khóa khác</p>
                  </div>
                ) : (
                  <>
                    {/* Course Results */}
                    {courseMatches.length > 0 && (
                      <div>
                        <div className="px-6 pt-5 pb-2 flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Khóa học ({courseMatches.length})</span>
                        </div>
                        {courseMatches.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-emerald-500/5 transition-all group text-left"
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 shadow-lg">
                              <img src={item.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-zinc-200 truncate uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{item.title}</p>
                              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{item.subtitle}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Divider */}
                    {courseMatches.length > 0 && productMatches.length > 0 && (
                      <div className="mx-6 border-t border-zinc-900" />
                    )}

                    {/* Product Results */}
                    {productMatches.length > 0 && (
                      <div>
                        <div className="px-6 pt-5 pb-2 flex items-center gap-2">
                          <Box className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Sản phẩm ({productMatches.length})</span>
                        </div>
                        {productMatches.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-blue-500/5 transition-all group text-left"
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 shadow-lg">
                              <img src={item.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-zinc-200 truncate uppercase tracking-tight group-hover:text-blue-400 transition-colors">{item.title}</p>
                              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{item.subtitle}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="h-3" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1.5 ">Xin chào</p>
            <p className="text-sm font-black text-white leading-none tracking-tight ">
              {employee.full_name}
            </p>
        </div>
        
        <div className="h-10 w-[2px] bg-zinc-900" />
        
        {/* ========== NOTIFICATIONS dropdown ========== */}
        <div className="relative" ref={notifRef}>
            <div
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "w-14 h-14 rounded-2xl border flex items-center justify-center group cursor-pointer transition-all shadow-xl",
                showNotifications
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              )}
            >
                <Bell className={cn("w-6 h-6 transition-colors", showNotifications ? "text-emerald-500" : "text-zinc-500 group-hover:text-emerald-500")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-[#09090B] text-[9px] flex items-center justify-center font-black text-white shadow-lg">
                    {unreadCount}
                  </span>
                )}
            </div>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-[420px] bg-[#0C0C0E] border border-zinc-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Thông báo</h3>
                    {unreadCount > 0 && (
                      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full uppercase tracking-widest">{unreadCount} mới</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[9px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-[380px] overflow-y-auto scrollbar-hide">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleToggleRead(notif.id)}
                      className={cn(
                        "px-6 py-4 flex items-start gap-4 cursor-pointer transition-all border-b border-zinc-900/50 last:border-b-0",
                        notif.read
                          ? "opacity-50 hover:opacity-80"
                          : "bg-emerald-500/[0.02] hover:bg-emerald-500/5"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center", notif.iconBg)}>
                        <notif.icon className={cn("w-5 h-5", notif.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-xs font-black uppercase tracking-tight", notif.read ? "text-zinc-500" : "text-zinc-200")}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-600 font-medium mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className="w-3 h-3 text-zinc-700" />
                          <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">{notif.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-900 bg-black/20">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                    Hiển thị {notifications.length} thông báo gần nhất
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </header>
  );
};

// ============================================================
// LAYOUT
// ============================================================
interface LayoutProps {
  currentView: ViewType;
  onNavigate: (view: string) => void;
  employee: Employee;
  onLogout: () => void;
  onChangePassword: () => void;
  courses: Course[];
  products: Product[];
  onCourseClick: (courseId: string) => void;
  onProductClick: (productId: string) => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onNavigate, employee, courses, products, onCourseClick, onProductClick, children }: LayoutProps) {
  const handleSetView = (view: ViewType) => {
    const viewMap: Record<ViewType, string> = {
      [ViewType.DASHBOARD]: 'dashboard',
      [ViewType.PRODUCT_LIBRARY]: 'products',
      [ViewType.PRODUCT_DETAIL]: 'products',
      [ViewType.COURSE_CATALOG]: 'courses',
      [ViewType.COURSE_DETAIL]: 'courses',
      [ViewType.QUIZ]: 'courses',
      [ViewType.REPORT]: 'report',
      [ViewType.ADMIN]: 'admin',
      [ViewType.PROFILE]: 'profile',
      [ViewType.LOGIN]: 'dashboard',
      [ViewType.FORGOT_PASSWORD]: 'dashboard',
      [ViewType.RESET_PASSWORD]: 'dashboard',
    };
    onNavigate(viewMap[view] || 'dashboard');
  };

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white">
      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        employee={employee}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar
          employee={employee}
          courses={courses}
          products={products}
          onCourseClick={onCourseClick}
          onProductClick={onProductClick}
        />
        <main className="flex-1 overflow-y-auto p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
