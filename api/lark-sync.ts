/**
 * Vercel Serverless Function — Lark Bitable Sync (Delete + Create)
 * Nhận records từ frontend → xóa toàn bộ dữ liệu cũ → tạo mới toàn bộ
 *
 * Cơ chế:
 * 1. Lấy tenant_access_token từ Lark API
 * 2. Fetch toàn bộ record_id hiện tại trên Bitable
 * 3. Batch delete tất cả records cũ
 * 4. Batch create toàn bộ records mới
 * 5. Trả kết quả về frontend
 *
 * Endpoint: POST /api/lark-sync
 * Body: { records: [{ fields: { summary_key, ... } }] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

// ── Lấy tenant access token ────────────────────────────────────────────
async function getTenantAccessToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark auth error: ${data.msg} (code: ${data.code})`);
  }
  return data.tenant_access_token;
}

// ── Fetch tất cả record_id hiện tại ────────────────────────────────────
async function fetchAllRecordIds(
  token: string, appToken: string, tableId: string
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: '500' });
    if (pageToken) params.set('page_token', pageToken);

    const res = await fetch(
      `${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Lark list records error: ${data.msg} (code: ${data.code})`);
    }

    for (const item of (data.data?.items || [])) {
      if (item.record_id) {
        ids.push(item.record_id);
      }
    }

    pageToken = data.data?.has_more ? data.data.page_token : undefined;
  } while (pageToken);

  return ids;
}

// ── Batch delete records ────────────────────────────────────────────────
async function batchDelete(
  token: string, appToken: string, tableId: string,
  recordIds: string[]
): Promise<{ deleted: number; errors: string[] }> {
  if (recordIds.length === 0) return { deleted: 0, errors: [] };

  let deleted = 0;
  const errors: string[] = [];

  // Lark API batch limit: 500 records per call
  for (let i = 0; i < recordIds.length; i += 500) {
    const batch = recordIds.slice(i, i + 500);
    const res = await fetch(
      `${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: batch }),
      }
    );

    const data = await res.json();
    if (data.code === 0) {
      deleted += batch.length;
    } else {
      errors.push(`Batch delete error: ${data.msg} (code: ${data.code})`);
    }
  }

  return { deleted, errors };
}

// ── Batch create records ────────────────────────────────────────────────
async function batchCreate(
  token: string, appToken: string, tableId: string,
  records: any[]
): Promise<{ created: number; errors: string[] }> {
  if (records.length === 0) return { created: 0, errors: [] };

  let created = 0;
  const errors: string[] = [];

  // Lark API batch limit: 500 records per call
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    const res = await fetch(
      `${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: batch }),
      }
    );

    const data = await res.json();
    if (data.code === 0) {
      created += (data.data?.records || []).length;
    } else {
      errors.push(`Batch create error: ${data.msg} (code: ${data.code})`);
    }
  }

  return { created, errors };
}

// ══════════════════════════════════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Missing or empty records array' });
    }

    // Lấy env vars
    const appId = process.env.LARK_APP_ID;
    const appSecret = process.env.LARK_APP_SECRET;
    const appToken = process.env.LARK_BITABLE_APP_TOKEN;
    const tableId = process.env.LARK_BITABLE_TABLE_ID;

    if (!appId || !appSecret || !appToken || !tableId) {
      return res.status(500).json({ error: 'Missing Lark API configuration (LARK_APP_ID, LARK_APP_SECRET, LARK_BITABLE_APP_TOKEN, LARK_BITABLE_TABLE_ID)' });
    }

    // 1. Auth
    const token = await getTenantAccessToken(appId, appSecret);

    // 2. Fetch all existing record IDs
    const existingIds = await fetchAllRecordIds(token, appToken, tableId);

    // 3. Delete all existing records
    const deleteResult = await batchDelete(token, appToken, tableId, existingIds);

    // 4. Create all new records
    const createResult = await batchCreate(token, appToken, tableId, records);

    const allErrors = [...deleteResult.errors, ...createResult.errors];

    return res.status(200).json({
      success: allErrors.length === 0,
      deleted: deleteResult.deleted,
      created: createResult.created,
      total: records.length,
      errors: allErrors,
    });

  } catch (error: any) {
    console.error('Lark sync error:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message || 'Unknown error',
    });
  }
}
