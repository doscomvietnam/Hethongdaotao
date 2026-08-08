/**
 * Vercel Serverless Function — Hồ sơ sản phẩm
 * Đọc Google Sheet (server-side, tránh CORS) → trả JSON cho web.
 * Sửa trên sheet là web tự cập nhật (cache 2 phút ở edge).
 *
 * Endpoint: GET /api/product-profiles
 * Đổi sheet: đặt biến môi trường PRODUCT_SHEET_ID trên Vercel (mặc định dùng sheet hiện tại).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';

const DEFAULT_SHEET_ID = '1hR7ofSGCbasWD4ekbqJFRXjtzFUxrxjkj6mXbpjjyRk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = process.env.PRODUCT_SHEET_ID || DEFAULT_SHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: 'Không tải được Google Sheet. Kiểm tra quyền chia sẻ "Bất kỳ ai có link đều xem".' });
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false });

    // Dòng 0 = nhóm (merge, chỉ ô đầu có tên), dòng 1 = tên trường, dòng 2 = hướng dẫn, dòng 3+ = sản phẩm
    const groupsRaw: any[] = rows[0] || [];
    const fieldsRaw: any[] = rows[1] || [];
    let curGroup = '';
    const idx: number[] = [];
    const fields: string[] = [];
    const groups: string[] = [];
    fieldsRaw.forEach((f: any, i: number) => {
      if (groupsRaw[i] != null && String(groupsRaw[i]).trim()) curGroup = String(groupsRaw[i]).trim();
      if (f != null && String(f).trim()) { idx.push(i); fields.push(String(f).trim()); groups.push(curGroup); }
    });

    const products = rows.slice(3)
      .filter((rw) => rw && rw[0] != null && String(rw[0]).trim())
      .map((rw) => ({ values: idx.map((i) => { const v = rw[i]; return v == null ? '' : String(v).trim(); }) }));

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ fields, groups, products, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ khi đọc sheet' });
  }
}
