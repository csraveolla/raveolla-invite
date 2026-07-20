// ================================================================
// event-presets.js — Style preset metadata
// Shared antara admin panel, client panel, dan theme loader.
//
// Sistem: CSS class-based. Preset = class name di style-presets.js.
// Admin pilih dari dropdown → class name tersimpan di DB → loader apply.
// Override individual properties via CSS custom properties (--override-*).
// ================================================================

// ── Style Presets (metadata) ─────────────────────────────────
export const STYLE_PRESETS = {
  gold:   { label: 'Gold',   cssClass: 'style-gold' },
  navy:   { label: 'Navy',   cssClass: 'style-navy' },
  blush:  { label: 'Blush',  cssClass: 'style-blush' },
  sage:   { label: 'Sage',   cssClass: 'style-sage' },
  ivory:  { label: 'Ivory',  cssClass: 'style-ivory' },
  rose:   { label: 'Rose',   cssClass: 'style-rose' },
  custom: { label: 'Custom', cssClass: 'style-custom' },
}

// ── Font Options ─────────────────────────────────────────────
export const FONT_OPTIONS = [
  { value: '',                  label: 'Default Tema' },
  { value: 'font-playfair',    label: 'Playfair Display' },
  { value: 'font-cormorant',   label: 'Cormorant Garamond' },
  { value: 'font-greatvibes',  label: 'Great Vibes' },
  { value: 'font-poppins',     label: 'Poppins' },
  { value: 'font-lato',        label: 'Lato' },
]

// ── All known style+font class names (for cleanup) ──────────
export const ALL_STYLE_CLASSES = Object.values(STYLE_PRESETS).map(p => p.cssClass).filter(Boolean)
export const ALL_FONT_CLASSES  = FONT_OPTIONS.map(f => f.value).filter(Boolean)

// ── Override property map (DB key → CSS custom property) ─────
// Dipakai oleh loader dan admin untuk map override keys ke CSS.
export const OVERRIDE_MAP = {
  bg_color:     '--override-bg',
  text_color:   '--override-text',
  accent_color: '--override-accent',
  border:       '--override-border',
  border_radius:'--override-radius',
  box_shadow:   '--override-shadow',
  font_family:  '--override-font',
  bg_image:     '--override-bg-image',
}

// ── Section labels (for admin UI) ───────────────────────────
export const SECTION_LABELS = {
  gallery:      'Galeri',
  love_story:   'Love Story',
  kado:         'Kado Digital',
  countdown:    'Countdown',
  quote_footer: 'Quote & Footer',
  profile:      'Profil Mempelai',
}
