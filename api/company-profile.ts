/**
 * Vercel Serverless Function — Hồ sơ công ty CÔNG KHAI (xem không cần đăng nhập).
 *  GET /api/company-profile → trả các khóa thuộc 3 thương hiệu "Hồ sơ công ty".
 *
 * Chỉ đọc, không xác thực. Dùng service_role để vượt RLS nhưng CHỈ trả về đúng
 * 3 brand công ty (không lộ dữ liệu khóa/nhân viên khác). Client tự map slide_url
 * → embed url (dùng cùng hàm convert với app).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const COMPANY_BRANDS = ['Tổng Quan Về Công Ty', 'Nội Quy - Quy Chế', 'Văn Hóa Công Ty'];
const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Chỉ hỗ trợ GET' });

  try {
    const s = svc();
    const { data, error } = await s
      .from('courses')
      .select('course_id, course_name, brand, category, slide_url, video_url')
      .in('brand', COMPANY_BRANDS)
      .eq('status', 'active')
      .order('course_id', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.status(200).json({ courses: data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
