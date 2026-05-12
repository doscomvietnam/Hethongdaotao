/**
 * Vercel Serverless Function: Cập nhật email trong Supabase Auth
 * POST /api/update-auth-email
 * Body: { authUserId: string, newEmail: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authUserId, newEmail } = req.body || {};
  if (!authUserId || !newEmail) {
    return res.status(400).json({ error: 'Missing authUserId or newEmail' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase config on server' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email: newEmail }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: body.msg || body.error || `Supabase returned ${response.status}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
