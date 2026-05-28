/**
 * Lark AnyCross Webhook Sync Service (Upsert)
 * Đồng bộ báo cáo đào tạo từ Supabase → Lark Base qua AnyCross Webhook
 *
 * Cơ chế:
 * - Frontend loop từng record, POST /api/lark-webhook { webhookUrl, payload }.
 * - Proxy forward sang AnyCross Webhook URL.
 * - AnyCross workflow: Search by summary_key → IF found → Update | else → Create.
 * - summary_key = "{employee_id}_{course_id}" → an toàn retry, không tạo trùng.
 */

// ── Configuration ───────────────────────────────────────────────────────
const ENV_WEBHOOK_URL = import.meta.env.VITE_LARK_WEBHOOK_URL || '';
const LAST_SYNC_KEY = 'lark_last_sync_at';

const LARK_WEBHOOK_CONFIG = {
  WEBHOOK_URL: '',
};

// ── Config helpers ──────────────────────────────────────────────────────
export function setLarkWebhookUrl(url: string) {
  LARK_WEBHOOK_CONFIG.WEBHOOK_URL = url;
  try { localStorage.setItem('lark_webhook_url', url); } catch { }
}

export function getLarkWebhookUrl(): string {
  if (!LARK_WEBHOOK_CONFIG.WEBHOOK_URL) {
    try {
      LARK_WEBHOOK_CONFIG.WEBHOOK_URL =
        localStorage.getItem('lark_webhook_url') || ENV_WEBHOOK_URL;
    } catch {
      LARK_WEBHOOK_CONFIG.WEBHOOK_URL = ENV_WEBHOOK_URL;
    }
  }
  return LARK_WEBHOOK_CONFIG.WEBHOOK_URL;
}

export function isLarkConfigured(): boolean {
  return Boolean(getLarkWebhookUrl());
}

export function getLastSyncTimestamp(): string | null {
  try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; }
}

function setLastSyncTimestamp(iso: string) {
  try { localStorage.setItem(LAST_SYNC_KEY, iso); } catch { }
}

// ── Backward compat ─────────────────────────────────────────────────────
export function setLarkCredentials(_a: string, _b: string) { }
export function getLarkCredentials() { return { appId: '', appSecret: '' }; }

// ── Helper: determine status ────────────────────────────────────────────
function getStatus(row: any): string {
  const hasVideo = Boolean(row.courses?.video_url);
  const hasQuiz = Boolean(row.courses?.quiz_id);
  const isSlideOnly = !hasVideo && !hasQuiz;
  const videoProg = row.video_progress || 0;

  if (isSlideOnly) {
    return row.status === 'completed' ? 'Đã xem' : 'Chưa xem';
  } else if (hasVideo && !hasQuiz) {
    if (videoProg >= 100) return 'Hoàn thành';
    if (videoProg > 0) return 'Đang học';
    return 'Chưa bắt đầu';
  } else {
    if (row.quiz_completed_at) return 'Hoàn thành';
    if (videoProg > 0) return 'Đang học';
    return 'Chưa bắt đầu';
  }
}

function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const date = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${date}/${month}/${year}`;
}

function formatDateOnly(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${date}/${month}/${year}`;
}

// ── Build summary_key ───────────────────────────────────────────────────
function buildSummaryKey(row: any): string {
  return `${row.employee_id}_${row.course_id}`;
}

