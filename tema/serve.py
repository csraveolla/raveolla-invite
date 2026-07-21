#!/usr/bin/env python3
"""
serve.py — Local Development Server with Multi-Theme Routing
Queries Supabase to determine theme, serves correct theme HTML.
"""
import http.server
import socketserver
import os
import re
import json
import urllib.request
import urllib.parse

TEMA = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TEMA)

# ── READ CONFIG FROM /env.js ──────────────────────────────────
def _read_env_js():
    """Parse env.js from project root."""
    env_path = os.path.join(ROOT, 'env.js')
    cfg = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
        for key in ('SUPABASE_URL', 'SUPABASE_KEY', 'DEFAULT_THEME'):
            m = re.search(rf"{key}\s*:\s*'([^']+)'", content)
            if m:
                cfg[key] = m[1]
    return cfg

_env = _read_env_js()

SUPABASE_URL  = os.environ.get('SUPABASE_URL')  or _env.get('SUPABASE_URL',  '')
SUPABASE_KEY  = os.environ.get('SUPABASE_KEY')  or _env.get('SUPABASE_KEY',  '')
DEFAULT_THEME = os.environ.get('DEFAULT_THEME') or _env.get('DEFAULT_THEME', 'sakina')


def get_theme_for_slug(slug):
    """Query Supabase to get theme name for a given slug."""
    if not slug:
        return DEFAULT_THEME

    api_url = (
        f"{SUPABASE_URL}/rest/v1/invitations"
        f"?slug=eq.{urllib.parse.quote(slug)}"
        f"&is_published=eq.true"
        f"&select=theme_id,themes(name)"
    )

    req = urllib.request.Request(api_url)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if data and data[0].get('themes', {}).get('name'):
                return data[0]['themes']['name'].lower()
    except Exception as e:
        print(f"[SPA] Supabase query error: {e}")

    return DEFAULT_THEME


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = os.path.join(ROOT, self.path.lstrip('/'))

        # If file exists, serve it directly
        if os.path.exists(path) and not (os.path.isdir(path) and not os.path.exists(os.path.join(path, 'index.html'))):
            return super().do_GET()

        # Extract slug from path (last segment)
        parts = [p for p in self.path.strip('/').split('/') if p]
        slug = parts[-1] if parts else ''

        # Skip admin paths
        if slug.lower() == 'admin':
            admin_path = os.path.join(TEMA, 'admin', 'index.html')
            if os.path.exists(admin_path):
                self.path = '/tema/admin/index.html'
                return super().do_GET()

        # Handle rsvp-client: serve client-adm.html directly
        if slug.lower() == 'rsvp-client':
            rsvp_path = os.path.join(ROOT, 'rsvp-client', 'client-adm.html')
            if os.path.exists(rsvp_path):
                self.path = '/rsvp-client/client-adm.html'
                return super().do_GET()

        # Handle rsvp-admin: serve super-adm.html directly
        if slug.lower() == 'rsvp-admin':
            admin_rsvp_path = os.path.join(ROOT, 'rsvp-admin', 'super-adm.html')
            if os.path.exists(admin_rsvp_path):
                self.path = '/rsvp-admin/super-adm.html'
                return super().do_GET()

        # Query Supabase for theme
        theme = get_theme_for_slug(slug)
        theme_path = os.path.join(TEMA, theme, 'index.html')

        # Case-insensitive fallback: find matching directory
        if not os.path.exists(theme_path):
            for entry in os.listdir(TEMA):
                if entry.lower() == theme.lower() and os.path.isdir(os.path.join(TEMA, entry)):
                    theme = entry
                    theme_path = os.path.join(TEMA, theme, 'index.html')
                    break

        # Fallback to default theme
        if not os.path.exists(theme_path):
            theme = DEFAULT_THEME
            theme_path = os.path.join(TEMA, theme, 'index.html')

        if os.path.exists(theme_path):
            self.path = f'/tema/{theme}/index.html'
            return super().do_GET()

        # Final fallback
        self.path = '/index.html'
        return super().do_GET()

    def log_message(self, format, *args):
        print(f"[SPA] {args[0]}")


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.ThreadingTCPServer(('0.0.0.0', 8080), SPAHandler)
    server.daemon_threads = True
    print('SPA server running on http://localhost:8080')
    print('Theme routing via Supabase: enabled')
    server.serve_forever()
