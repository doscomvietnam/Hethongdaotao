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

// ── Build summary_key ───────────────────────────────────────────────────
function buildSummaryKey(row: any): string {
  return `${row.employee_id}_${row.course_id}`;
}

// ── Build record fields cho bảng course_summary ─────────────────────────
// STT đã được Lark Base tự đánh bằng field type "Auto Number" — không gửi từ frontend.
function buildRecordFields(row: any, _index: number): Record<string, any> {
  const hasQuiz = Boolean(row.courses?.quiz_id);
  const hasVideo = Boolean(row.courses?.video_url);
  const videoProg = row.video_progress || 0;

  return {
    'summary_key': buildSummaryKey(row),
    'Họ và tên': row.employees?.full_name || '—',
    'Email': row.employees?.email || '—',
    'Phòng ban': row.employees?.department || '—',
    'Khóa học': row.courses?.course_name || '—',
    'Nhóm đào tạo': row.courses?.brand || '—',
    'Tiến độ video': hasVideo ? `${videoProg}%` : '—',
    'Điểm quizz': hasQuiz ? String(row.quiz_score ?? '—') : '—',
    'Xếp loại': !hasQuiz ? '—' : (row.quiz_score != null ? (row.quiz_passed ? 'Đạt' : 'Không đạt') : 'Chưa làm'),
    'Thời gian làm bài': !hasQuiz ? '—' : (row.quiz_time_seconds != null ? `${Math.floor(row.quiz_time_seconds / 60)}p ${row.quiz_time_seconds % 60}s` : '—'),
    'Trạng thái': getStatus(row),
    'Ngày cập nhật': row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '—',
    'Ngày hoàn thành': row.quiz_completed_at ? new Date(row.quiz_completed_at).toLocaleString('vi-VN') : '—',
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
