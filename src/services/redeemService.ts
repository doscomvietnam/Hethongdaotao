import { supabase } from './supabaseClient';

/** Đổi quà bằng điểm — mọi truy cập qua serverless /api/redeem (bảng point_redemptions bật RLS). */
export type RedeemStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface RedeemBalance { earned: number; spent: number; available: number }
export interface RedeemRequest {
  id: string; gift_name: string; gift_link: string | null; status: RedeemStatus;
  points_spent: number; reject_reason: string | null; created_at: string; reviewed_at: string | null;
}
export interface AdminRedeemRequest extends RedeemRequest {
  employee_id: string; full_name: string; department: string | null; reviewer: string | null; balance: RedeemBalance;
}

export const REDEEM_STATUS_LABEL: Record<RedeemStatus, string> = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy',
};

async function call<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại');
  const r = await fetch('/api/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Có lỗi xảy ra, thử lại sau');
  return j as T;
}

export const getMyRedeem = () => call<{ balance: RedeemBalance; requests: RedeemRequest[] }>('mine');
export const createRedeem = (gift_name: string, gift_link?: string) => call<{ ok: true }>('create', { gift_name, gift_link });
export const cancelRedeem = (id: string) => call<{ ok: true }>('cancel', { id });

export const adminListRedeem = (status: RedeemStatus | 'all') =>
  call<{ pending: number; requests: AdminRedeemRequest[] }>('admin-list', { status });
export const approveRedeem = (id: string, points: number) => call<{ ok: true }>('approve', { id, points });
export const rejectRedeem = (id: string, reason: string) => call<{ ok: true }>('reject', { id, reason });

// ---- Điểm thưởng (admin cộng điểm kèm lý do) ----
export interface PointBonus {
  id: string; employee_id: string; full_name: string; department: string | null;
  points: number; reason: string; award_date: string; created_at: string; creator: string | null;
}
export const adminListBonus = (month: string) => call<{ month: string; bonuses: PointBonus[] }>('bonus-list', { month });
export const addBonus = (employee_id: string, points: number, reason: string) => call<{ ok: true }>('bonus-add', { employee_id, points, reason });
export const deleteBonus = (id: string) => call<{ ok: true }>('bonus-delete', { id });
