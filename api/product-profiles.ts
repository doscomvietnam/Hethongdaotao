/**
 * Vercel Serverless Function — Hồ sơ sản phẩm (lưu trong Supabase Storage, KHÔNG dùng Google Sheet nữa)
 *  - GET  /api/product-profiles           → đọc JSON { fields, groups, products }
 *  - POST /api/product-profiles (admin)   → ghi đè JSON (cần Authorization: Bearer <supabase access_token>)
 * File lưu ở: bucket 'lms-assets', path 'product-profiles/data.json'
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'lms-assets';
const PATH = 'product-profiles/data.json';
const svc = () => createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const s = svc();

  if (req.method === 'GET') {
    try {
      const { data, error } = await s.storage.from(BUCKET).download(PATH);
      if (error || !data) return res.status(200).json({ fields: [], groups: [], products: [] });
      const txt = await data.text();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(JSON.parse(txt));
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Lỗi đọc dữ liệu' });
    }
  }

  if (req.method === 'POST') {
    try {
      // Chỉ admin/manager mới được lưu — xác thực qua access token của Supabase
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
      const { data: u, error: ue } = await s.auth.getUser(token);
      if (ue || !u?.user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
      const { data: emp } = await s.from('employees').select('role').eq('auth_user_id', u.user.id).single();
      if (!emp || !['admin', 'manager'].includes(emp.role)) return res.status(403).json({ error: 'Bạn không có quyền sửa hồ sơ sản phẩm' });

      const payload = req.body;
      if (!payload || !Array.isArray(payload.fields) || !Array.isArray(payload.products)) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }
      const clean = {
        fields: payload.fields.map((f: any) => String(f ?? '')),
        groups: Array.isArray(payload.groups) ? payload.groups.map((g: any) => String(g ?? '')) : [],
        products: payload.products.map((p: any) => ({ values: (p?.values || []).map((v: any) => String(v ?? '')) })),
        updatedAt: new Date().toISOString(),
      };
      const body = Buffer.from(JSON.stringify(clean), 'utf8');
      const { error } = await s.storage.from(BUCKET).upload(PATH, body, { contentType: 'application/json', upsert: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, updatedAt: clean.updatedAt });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Lỗi lưu dữ liệu' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
