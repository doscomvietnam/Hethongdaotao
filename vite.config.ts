import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import type { Plugin } from 'vite';

/**
 * Vite Plugin: Lark Webhook Proxy (Dev only)
 * POST /api/lark-webhook  { webhookUrl, payload }
 * → forwards to Lark Anycross server-side → no CORS
 */
function larkWebhookProxy(): Plugin {
  return {
    name: 'lark-webhook-proxy',
    configureServer(server) {
      server.middlewares.use('/api/lark-webhook', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Read body
        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { webhookUrl, payload } = JSON.parse(body);
          if (!webhookUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing webhookUrl' }));
            return;
          }

          // Forward to Lark Anycross (server-side, no CORS)
          console.log('\n╔══════════════════════════════════════════════════');
          console.log('║ [Lark Proxy] Sending to Anycross...');
          console.log('║ URL:', webhookUrl);
          console.log('║ Payload keys:', Object.keys(payload || {}));
          console.log('║ Payload sample:', JSON.stringify(payload, null, 2).slice(0, 500));
          console.log('╚══════════════════════════════════════════════════\n');

          const upstream = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const text = await upstream.text();

          console.log('\n╔══════════════════════════════════════════════════');
          console.log('║ [Lark Proxy] Anycross Response:');
          console.log('║ Status:', upstream.status);
          console.log('║ Body:', text.slice(0, 1000));
          console.log('╚══════════════════════════════════════════════════\n');

          res.writeHead(upstream.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(text);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), larkWebhookProxy()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
