import { call } from './redeemService';
import { supabase } from './supabaseClient';

/** Đề xuất cải tiến — đi qua /api/redeem (action proposal-*) để không thêm serverless function. */
export type ProposalCategory = 'work' | 'hr' | 'operation' | 'culture';
export type ProposalStatus = 'reviewing' | 'approved' | 'rejected';

export const PROPOSAL_CATEGORIES: { id: ProposalCategory; label: string; hint: string }[] = [
  { id: 'work', label: 'Công việc', hint: 'Cách làm, quy trình, công cụ giúp làm việc nhanh và tốt hơn' },
  { id: 'hr', label: 'Nhân sự', hint: 'Tuyển dụng, đào tạo, chế độ, phát triển con người' },
  { id: 'operation', label: 'Vận hành', hint: 'Kho, giao hàng, chi phí, phối hợp giữa các phòng' },
  { id: 'culture', label: 'Văn hóa', hint: 'Gắn kết, môi trường làm việc, hoạt động chung' },
];
export const CATEGORY_LABEL: Record<ProposalCategory, string> = {
  work: 'Công việc', hr: 'Nhân sự', operation: 'Vận hành', culture: 'Văn hóa',
};
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  reviewing: 'Xem xét', approved: 'Duyệt', rejected: 'Không duyệt',
};

export interface ProposalAttachment { path: string; name: string; size: number; url?: string | null }
export const MAX_ATTACH = 3;
export const MAX_ATTACH_MB = 10;
export const ATTACH_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip';

export interface Proposal {
  id: string; category: ProposalCategory; content: string; status: ProposalStatus;
  plan: string | null; attachments: ProposalAttachment[];
  points: number; admin_note: string | null; created_at: string; reviewed_at: string | null;
}
export interface AdminProposal extends Proposal {
  employee_id: string; full_name: string; department: string | null; reviewer: string | null;
}

/** Tải 1 file đính kèm thẳng lên kho (link ký sẵn do server cấp) → trả về thông tin để gửi kèm đề xuất */
export async function uploadProposalFile(file: File): Promise<ProposalAttachment> {
  const { path, token } = await call<{ path: string; token: string }>('proposal-upload-url', { name: file.name, size: file.size });
  const { error } = await supabase.storage.from('proposal-files').uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Không tải được file "${file.name}": ${error.message}`);
  return { path, name: file.name, size: file.size };
}
export const createProposal = (category: ProposalCategory, content: string, attachments: ProposalAttachment[]) =>
  call<{ ok: true }>('proposal-create', { category, content, attachments });
export const getMyProposals = (month: string) => call<{ month: string; proposals: Proposal[] }>('proposal-mine', { month });
export const withdrawProposal = (id: string) => call<{ ok: true }>('proposal-withdraw', { id });

export const adminListProposals = (month: string, status: ProposalStatus | 'all') =>
  call<{ month: string; reviewing: number; proposals: AdminProposal[] }>('proposal-list', { month, status });
export const reviewProposal = (id: string, status: ProposalStatus, points: number, note: string) =>
  call<{ ok: true }>('proposal-review', { id, status, points, note });
