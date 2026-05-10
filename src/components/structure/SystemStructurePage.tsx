import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  type Node,
  type Edge,
  Position,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch } from 'lucide-react';

// ─── Custom Node Data ────────────────────────────────────────────────────────
interface RoleNodeData {
  label: string;
  subtitle?: string;
  icon?: string;
  items?: string[];
  blocked?: string[];
  nodeType: 'system' | 'admin' | 'manager' | 'employee' | 'shared' | 'denied';
  [key: string]: unknown;
}

const PALETTE: Record<string, { bg: string; border: string; text: string; sub: string; accent: string }> = {
  system:   { bg: 'from-emerald-500/30 to-teal-500/10',   border: 'border-emerald-500/60', text: 'text-emerald-300',  sub: 'text-emerald-500/70', accent: '#10B981' },
  admin:    { bg: 'from-emerald-500/20 to-emerald-600/5',  border: 'border-emerald-500/40', text: 'text-emerald-300',  sub: 'text-emerald-400/60', accent: '#10B981' },
  manager:  { bg: 'from-blue-500/20 to-indigo-500/5',      border: 'border-blue-500/40',    text: 'text-blue-300',     sub: 'text-blue-400/60',    accent: '#3B82F6' },
  employee: { bg: 'from-purple-500/15 to-purple-600/5',    border: 'border-purple-500/30',  text: 'text-purple-300',   sub: 'text-purple-400/60',  accent: '#A855F7' },
  shared:   { bg: 'from-cyan-500/15 to-cyan-600/5',        border: 'border-cyan-500/30',    text: 'text-cyan-300',     sub: 'text-cyan-400/60',    accent: '#06B6D4' },
  denied:   { bg: 'from-red-500/15 to-red-600/5',          border: 'border-red-500/30',     text: 'text-red-400',      sub: 'text-red-400/60',     accent: '#EF4444' },
};

