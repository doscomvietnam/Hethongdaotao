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
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { ViewType, Employee, Course, Product } from '../../types';
import { cn } from '../../lib/utils';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  checkCourseDeadlines,
  type NotificationItem,
} from '../../services/notificationService';

// ============================================================
// NOTIFICATION HELPERS
// ============================================================
function notifIcon(type: string): { icon: React.ElementType; color: string; bg: string } {
  switch (type) {
    case 'course_new':              return { icon: BookOpen,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'course_updated':          return { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10' };
    case 'course_deadline_warning':  return { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10' };
    case 'course_overdue':          return { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10' };
    case 'quiz_result':             return { icon: CheckCircle2,  color: 'text-blue-400',    bg: 'bg-blue-500/10' };
    case 'system':                  return { icon: Megaphone,     color: 'text-purple-400',  bg: 'bg-purple-500/10' };
    default:                        return { icon: Bell,          color: 'text-zinc-400',    bg: 'bg-zinc-500/10' };
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

// ============================================================
// SIDEBAR
// ============================================================
interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  employee: Employee;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ currentView, setView, employee, collapsed, onToggleCollapse }: SidebarProps) => {
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
    <aside
      className={cn(
        'border-r border-zinc-900 bg-[#0C0C0E] h-screen sticky top-0 flex flex-col z-20 overflow-hidden transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className={cn(
        'flex items-center justify-center border-b border-zinc-900/50 transition-all duration-300',
        collapsed ? 'px-2 py-5' : 'px-6 py-8'
      )}>
        <img
          src="/logo.png"
          alt="DOSCOM Academy"
          className={cn(
            'w-auto object-contain select-none transition-all duration-300',
            collapsed ? 'h-12' : 'h-32'
          )}
          draggable={false}
        />
      </div>

      <nav className={cn(
        'flex-1 space-y-4 py-10 overflow-y-auto scrollbar-hide transition-all duration-300',
        collapsed ? 'px-2' : 'px-6'
      )}>
        <div className={cn(
          'flex items-center mb-6',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}>
          {!collapsed && (
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Hệ thống nội bộ</span>
          )}
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group flex-shrink-0"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? (
              <PanelLeft className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            )}
          </button>
        </div>
        
        {menuItems.map((item) => {
          const isActive = currentView.startsWith(item.id.split('-')[0]);
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => setView(item.id)}
                className={cn(
                  'w-full flex items-center rounded-2xl font-black transition-all relative',
                  collapsed
                    ? 'justify-center px-0 py-4 text-xs'
                    : 'gap-4 px-5 py-4 text-xs uppercase tracking-widest',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_15px_#10B981]" />
                )}
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-zinc-300')} />
                {!collapsed && (
                  <>
                    <span className="uppercase tracking-widest">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
                  </>
                )}
              </button>
              {/* Tooltip khi collapsed */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black text-zinc-200 uppercase tracking-widest whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-zinc-800" />
                </div>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className={cn('border-t border-zinc-900/50 my-4', collapsed ? 'mx-2' : 'mx-4')} />

        {/* Hướng dẫn sử dụng — trang nhúng */}
        <div className="relative group">
          <button
            onClick={() => setView(ViewType.GUIDE)}
            className={cn(
              'w-full flex items-center rounded-2xl font-black transition-all',
              collapsed
                ? 'justify-center px-0 py-4 text-xs'
                : 'gap-4 px-5 py-4 text-xs uppercase tracking-widest',
              currentView === ViewType.GUIDE
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
            )}
          >
            {currentView === ViewType.GUIDE && (
              <div className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_15px_#10B981]" />
            )}
            <FileText className={cn('w-5 h-5 flex-shrink-0', currentView === ViewType.GUIDE ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-zinc-300')} />
            {!collapsed && (
              <>
                <span className="uppercase tracking-widest">Hướng dẫn sử dụng</span>
                {currentView === ViewType.GUIDE && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
              </>
            )}
          </button>
          {/* Tooltip khi collapsed */}
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black text-zinc-200 uppercase tracking-widest whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 shadow-xl">
              Hướng dẫn sử dụng
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-zinc-800" />
            </div>
          )}
        </div>
      </nav>


      <div className={cn(
        'border-t border-zinc-900 bg-black/20 transition-all duration-300',
        collapsed ? 'p-3' : 'p-8'
      )}>
        <div
          onClick={() => setView(ViewType.PROFILE)}
          className={cn(
            "rounded-2xl border flex items-center group cursor-pointer transition-all",
            collapsed ? 'p-3 justify-center' : 'p-5 gap-4',
            currentView === ViewType.PROFILE
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800"
          )}
        >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex-shrink-0 overflow-hidden ring-1 ring-zinc-700/50 shadow-inner relative">
                 {employee.avatar_url ? (
                   <img
                     src={employee.avatar_url}
                     alt={employee.full_name}
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       const img = e.currentTarget as HTMLImageElement;
                       img.style.display = 'none';
                       const fallback = img.nextElementSibling as HTMLElement | null;
                       if (fallback) fallback.style.display = 'flex';
                     }}
                   />
                 ) : null}
                 <div
                   className="w-full h-full bg-emerald-500/10 absolute inset-0 items-center justify-center"
                   style={{ display: employee.avatar_url ? 'none' : 'flex' }}
                 >
                    <span className="text-emerald-500 font-black text-xs uppercase">
                      {getInitials(employee.full_name)}
                    </span>
                 </div>
            </div>
            {!collapsed && (
              <>
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
              </>
            )}
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
  onNotificationCourseClick?: (courseId: string) => void;
}

export const Navbar = ({ employee, courses, products, onCourseClick, onProductClick, onNotificationCourseClick }: NavbarProps) => {
  // --- Search state ---
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // --- Notifications từ Supabase ---
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const refreshNotifications = React.useCallback(async () => {
    if (!employee?.id) return;
    // Check deadlines trước khi load notifications (tạo notifications mới nếu cần)
    try { await checkCourseDeadlines(employee.id, employee.department); } catch { /* ignore */ }
    setLoadingNotifs(true);
    try {
      const data = await getNotifications(employee.id, 30);
      setNotifications(data);
    } finally {
      setLoadingNotifs(false);
    }
  }, [employee?.id, employee?.department]);

  // Tải lần đầu + reload mỗi 60s khi tab active
  React.useEffect(() => {
    refreshNotifications();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refreshNotifications();
    }, 60_000);
    return () => clearInterval(t);
  }, [refreshNotifications]);

  // Refresh khi mở panel
  React.useEffect(() => {
    if (showNotifications) refreshNotifications();
  }, [showNotifications, refreshNotifications]);

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

  const handleMarkAllRead = async () => {
    if (!employee?.id) return;
    try { await markAllAsRead(employee.id); }
    catch (e) { console.error(e); }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      try { await markAsRead(n.id); } catch (e) { console.error(e); }
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link_view === 'course-detail' && n.link_id && onNotificationCourseClick) {
      onNotificationCourseClick(n.link_id);
      setShowNotifications(false);
    }
  };

  return (
    <header className="h-24 border-b border-zinc-900 bg-[#09090B]/80 backdrop-blur-3xl sticky top-0 z-50 px-4 lg:px-8 xl:px-12 flex items-center justify-between">
      <div className="flex items-center gap-4 lg:gap-8 xl:gap-12">
        <div className="flex items-center gap-3 flex-shrink-0">
            <Building2 className="w-5 h-5 text-emerald-500 opacity-50" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden lg:inline">DOSCOM HOLDINGS COMPANY LIMITED</span>
        </div>
        
        {/* ========== SEARCH with dropdown ========== */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="flex items-center text-sm text-zinc-500 bg-zinc-900/50 px-6 py-3 rounded-2xl border border-zinc-800/50 w-[260px] lg:w-[320px] xl:w-[400px] 2xl:w-[450px] group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
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
            <div className="absolute top-full left-0 mt-3 w-[500px] bg-[#0C0C0E] border border-zinc-800 rounded-3xl shadow-lg shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

      <div className="flex items-center gap-2 lg:gap-3 xl:gap-5 flex-shrink-0">
        <div className="flex flex-col items-center min-w-0">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1.5">Xin chào</p>
            <p className="text-sm font-black text-white leading-none tracking-tight whitespace-nowrap">
              {employee.full_name}
            </p>
        </div>
        
        <div className="h-10 w-[2px] bg-zinc-900" />
        
        {/* ========== NOTIFICATIONS dropdown ========== */}
        <div className="relative" ref={notifRef}>
            <div
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "w-14 h-14 rounded-2xl border flex items-center justify-center group cursor-pointer transition-all",
                showNotifications
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              )}
            >
                <Bell className={cn("w-6 h-6 transition-colors", showNotifications ? "text-emerald-500" : "text-zinc-500 group-hover:text-emerald-500")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-[#09090B] text-[9px] flex items-center justify-center font-black text-white">
                    {unreadCount}
                  </span>
                )}
            </div>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-[420px] bg-[#0C0C0E] border border-zinc-800 rounded-3xl shadow-lg shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                  {loadingNotifs && notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Đang tải thông báo...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Bell className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Chưa có thông báo nào</p>
                      <p className="text-[9px] text-zinc-700 mt-2 font-bold uppercase tracking-widest">Khi có khóa học mới hoặc nhắc nhở, bạn sẽ thấy ở đây</p>
                    </div>
                  ) : notifications.map((notif) => {
                    const meta = notifIcon(notif.type);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={cn(
                          "px-6 py-4 flex items-start gap-4 cursor-pointer transition-all border-b border-zinc-900/50 last:border-b-0",
                          notif.is_read
                            ? "opacity-60 hover:opacity-90"
                            : "bg-emerald-500/[0.02] hover:bg-emerald-500/5"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center", meta.bg)}>
                          <Icon className={cn("w-5 h-5", meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-xs font-black uppercase tracking-tight", notif.is_read ? "text-zinc-500" : "text-zinc-200")}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          {notif.message && (
                            <p className="text-[10px] text-zinc-500 font-medium mt-1 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock className="w-3 h-3 text-zinc-700" />
                            <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">{timeAgo(notif.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-900 bg-black/20">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                    {notifications.length === 0 ? 'Chưa có thông báo' : `Hiển thị ${notifications.length} thông báo gần nhất`}
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
  // Sidebar collapsed state — persisted to localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

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
      [ViewType.GUIDE]: 'guide',
    };
    onNavigate(viewMap[view] || 'dashboard');
  };

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white">
      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        employee={employee}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar
          employee={employee}
          courses={courses}
          products={products}
          onCourseClick={onCourseClick}
          onProductClick={onProductClick}
          onNotificationCourseClick={onCourseClick}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 xl:p-12">
          <div className="max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
