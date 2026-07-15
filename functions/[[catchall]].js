// functions/[[catchall]].js — Server-side slug routing for Cloudflare Pages

const SB_URL  = 'https://qyaxacjktcuyvkcrnofc.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5YXhhY2prdGN1eXZrY3Jub2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTY3NjYsImV4cCI6MjA5ODM3Mjc2Nn0.p1-9aFY_WZ4aVGg3D8Mx_4NUdqp8RZkXil6sX2-VA70';
const DEFAULT_THEME = 'sakina';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, '');

  if (!path) {
    return new Response('<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0D0D0D;color:#F5F0E8;font-family:sans-serif"><div style="text-align:center"><p style="font-size:48px;margin:0">404</p></div></body></html>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (path.includes('.')) return context.next();

  const prefixes = ['rsvp-admin', 'rsvp-client', 'tema', 'assets', 'functions'];
  if (prefixes.some(p => path === p || path.startsWith(p + '/'))) {
    return context.next();
  }

  const slug = path;

  let theme = DEFAULT_THEME;
  try {
    const api = `${SB_URL}/rest/v1/invitations?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=theme_id,themes(name)`;
    const res = await fetch(api, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (data && data[0] && data[0].themes && data[0].themes.name) {
      theme = data[0].themes.name.toLowerCase();
    }
  } catch (e) {}

  const themeUrl = new URL(`/${theme}/index.html`, context.request.url);
  themeUrl.searchParams.set('slug', slug);

  let themeRes = await fetch(themeUrl.toString());
  if (!themeRes.ok) {
    const fallbackUrl = new URL(`/${DEFAULT_THEME}/index.html`, context.request.url);
    fallbackUrl.searchParams.set('slug', slug);
    themeRes = await fetch(fallbackUrl.toString());
  }

  if (!themeRes.ok) {
    return new Response('Theme not found', { status: 404 });
  }

  return new Response(themeRes.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