// ── Build record fields cho bảng course_summary ─────────────────────────
function buildRecordFields(row: any, _index: number): Record<string, any> {
  const hasQuiz = Boolean(row.courses?.quiz_id);
  const hasVideo = Boolean(row.courses?.video_url);
  const videoProg = row.video_progress || 0;
  const isSlideOnly = !hasVideo && !hasQuiz;

  return {
    'summary_key': buildSummaryKey(row),
    'Họ và tên': row.employees?.full_name || '—',
    'Email': row.employees?.email || '—',
    'Phòng ban': row.employees?.department || '—',
    'Khóa học': row.courses?.course_name || '—',
    'Nhóm đào tạo': row.courses?.brand || '—',
    'Tiến độ video': hasVideo ? `${videoProg}%` : '—',
    'Điểm quizz': hasQuiz && row.quiz_score != null ? Number(row.quiz_score) : null,
    'Xếp loại': !hasQuiz ? '—' : (row.quiz_score != null ? (row.quiz_passed ? 'Đạt' : 'Không đạt') : 'Chưa làm'),
    'Thời gian làm bài': !hasQuiz ? '—' : (row.quiz_time_seconds != null ? `${Math.floor(row.quiz_time_seconds / 60)}p ${row.quiz_time_seconds % 60}s` : '—'),
    'Trạng thái': getStatus(row),
    'Ngày cập nhật': formatDateTime(row.updated_at),
    'Ngày hoàn thành': row.quiz_completed_at
      ? formatDateOnly(row.quiz_completed_at)
      : (isSlideOnly && row.status === 'completed' && row.updated_at
        ? formatDateOnly(row.updated_at)
        : '—'),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN: Sync qua /api/lark-webhook → AnyCross workflow → Lark Bitable
// ══════════════════════════════════════════════════════════════════════════
export interface SyncResult {
  success: boolean;
  message: string;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  totalRecords: number;
  timestamp: string;
}

export type SyncProgressCallback = (stage: string, progress: number) => void;

export async function syncToLarkBase(
  progressData: any[],
  onProgress?: SyncProgressCallback,
): Promise<SyncResult> {
  const syncStartedAt = new Date().toISOString();
  const timestamp = new Date().toLocaleString('vi-VN');
  const webhookUrl = getLarkWebhookUrl();

  if (!webhookUrl) {
    return {
      success: false, message: 'Chưa cấu hình Webhook URL trên Admin.',
      recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0,
      totalRecords: 0, timestamp,
    };
  }

  if (progressData.length === 0) {
    return {
      success: true, message: 'no_data',
      recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0,
      totalRecords: 0, timestamp,
    };
  }

  // Deduplicate by summary_key
  onProgress?.('Đang chuẩn bị dữ liệu...', 5);
  const uniqueMap = new Map<string, any>();
  for (const row of progressData) {
    uniqueMap.set(buildSummaryKey(row), row);
  }
  const uniqueData = Array.from(uniqueMap.values());
  const total = uniqueData.length;

  console.log(`[Lark Sync] ${total} records (deduplicated from ${progressData.length})`);

  // Loop từng record gửi qua proxy → AnyCross workflow upsert
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < total; i++) {
    const fields = buildRecordFields(uniqueData[i], i);

    const progressPct = 5 + Math.round(((i + 1) / total) * 90);
    onProgress?.(`Đang đồng bộ ${i + 1}/${total}...`, progressPct);

    try {
      const res = await fetch('/api/lark-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, payload: fields }),
      });

      // Đọc body dạng text trước để tránh JSON.parse trên body rỗng
      const text = await res.text().catch(() => '');

      if (!res.ok) {
        failedCount++;
        errors.push(`Record ${i + 1}: HTTP ${res.status} ${text.slice(0, 200)}`);
      } else {
        sentCount++;
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`Record ${i + 1}: ${err.message || 'network error'}`);
    }

    if (i < total - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (sentCount > 0) {
    setLastSyncTimestamp(syncStartedAt);
  }

  onProgress?.('Hoàn thành!', 100);

  if (failedCount > 0 && errors.length > 0) {
    console.warn('[Lark Sync] Failures (showing first 10):', errors.slice(0, 10));
  }

  return {
    success: failedCount === 0,
    message: failedCount === 0 ? 'sync_success' : 'partial_sync',
    recordsCreated: sentCount,
    recordsUpdated: 0, // AnyCross workflow tự xử lý create vs update
    recordsSkipped: failedCount,
    totalRecords: total,
    timestamp,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Auto-sync 1 record sau khi user submit quiz
// ══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient';

/**
 * Push 1 record (1 cặp employee × course) lên Lark Base.
 * Gọi sau khi user submit quiz xong để Lark cập nhật real-time.
 * Silent: lỗi chỉ log console, không throw — tránh phá UX submit quiz.
 */
export async function pushSingleRowToLark(employeeId: string, courseId: string): Promise<void> {
  const webhookUrl = getLarkWebhookUrl();
  if (!webhookUrl) {
    console.log('[Lark auto-sync] Webhook chưa cấu hình → skip');
    return;
  }

  try {
    // Fetch row đầy đủ kèm join employees + courses
    const { data, error } = await supabase
      .from('training_progress')
      .select(`
        *,
        employees!fk_employee(full_name, department, email),
        courses!fk_course(course_name, brand, category, video_url, quiz_id)
      `)
      .eq('employee_id', employeeId)
      .eq('course_id', courseId)
      .single();

    if (error || !data) {
      console.warn('[Lark auto-sync] Không fetch được row:', error?.message);
      return;
    }

    const fields = buildRecordFields(data, 0);
    const res = await fetch('/api/lark-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, payload: fields }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[Lark auto-sync] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return;
    }

    console.log(`[Lark auto-sync] OK: ${data.employees?.full_name} × ${data.courses?.course_name}`);
  } catch (e: any) {
    console.warn('[Lark auto-sync] Exception:', e?.message || e);
  }
}