function RoleNode({ data }: { data: RoleNodeData }) {
  const s = PALETTE[data.nodeType] || PALETTE.shared;
  return (
    <div className={`px-5 py-4 rounded-2xl border bg-gradient-to-br ${s.bg} ${s.border} backdrop-blur-sm shadow-xl min-w-[210px] max-w-[290px] relative`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500" />
      {data.icon && <span className="text-2xl mb-1 block text-center">{data.icon}</span>}
      <p className={`text-[11px] font-black uppercase tracking-widest ${s.text} leading-tight text-center`}>
        {data.label}
      </p>
      {data.subtitle && (
        <p className={`text-[9px] font-bold mt-1.5 leading-relaxed ${s.sub} text-center`}>
          {data.subtitle}
        </p>
      )}
      {data.items && data.items.length > 0 && (
        <ul className={`mt-3 space-y-1 text-[9px] font-semibold ${s.sub}`}>
          {data.items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className={`${s.text} font-black flex-shrink-0`}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {data.blocked && data.blocked.length > 0 && (
        <ul className="mt-3 space-y-1 text-[9px] font-semibold text-red-400/80">
          {data.blocked.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-red-500 font-black flex-shrink-0">✗</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500" />
    </div>
  );
}

const nodeTypes = { roleNode: RoleNode };

const mk = (color: string) => ({ type: MarkerType.ArrowClosed, color });

// ─── Build Diagram ───────────────────────────────────────────────────────────
function buildDiagram(): { nodes: Node[]; edges: Edge[] } {
  const nd = (id: string, x: number, y: number, data: RoleNodeData): Node => ({
    id, type: 'roleNode', position: { x, y }, data,
    sourcePosition: Position.Bottom, targetPosition: Position.Top,
  });

  const ed = (src: string, tgt: string, color: string, w = 2, label?: string, animated = false): Edge => ({
    id: `${src}-${tgt}`, source: src, target: tgt, type: 'smoothstep',
    style: { stroke: color, strokeWidth: w },
    markerEnd: mk(color), animated,
    ...(label ? {
      label, labelStyle: { fill: color, fontSize: 9, fontWeight: 800 },
      labelBgStyle: { fill: '#0C0C0E', fillOpacity: 0.9 },
      labelBgPadding: [6, 4] as [number, number], labelBgBorderRadius: 6,
    } : {}),
  });

  // Layout
  const CX = 0;
  const COL = 440;
  const L = CX - COL, R = CX + COL;

  const nodes: Node[] = [
    // ── Row 0: Title ──
    nd('system', CX, 0, {
      label: 'HỆ THỐNG ĐÀO TẠO NỘI BỘ DOSCOM',
      subtitle: 'Phân quyền theo 3 vai trò: Admin • Manager • Employee',
      icon: '🏢', nodeType: 'system',
    }),

    // ── Row 1: Auth ──
    nd('login', CX, 160, {
      label: 'ĐĂNG NHẬP & XÁC THỰC',
      subtitle: 'Hệ thống kiểm tra role từ database',
      icon: '🔐',
      items: ['Đăng nhập email + mật khẩu', 'Đổi mật khẩu lần đầu', 'Quên mật khẩu qua email'],
      nodeType: 'shared',
    }),

    // ── Row 2: 3 Roles ──
    nd('admin', L, 420, { label: '🛡️ ADMIN', subtitle: 'Quản trị viên — Full quyền hệ thống', nodeType: 'admin' }),
    nd('manager', CX, 420, { label: '👔 MANAGER', subtitle: 'Quản lý phòng ban — Dữ liệu phòng mình', nodeType: 'manager' }),
    nd('employee', R, 420, { label: '👤 EMPLOYEE', subtitle: 'Nhân viên — Người học trong hệ thống', nodeType: 'employee' }),

    // ── Shared Features (center bottom) ──
    nd('shared', CX, 600, {
      label: 'CHỨC NĂNG CHUNG', subtitle: 'Tất cả vai trò đều truy cập được', icon: '📚',
      items: ['Xem giới thiệu sản phẩm', 'Xem & học khóa đào tạo', 'Xem video / slide bài giảng', 'Làm bài kiểm tra quiz', 'Xem & sửa hồ sơ cá nhân', 'Nhận thông báo hệ thống'],
      nodeType: 'shared',
    }),

    // ── Admin Features ──
    nd('a_dash', L - 210, 600, {
      label: 'DASHBOARD TOÀN HỆ THỐNG', icon: '📊',
      items: ['Thống kê toàn bộ nhân viên', 'Biểu đồ tất cả phòng ban', 'Tỷ lệ hoàn thành toàn công ty', 'Xuất báo cáo Excel'],
      nodeType: 'admin',
    }),
    nd('a_emp', L - 210, 870, {
      label: 'QUẢN LÝ NHÂN VIÊN', subtitle: 'Tất cả phòng ban', icon: '👥',
      items: ['Xem tất cả nhân viên', 'Thêm / Sửa / Xóa bất kỳ', 'Phân quyền: admin, manager, employee', 'Chọn bất kỳ phòng ban'],
      nodeType: 'admin',
    }),
    nd('a_course', L - 210, 1160, {
      label: 'QUẢN LÝ KHÓA HỌC', subtitle: 'Tất cả khóa học hệ thống', icon: '🎓',
      items: ['Xem tất cả khóa học', 'Thêm / Sửa / Xóa bất kỳ', 'Gán phòng ban tùy ý', 'Tạo quiz kèm khóa học'],
      nodeType: 'admin',
    }),
    nd('a_extra', L - 210, 1420, {
      label: 'CHỨC NĂNG ĐẶC BIỆT', subtitle: 'Chỉ Admin mới có', icon: '⚙️',
      items: ['Quản lý sản phẩm', 'Cài đặt hệ thống', 'Xuất báo cáo Excel toàn hệ thống'],
      nodeType: 'admin',
    }),

    // ── Manager Features ──
    nd('m_dash', CX, 870, {
      label: 'DASHBOARD PHÒNG BAN', icon: '📊',
      items: ['Thống kê nhân viên phòng mình', 'Biểu đồ chỉ phòng ban mình', 'Không được xuất Excel'],
      nodeType: 'manager',
    }),
    nd('m_emp', CX, 1120, {
      label: 'QUẢN LÝ NHÂN VIÊN', subtitle: 'Chỉ phòng ban mình', icon: '👥',
      items: ['Xem nhân viên cùng phòng', 'Thêm / Sửa / Xóa (phòng mình)', 'Phân quyền: manager hoặc employee', 'Phòng ban: tự động = phòng mình'],
      blocked: ['Không tạo được tài khoản admin', 'Không xem nhân viên phòng khác'],
      nodeType: 'manager',
    }),
    nd('m_course', CX, 1440, {
      label: 'QUẢN LÝ KHÓA HỌC', subtitle: 'Phòng ban mình + Khóa chung', icon: '🎓',
      items: ['Xem: khóa học phòng mình + chung', 'Thêm / Sửa / Xóa: chỉ phòng mình', 'Khóa chung (tất cả PB): chỉ xem'],
      blocked: ['Không thấy khóa học phòng khác', 'Không sửa/xóa khóa học chung'],
      nodeType: 'manager',
    }),
    nd('m_denied', CX + 250, 1700, {
      label: '🚫 MANAGER KHÔNG ĐƯỢC', icon: '⛔',
      blocked: ['Tạo tài khoản admin', 'Xem dữ liệu phòng ban khác', 'Sửa/Xóa khóa học phòng khác', 'Quản lý sản phẩm', 'Cài đặt hệ thống', 'Xuất báo cáo Excel'],
      nodeType: 'denied',
    }),

    // ── Employee Features ──
    nd('e_dash', R + 210, 600, {
      label: 'DASHBOARD CÁ NHÂN', icon: '📊',
      items: ['Xem tiến độ học tập cá nhân', 'Khóa học đang học dở', 'Thành tích & cấp độ', 'Điểm quiz trung bình'],
      nodeType: 'employee',
    }),
    nd('e_learn', R + 210, 870, {
      label: 'HỌC TẬP', subtitle: 'Chức năng chính của Employee', icon: '📖',
      items: ['Xem khóa học phòng mình + chung', 'Học video / slide bài giảng', 'Làm bài kiểm tra quiz', 'Theo dõi tiến độ tự động'],
      nodeType: 'employee',
    }),
    nd('e_denied', R + 210, 1120, {
      label: '🚫 EMPLOYEE KHÔNG ĐƯỢC', icon: '⛔',
      blocked: ['Truy cập trang quản trị', 'Thêm / Sửa / Xóa dữ liệu', 'Tạo khóa học hoặc quiz', 'Xuất báo cáo', 'Xem dữ liệu nhân viên khác'],
      nodeType: 'denied',
    }),
  ];

  const edges: Edge[] = [
    ed('system', 'login', '#10B981', 3, 'XÁC THỰC', true),
    ed('login', 'admin',    '#10B981', 2.5, 'role = admin'),
    ed('login', 'manager',  '#3B82F6', 2.5, 'role = manager'),
    ed('login', 'employee', '#A855F7', 2.5, 'role = employee'),

    ed('admin',    'shared', '#10B981', 1.5),
    ed('manager',  'shared', '#3B82F6', 1.5),
    ed('employee', 'shared', '#A855F7', 1.5),

    ed('admin', 'a_dash', '#10B981', 2),
    ed('a_dash', 'a_emp', '#10B981', 2),
    ed('a_emp', 'a_course', '#10B981', 2),
    ed('a_course', 'a_extra', '#10B981', 2),

    ed('manager', 'm_dash', '#3B82F6', 2),
    ed('m_dash', 'm_emp', '#3B82F6', 2),
    ed('m_emp', 'm_course', '#3B82F6', 2),
    ed('m_course', 'm_denied', '#EF4444', 1.5, 'HẠN CHẾ'),

    ed('employee', 'e_dash', '#A855F7', 2),
    ed('e_dash', 'e_learn', '#A855F7', 2),
    ed('e_learn', 'e_denied', '#EF4444', 1.5, 'HẠN CHẾ'),
  ];

  return { nodes, edges };
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SystemStructurePage() {
  const { nodes, edges } = React.useMemo(() => buildDiagram(), []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <div className="flex items-center gap-4">
          <GitBranch className="w-8 h-8 text-emerald-500" />
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
            CẤU TRÚC PHÂN QUYỀN
          </h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
          Sơ đồ chức năng hệ thống theo 3 vai trò: Admin • Manager • Employee
        </p>
      </header>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        {[
          { color: 'bg-emerald-500', label: 'Admin — Full quyền' },
          { color: 'bg-blue-500', label: 'Manager — Phòng ban' },
          { color: 'bg-purple-500', label: 'Employee — Người học' },
          { color: 'bg-cyan-500', label: 'Chức năng chung' },
          { color: 'bg-red-500', label: 'Hạn chế / Bị cấm' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>

      {/* React Flow Canvas */}
      <div className="rounded-[2rem] border border-zinc-800 overflow-hidden bg-[#0C0C0E] shadow-2xl" style={{ height: '80vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1A1A1E" />
          <Controls
            showInteractive={false}
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-xl [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-emerald-500"
          />
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as unknown as RoleNodeData;
              const p = PALETTE[d?.nodeType];
              return p?.accent || '#52525B';
            }}
            maskColor="rgba(0,0,0,0.8)"
            className="!bg-zinc-950 !border-zinc-800 !rounded-xl"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
