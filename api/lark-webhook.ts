/**
 * Vercel Serverless Function — Lark Webhook Proxy
 * Chuyển tiếp request từ frontend → Lark Anycross để tránh CORS
 * 
 * Endpoint: POST /api/lark-webhook
 * Body: { webhookUrl: string, payload: object }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookUrl, payload } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({ error: 'Missing webhookUrl' });
    }

    // Validate URL is a Lark Anycross URL
    const url = new URL(webhookUrl);
    if (!url.hostname.endsWith('.larksuite.com') && url.hostname !== 'larksuite.com' &&
        !url.hostname.endsWith('.feishu.cn') && url.hostname !== 'feishu.cn') {
      return res.status(400).json({ error: 'Invalid webhook URL — must be a Lark/Feishu domain' });
    }

    // Forward request to Lark Anycross
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.text();

    // Try to parse as JSON
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { raw: data };
    }

    return res.status(response.status).json(jsonData);
  } catch (error: any) {
    console.error('Lark webhook proxy error:', error);
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message || 'Unknown error',
    });
  }
}
