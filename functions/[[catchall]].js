// functions/[[catchall]].js — Server-side slug routing for Cloudflare Pages
// Static files → served directly by Cloudflare (Function not invoked)
// Slugs like "annisa-budi" → query Supabase → serve theme HTML

const DEFAULT_THEME = 'sakina';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, '');

  // Root path → 404
  if (!path) {
    return new Response('<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0D0D0D;color:#F5F0E8;font-family:sans-serif"><div style="text-align:center"><p style="font-size:48px;margin:0">404</p></div></body></html>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // If path has extension (like env.js, style.css) → not a slug, pass through
  if (path.includes('.')) {
    return context.next();
  }

  // Known directories → pass through to static files
  const prefixes = ['rsvp-admin', 'rsvp-client', 'tema', 'assets', 'functions'];
  if (prefixes.some(p => path === p || path.startsWith(p + '/'))) {
    return context.next();
  }

  const slug = path;

  // Get env vars
  const SB_URL = context.env.SUPABASE_URL || '';
  const SB_KEY = context.env.SUPABASE_KEY || '';

  if (!SB_URL || !SB_KEY) {
    return new Response('Missing environment variables', { status: 500 });
  }

  // Query Supabase for theme
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

  // Fetch theme HTML with slug in query param
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
