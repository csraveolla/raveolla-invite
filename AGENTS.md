# AGENTS.md — raveolla.my.id

## Project Overview
- Wedding Invitation SaaS (multi-tenant)
- Domain: raveolla.my.id (prod), raveolla-nikahin.pages.dev (Cloudflare Pages)
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime)
- Fonnte API untuk WhatsApp notifikasi

## Architecture
```
index.html              → 404 fallback page
env.js                  → Supabase config (gitignored)
dev-server.py           → Root dev server (port 8080)
tema/
  index.php             → PHP router (slug → Supabase → theme)
  serve.py              → Python SPA dev server (port 8080)
  .htaccess             → Apache rewrite rules
  assets/               → Shared CSS/JS
    style-presets.css   → Color presets (gold, navy, blush, sage, ivory, rose, custom)
    nk-design.css       → NK-Design System v4.0 (utility classes)
    motion-plus.css     → 63 animation classes (-dreamy suffix)
    motion-plus.js      → IntersectionObserver scroll-reveal engine
    invitation-loader.js → Main data loader (Supabase → DOM fill)
    event-presets.js    → Preset metadata + font options
  sakina/index.html     → Dark theme (gold on dark), inline CSS
  arafa/index.html      → Light theme (ivory/cream), inline CSS
rsvp-admin/             → Admin panel (super-adm.html)
rsvp-client/            → Client dashboard (client-adm.html)
```

## Routing
- `.htaccess` maps `/assets/*` → `/tema/assets/*`
- Clean slugs (e.g., `/john-jane`) → `tema/index.php?slug=$1` (prod) or serve.py (dev)
- Theme resolved from Supabase: `invitations.theme_id` → `themes.name`
- Default theme: `sakina`

## Styling Systems

### 1. Style Presets (`style-presets.css`)
Color presets applied via class on elements:
- Classes: `style-gold`, `style-navy`, `style-blush`, `style-sage`, `style-ivory`, `style-rose`, `style-custom`
- Font classes: `font-playfair`, `font-cormorant`, `font-greatvibes`, `font-poppins`, `font-lato`
- Override via CSS custom properties: `--override-bg`, `--override-text`, `--override-accent`, `--override-border`, `--override-radius`, `--override-shadow`, `--override-font`, `--override-bg-image`

### 2. NK-Design System (`nk-design.css`)
Utility-class styling — panggil class → style diterapkan:
- **Warna**: `nk-white`, `nk-palm`, `nk-sand`, `nk-olive`, `nk-gunmetal` (background + cascading teks)
- **Teks-only**: `nk-color-white`, `nk-color-palm`, dst
- **Tipografi**: `.nk-type` aktivasi font rules untuk h1-h4, p
- **Ukuran responsif**: `nk-s-p`, `nk-s-h4`, `nk-s-h3`, `nk-s-h2`, `nk-s-h1`
- **Tombol Elementor**: `nk-btn` + varian (`nk-btn-gunmetal`, `nk-btn-palm`, `nk-btn-olive`, `nk-btn-outline`) + tipografi (`nk-btn-h1`..`nk-btn-h4`, `nk-btn-p`)

### 3. Animations (`motion-plus.css`)
63 animation classes dengan suffix `-dreamy`:
- Base: fade-in-dreamy, fade-in-up-dreamy, zoom-dreamy, slide-left-dreamy
- Complex: orbitSpiralIn-dreamy, flipTwistPop-dreamy, swingDropElastic-dreamy
- Triggered by IntersectionObserver (`motion-plus.js`) via `.ani-container.active`

### 4. Theme Inline CSS
Each theme has ~800-1100 lines of inline `<style>` in index.html with theme-specific tokens and layouts.

## Data Flow
1. `invitation-loader.js` runs on DOMContentLoaded
2. Extracts slug from URL path
3. Fetches `invitations` from Supabase by slug
4. Fetches related data: events, galleries, bank_accounts, love_stories, clients
5. Fills DOM via class selectors (`.name-bride`, `.profile-card`, `.event-card`, etc.)
6. Applies dynamic styling via `applyStyleToElement()` using `section_styles` JSONB

See `DATA_BINDING_REFERENCE.md` for complete class/ID mapping.

## Database Tables (key columns)
- `invitations`: id, slug, theme_id, client_id, is_published, section_styles (JSONB), bride_*, groom_*
- `events`: id, invitation_id, event_name, event_date, start_time, end_time, location_name, address, maps_url, custom_style (JSONB)
- `galleries`: id, invitation_id, file_url, caption, is_cover, sort_order
- `bank_accounts`: id, invitation_id, bank_name, account_number, account_name
- `love_stories`: id, invitation_id, event_date, title, description, photo_url
- `rsvp_tamu`: id, client_id, nama, kehadiran, telpon, pesan, created_at
- `tamu_undangan`: id, invitation_id, nama
- `clients`: id, tanggal_acara
- `themes`: id, name

## Commands
- Dev server: `python3 tema/serve.py` (port 8080, SPA routing via Supabase)
- Root dev server: `python3 dev-server.py` (port 8080, static routing)
- PHP router: requires Apache with mod_rewrite

## Environment Variables (env.js)
```js
window.__ENV = {
  SUPABASE_URL:  'https://xxx.supabase.co',
  SUPABASE_KEY:  'anon-key',
  PUBLIC_DOMAIN: 'https://raveolla-nikahin.pages.dev',
  FONNTE_API:    'https://api.fonnte.com/send',
  DEFAULT_THEME: 'sakina'
}
```

## Notes
- `env.js` is gitignored — copy from `.env.example` and fill in values
- Themes use different asset paths: sakina uses `/assets/*`, arafa uses `/tema/assets/*`
- The `.htaccess` rewrites `/assets/*` → `/tema/assets/*` for production
- React/Next.js conversion planned (see `PLAN_KONVERSI_REACT.md`)
