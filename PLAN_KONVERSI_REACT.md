# Plan Konversi ke React/Next.js (SSR)

> **Project:** raveolla.my.id — Wedding Invitation SaaS
> **Source:** Vanilla JS (ES Modules) + PHP Router + Supabase
> **Target:** Next.js 14+ (App Router, SSR) + TypeScript + TailwindCSS (opsional)

---

## Daftar Isi

1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Struktur Folder Target](#2-struktur-folder-target)
3. [Tahapan Implementasi](#3-tahapan-implementasi)
4. [Mapping File Vanilla → React](#4-mapping-file-vanilla--react)
5. [Detail Komponen Tema](#5-detail-komponen-tema)
6. [API Routes](#6-api-routes)
7. [State Management](#7-state-management)
8. [Data Flow](#8-data-flow)
9. [Timeline & Prioritas](#9-timeline--prioritas)
10. [Deployment](#10-deployment)

---

## 1. Ringkasan Arsitektur

```
Browser Request
      │
      ▼
Next.js App Router
      │
      ├── /[slug]           → SSR: fetch data → render theme components
      ├── /client-dashboard → Client RSVP dashboard (CSR)
      ├── /admin            → Admin panel (CSR, protected)
      └── /api/*            → API routes (Fonnte WA, upload, dll)
      │
      ▼
Supabase (database, auth, storage, realtime)
```

### Teknologi

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, routing, API routes, optimal untuk SEO |
| Bahasa | TypeScript strict | Type safety, autocomplete |
| Styling | CSS Modules + CSS Variables | Scoped, tidak perlu tailwind learning |
| State global | Zustand | Ringan, tanpa boilerplate (ganti Context jika ingin minimal) |
| Supabase | `@supabase/supabase-js` + `@supabase/ssr` | Auth SSR + Realtime |
| Deployment | Vercel (gratis) atau VPS + PM2 | Sesuai budget |

---

## 2. Struktur Folder Target

```
raveolla.my.id/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (fonts, metadata)
│   │   ├── page.tsx                   # Landing page / redirect
│   │   ├── not-found.tsx              # 404 page
│   │   ├── [slug]/
│   │   │   └── page.tsx               # SSR: halaman undangan
│   │   ├── client-dashboard/
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Client token login
│   │   │   └── page.tsx               # Dashboard RSVP client
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Admin email/password login
│   │   │   ├── page.tsx               # Admin dashboard (clients list)
│   │   │   └── clients/
│   │   │       └── [id]/
│   │   │           └── page.tsx       # Detail RSVP per client
│   │   ├── admin/invitations/
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Invitation editor
│   │   └── api/
│   │       ├── wa/send/route.ts       # Kirim WA via Fonnte/Wablas
│   │       ├── wa/test/route.ts       # Test WA admin
│   │       └── upload/route.ts        # Upload foto ke Supabase Storage
│   │
│   ├── components/
│   │   ├── themes/
│   │   │   ├── sakina/               # Tema existing → React components
│   │   │   │   ├── index.tsx          # Export all sections
│   │   │   │   ├── Cover.tsx          # Cover screen (opening)
│   │   │   │   ├── Couple.tsx         # Bride & groom profiles
│   │   │   │   ├── Events.tsx         # Wedding events section
│   │   │   │   ├── Gallery.tsx        # Photo gallery
│   │   │   │   ├── RSVP.tsx           # RSVP form
│   │   │   │   ├── Komentar.tsx       # Comments / wishes
│   │   │   │   ├── Music.tsx          # Background music player
│   │   │   │   ├── Gift.tsx           # Gift / bank accounts
│   │   │   │   ├── LoveStory.tsx      # Love story timeline
│   │   │   │   ├── Footer.tsx         # Closing section
│   │   │   │   └── sakina.css         # Theme CSS modules
│   │   │   └── ThemeProvider.tsx      # Dynamic theme loader
│   │   │
│   │   ├── admin/                    # Admin panel components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ClientTable.tsx
│   │   │   ├── ClientForm.tsx
│   │   │   ├── DetailTable.tsx
│   │   │   ├── InvitationEditor.tsx
│   │   │   ├── InvMempelai.tsx
│   │   │   ├── InvEvents.tsx
│   │   │   ├── InvGallery.tsx
│   │   │   ├── InvMusic.tsx
│   │   │   ├── InvGift.tsx
│   │   │   ├── InvLoveStory.tsx
│   │   │   ├── SettingsTab.tsx
│   │   │   └── WaClientTable.tsx
│   │   │
│   │   ├── client-dashboard/         # Client RSVP dashboard components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── TamuTab.tsx
│   │   │   ├── RSVPTab.tsx
│   │   │   ├── KomentarTab.tsx
│   │   │   ├── KirimTab.tsx
│   │   │   ├── RiwayatTab.tsx
│   │   │   ├── FloatingProgress.tsx
│   │   │   └── ToastStack.tsx
│   │   │
│   │   └── shared/                   # Shared UI primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Table.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       ├── Spinner.tsx
│   │       ├── Badge.tsx
│   │       ├── Pagination.tsx
│   │       └── Tabs.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client (browser)
│   │   │   ├── server.ts             # Supabase SSR (server component)
│   │   │   └── admin.ts              # Supabase admin (server-only)
│   │   ├── api/
│   │   │   ├── invitations.ts        # CRUD undangan
│   │   │   ├── clients.ts            # CRUD client
│   │   │   ├── tamu.ts               # CRUD tamu
│   │   │   ├── rsvp.ts               # CRUD RSVP
│   │   │   ├── komentar.ts           # CRUD komentar
│   │   │   ├── events.ts             # CRUD acara
│   │   │   ├── gallery.ts            # CRUD galeri
│   │   │   ├── banks.ts              # CRUD bank accounts
│   │   │   ├── love-stories.ts       # CRUD love stories
│   │   │   ├── settings.ts           # Admin settings
│   │   │   └── wa-logs.ts            # WA logs
│   │   ├── wa/
│   │   │   ├── fonnte.ts             # Fonnte API wrapper
│   │   │   ├── wablas.ts             # Wablas API wrapper
│   │   │   └── waha.ts               # Waha API wrapper
│   │   ├── feature-gate.ts           # Paket: lite/pro/premium logic
│   │   ├── constants.ts              # PAKET_FEATURES, dll
│   │   └── utils.ts                  # Formatting, helpers
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                # Client token auth
│   │   ├── useAdminAuth.ts           # Admin supabase auth
│   │   ├── useRealtime.ts            # Realtime subscription
│   │   ├── useData.ts                # Generic data fetching
│   │   ├── useWaKirim.ts             # WA send progress logic
│   │   ├── useCountdown.ts           # Countdown timer
│   │   └── useTheme.ts               # Dark mode toggle
│   │
│   ├── store/
│   │   ├── adminStore.ts             # Zustand: admin state
│   │   └── clientStore.ts            # Zustand: client dashboard state
│   │
│   └── types/
│       └── index.ts                  # Semua type definitions
│
├── public/
│   ├── env.js                        # window.__ENV (runtime config)
│   └── assets/
│       └── themes/                   # Static theme assets (jika ada)
│
├── .env.local                        # Supabase URL + Key (dev)
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Tahapan Implementasi

### Fase 0: Setup Project (1 hari)

```bash
npx create-next-app@latest raveolla.my.id --typescript --app --src-dir
cd raveolla.my.id
npm install zustand @supabase/supabase-js @supabase/ssr
```

**Files:**
- `package.json` — dependencies
- `tsconfig.json` — TypeScript config
- `next.config.ts` — Next.js config
- `.env.local` — Supabase URL + Key

### Fase 1: Layer Foundation (2-3 hari)

**Types:**

`src/types/index.ts` — Semua tipe data:
```typescript
interface Client {
  id: string; nama_acara: string; slug: string; token: string;
  pin_scanner: string; paket: 'lite' | 'pro' | 'premium';
  wa_mode: 'admin' | 'client'; base_url: string;
  created_at: string; updated_at: string;
}
interface Invitation {
  id: string; client_id: string; slug: string; theme_id: string;
  bride_name: string; bride_nickname: string; groom_name: string; groom_nickname: string;
  bride_father: string; bride_mother: string; groom_father: string; groom_mother: string;
  bride_instagram: string; groom_instagram: string;
  bride_photo_url: string; groom_photo_url: string;
  quote: string; hashtag: string; music_url: string;
  tanggal_acara: string; is_published: boolean;
  created_at: string; updated_at: string;
}
interface Tamu { id: string; client_id: string; nama: string; telpon: string; ... }
interface RsvpTamu { id: string; tamu_id: string; client_id: string; kehadiran: string; ... }
interface Komentar { id: string; invitation_id: string; nama: string; pesan: string; ... }
interface Event { id: string; invitation_id: string; event_name: string; ... }
interface Gallery { id: string; invitation_id: string; file_url: string; ... }
interface BankAccount { id: string; invitation_id: string; bank_name: string; ... }
interface LoveStory { id: string; invitation_id: string; title: string; ... }
interface AdminSetting { id: string; value: any; }
interface WaLog { id: string; client_id: string; tamu_id: string; ... }
type Paket = 'lite' | 'pro' | 'premium';
```

**Lib:**

`src/lib/supabase/client.ts` — Browser client
`src/lib/supabase/server.ts` — SSR client (cookie-based)
`src/lib/supabase/admin.ts` — Service role client (server-only)

`src/lib/constants.ts` — PAKET_FEATURES, DEFAULT_TEMPLATE
`src/lib/feature-gate.ts` — canUseFeature(client.paket, feature)

### Fase 2: Shared UI Components (1-2 hari)

Buat komponen reusable dari pola yang ada di admin & client:

| Vanilla (HTML+CSS) | React Component | Notes |
|---|---|---|
| `<button class="btn btn-gold">` | `<Button variant="gold">` | Props: variant, size, loading |
| `<div class="card">` | `<Card>` | Header + Body pattern |
| `<input class="inv-input">` | `<Input>` | Dengan label + error |
| `<table>...</table>` | `<Table>` | Columns + data props |
| Modal (`#modal-delete`) | `<Modal>` | open/close + children |
| Toast stack (`#toast-stack`) | `<ToastStack>` | Context-based |
| Floating pill (`#floating-progress`) | `<FloatingProgress>` | Progress + item list |
| Pagination | `<Pagination>` | Page + total + onChange |
| Tabs | `<Tabs>` | Active tab + content |

### Fase 3: Halaman Undangan — SSR (2-3 hari)

**Route:** `app/[slug]/page.tsx`

```tsx
// Server Component — fetch data
async function getInvitationData(slug: string) {
  const supabase = createServerClient()
  const { data: inv } = await supabase
    .from('invitations')
    .select('*, themes(name), clients(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  const { data: events } = await supabase
    .from('events').select('*').eq('invitation_id', inv.id).order('sort_order')
  const { data: galleries } = await supabase
    .from('galleries').select('*').eq('invitation_id', inv.id).order('sort_order')
  const { data: banks } = await supabase
    .from('bank_accounts').select('*').eq('invitation_id', inv.id).order('sort_order')
  const { data: loveStories } = await supabase
    .from('love_stories').select('*').eq('invitation_id', inv.id).order('sort_order')
  return { inv, events, galleries, banks, loveStories }
}

export default async function InvitationPage({ params, searchParams }) {
  const data = await getInvitationData(params.slug)
  const guestName = searchParams.to || 'Tamu Undangan'
  const Theme = getThemeComponent(data.inv.themes.name) // dynamic import

  return <Theme data={data} guestName={guestName} />
}
```

**Komponen tema (sakina):**

- `Cover.tsx` — Cover screen dengan animasi, tombol buka undangan
- `Couple.tsx` — Profil kedua mempelai + orang tua + Instagram
- `Events.tsx` — Kartu acara dengan tanggal, jam, lokasi, maps
- `Gallery.tsx` — Galeri foto dengan grid + lazy load
- `RSVP.tsx` — Form RSVP (client component — submit ke Supabase)
- `Komentar.tsx` — Daftar ucapan + form tambah (client component — realtime)
- `Music.tsx` — Background music (YouTube audio / MP3)
- `Gift.tsx` — Bank accounts / hadiah
- `LoveStory.tsx` — Timeline cinta
- `Footer.tsx` — Closing + hashtag

**CSS:** `sakina.css` — Ekstrak CSS dari `tema/sakina/index.html` → CSS Modules

### Fase 4: Client Dashboard (2-3 hari)

**Route:** `app/client-dashboard/login/page.tsx` + `app/client-dashboard/page.tsx`

Mapping dari `rsvp-client/`:

| Vanilla JS file | React component | Notes |
|---|---|---|
| `auth.js` | `hooks/useAuth.ts` | Token-based auth, sessionStorage |
| `tamu.js` | `TamuTab.tsx` | CRUD tamu + import CSV |
| `rsvp.js` | `RSVPTab.tsx` | Tabel RSVP + filter + check-in |
| `komentar.js` | `KomentarTab.tsx` | Lihat komentar (read-only) |
| `kirim.js` | `KirimTab.tsx` | Kirim WA massal + jadwal |
| `paket.js` | `feature-gate.ts` | Paket feature gating |
| `reminder.js` | `hooks/useWaKirim.ts` | Reminder RSVP + H-3 + H-1 |
| `realtime.js` | `hooks/useRealtime.ts` | Subscriptions |
| `utils.js` | `lib/utils.ts` + `components/shared/` | Helper functions |
| `config.js` | `lib/constants.ts` | Konstanta |
| `app.js` | `clientStore.ts` | State management |

**State (Zustand):**
```typescript
interface ClientStore {
  clientData: Client | null
  allTamu: Tamu[]
  allRsvp: RsvpTamu[]
  allKomentar: Komentar[]
  paketFitur: PaketFeatures
  // actions
  login: (token: string) => Promise<void>
  loadAll: () => Promise<void>
  sendWa: (targets: string[]) => Promise<void>
}
```

### Fase 5: Admin Panel (3-4 hari)

**Route:** `app/admin/login/page.tsx` + `app/admin/page.tsx` + sub-routes

Mapping dari `rsvp-admin/`:

| Vanilla JS file | React component | Notes |
|---|---|---|
| `state.js` | `adminStore.ts` | Zustand store |
| `api.js` | `lib/api/*.ts` | API fetchers |
| `auth.js` | `hooks/useAdminAuth.ts` | Supabase email auth |
| `clients.js` | `ClientTable.tsx` + `ClientForm.tsx` | CRUD client |
| `detail.js` | `DetailTable.tsx` | Detail RSVP per client |
| `invitation.js` | `InvitationEditor.tsx` + sub-components | Editor undangan |
| `settings.js` | `SettingsTab.tsx` + `WaClientTable.tsx` | Settings |
| `utils.js` | `lib/utils.ts` + `store/adminStore.ts` | Helpers + state |

**Admin routes:**

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Client list + stats |
| `/admin/clients/[id]` | `ClientDetail` | Detail RSVP + check-in |
| `/admin/invitations/[id]` | `InvitationEditor` | Edit undangan (multi-tab) |

### Fase 6: API Routes (1 hari)

| Endpoint | File | Description |
|---|---|---|
| `POST /api/wa/send` | `app/api/wa/send/route.ts` | Kirim WA via Fonnte/Wablas/Waha |
| `POST /api/wa/test` | `app/api/wa/test/route.ts` | Test kirim WA |
| `POST /api/upload` | `app/api/upload/route.ts` | Upload file ke Supabase Storage |

### Fase 7: Integration & Polish (2 hari)

- Dark mode toggle → `useTheme.ts` + persist ke `localStorage`
- Realtime subscriptions (komentar, RSVP count)
- Floating progress pill (kirim WA massal)
- Toast notifikasi reminder
- SEO metadata + Open Graph tags
- 404 page + error handling

### Total Estimasi: **14-18 hari**

---

## 4. Mapping File Vanilla → React

### Client Dashboard

| Vanilla File | Baris | React Target | Catatan |
|---|---|---|---|
| `rsvp-client/client-adm.html` | ~1000 | `app/client-dashboard/page.tsx` + komponen | HTML → JSX, onclick → event handler |
| `rsvp-client/js/config.js` | 44 | `lib/constants.ts` | Sama, TypeScript |
| `rsvp-client/js/auth.js` | 92 | `hooks/useAuth.ts` | Token-based login |
| `rsvp-client/js/tamu.js` | ~250 | `TamuTab.tsx` | CRUD + import CSV + filter |
| `rsvp-client/js/rsvp.js` | ~200 | `RSVPTab.tsx` | Filter + check-in |
| `rsvp-client/js/komentar.js` | ~100 | `KomentarTab.tsx` | Read-only view |
| `rsvp-client/js/kirim.js` | ~400 | `KirimTab.tsx` + `hooks/useWaKirim.ts` | Send logic |
| `rsvp-client/js/paket.js` | ~80 | `lib/feature-gate.ts` | Feature flags |
| `rsvp-client/js/reminder.js` | ~250 | `hooks/useWaKirim.ts` | Reminder schedule |
| `rsvp-client/js/realtime.js` | ~80 | `hooks/useRealtime.ts` | Subscriptions |
| `rsvp-client/js/utils.js` | ~226 | `lib/utils.ts` + `shared/*` | Split into helpers |
| `rsvp-client/js/log.js` | ~50 | `lib/api/wa-logs.ts` | WA log fetcher |
| `rsvp-client/js/invitation.js` | ~300 | Live di halaman tamu | SSR |
| `rsvp-client/js/template-modal.js` | ~50 | `<TemplateModal>` | Modal component |
| `rsvp-client/css/*.css` | ~500 | CSS Modules | Split per component |

### Admin Panel

| Vanilla File | Baris | React Target | Catatan |
|---|---|---|---|
| `rsvp-admin/super-adm.html` | ~523 | `app/admin/page.tsx` + sub-routes | HTML → JSX |
| `rsvp-admin/js/state.js` | 37 | `store/adminStore.ts` | Zustand |
| `rsvp-admin/js/api.js` | 37 | `lib/supabase/*.ts` | API layer |
| `rsvp-admin/js/auth.js` | 77 | `hooks/useAdminAuth.ts` | Supabase auth |
| `rsvp-admin/js/main.js` | 170 | Layout + routing | Init logic |
| `rsvp-admin/js/clients.js` | ~277 | `ClientTable.tsx` + `ClientForm.tsx` | CRUD |
| `rsvp-admin/js/detail.js` | ~150 | `app/admin/clients/[id]/page.tsx` | Detail RSVP |
| `rsvp-admin/js/invitation.js` | ~580 | `InvitationEditor.tsx` + sub-components | Editor multi-tab |
| `rsvp-admin/js/settings.js` | ~250 | `SettingsTab.tsx` | Settings + WA |
| `rsvp-admin/js/utils.js` | ~150 | `lib/utils.ts` + `shared/*` | Helpers |
| `rsvp-admin/style.css` | ~878 | CSS Modules | Split per component |

### Tema Undangan (Sakina)

| Vanilla File | Baris | React Target | Catatan |
|---|---|---|---|
| `tema/sakina/index.html` | ~2130 | `components/themes/sakina/*.tsx` | Split menjadi 10+ komponen |
| `tema/assets/invitation-loader.js` | ~578 | SSR (server) + client components | Data fetching → server; event handlers → client |
| `tema/assets/motion-plus.js` | ~200 | `hooks/useScrollAnimation.ts` | Scroll-triggered animations |
| `tema/index.php` | 86 | `app/[slug]/page.tsx` | SSR routing |
| `tema/.htaccess` | 8 | Next.js config | Sudah handle routing |

---

## 5. Detail Komponen Tema (Sakina)

### Cover (`Cover.tsx`)

**Dari:** `tema/sakina/index.html` baris 81-250 (CSS + HTML)
**Fungsi:** Cover screen dengan foto slideshow, nama mempelai, tanggal, tombol buka undangan

**State:**
```typescript
interface CoverProps {
  brideNickname: string
  groomNickname: string
  tanggalAcara: string
  guestName: string
  galleries: Gallery[]
  onOpen: () => void // callback saat tombol "Buka Undangan" diklik
}
```

**Client component** (karena animasi + event handler):
```tsx
'use client'
export default function Cover({ ... }: CoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  // Slide rotation interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % 3), 4000)
    return () => clearInterval(timer)
  }, [])
  // ...render dengan CSS yang sama seperti sakina/index.html
}
```

### RSVP Form (`RSVP.tsx`)

**Dari:** invitation-loader.js (insert RSVP HTML + event listener)
**Fungsi:** Form konfirmasi kehadiran + jumlah tamu + pesan

```tsx
'use client'
export default function RSVPForm({ invitationId, guestName }: Props) {
  const [kehadiran, setKehadiran] = useState<'Hadir' | 'Tidak Hadir' | ''>('')
  const [jumlah, setJumlah] = useState(1)
  const [pesan, setPesan] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('rsvp_tamu').insert({
      invitation_id: invitationId, nama: guestName,
      kehadiran, jumlah_tamu: jumlah, pesan
    })
    setSubmitted(true)
    setLoading(false)
  }
  // Render form
}
```

### Komentar (`Komentar.tsx`)

**Fungsi:** Daftar ucapan realtime

```tsx
'use client'
export default function Komentar({ invitationId }: Props) {
  const [ucapan, setUcapan] = useState<Komentar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial
    supabase.from('komentar').select('*').eq('invitation_id', invitationId)
      .then(({ data }) => { setUcapan(data || []); setLoading(false) })
    // Subscribe realtime
    const sub = supabase.channel(`komentar:${invitationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'komentar',
        filter: `invitation_id=eq.${invitationId}` },
        (payload) => setUcapan(prev => [payload.new as Komentar, ...prev])
      ).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [invitationId])

  // Render list + form
}
```

---

## 6. API Routes

### WA Send (`app/api/wa/send/route.ts`)

```typescript
export async function POST(request: Request) {
  const { clientId, tamuIds, template, jadwal } = await request.json()
  const supabase = createAdminClient()
  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
  const { data: tamuList } = await supabase.from('tamu').select('*').in('id', tamuIds)
  const provider = client.wa_provider || 'fonnte'
  const results = []
  for (const tamu of tamuList) {
    const message = template.replace('{nama}', tamu.nama)
    const sent = await sendWA(provider, tamu.telpon, message)
    results.push({ tamuId: tamu.id, status: sent ? 'success' : 'failed' })
  }
  return Response.json({ results })
}
```

---

## 7. State Management

### Zustand Store — Admin

```typescript
interface AdminState {
  accessToken: string | null
  clients: Client[]
  rsvpAll: RsvpTamu[]
  currentClientId: string | null
  isLoading: boolean
  // actions
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadClients: () => Promise<void>
  loadRsvpAll: () => Promise<void>
  setCurrentClient: (id: string) => void
}
```

### Zustand Store — Client Dashboard

```typescript
interface ClientState {
  clientData: Client | null
  allTamu: Tamu[]
  allRsvp: RsvpTamu[]
  allKomentar: Komentar[]
  paketFitur: PaketFeatures
  waProgress: { sent: number; failed: number; total: number; running: boolean }
  // actions
  login: (token: string) => Promise<void>
  logout: () => void
  loadAll: () => Promise<void>
  sendWa: (targetIds: string[], template: string) => Promise<void>
  updateWaProgress: (sent: number, failed: number) => void
}
```

---

## 8. Data Flow

### Halaman Undangan (SSR)

```
Browser → GET /budi-ani?to=Bpk+Budi
  ↓
[slug]/page.tsx (Server Component)
  ↓
fetchAllData(slug) → fetch Supabase:
  - invitation (including client theme)
  - events
  - galleries
  - banks
  - loveStories
  ↓
Render Theme (e.g. <SakinaTheme>) with data as props
  ↓
Hydration di client → komponen interaktif aktif:
  - Cover animation (client)
  - RSVP Form (client)
  - Komentar + Realtime (client)
  - Countdown (client)
  - Music player (client)
```

### Admin Panel (CSR)

```
Browser → GET /admin (via Next.js middleware/auth check)
  ↓
AdminLayout (check session → redirect to /admin/login if not auth)
  ↓
AdminDashboard (client component)
  ↓
useEffect: fetch clients + stats from Supabase
  ↓
Render ClientTable → klik client → router.push(/admin/clients/[id])
  ↓
ClientDetail (client component)
  ↓
useEffect: fetch RSVP data per client
```

### Client Dashboard (CSR)

```
Browser → GET /client-dashboard
  ↓
ClientLogin page (check sessionStorage token)
  ↓
useAuth: fetch client by token
  ↓
DashboardLayout → tabs (Tamu, RSVP, Komentar, Kirim, Riwayat)
  ↓
Tiap tab client component → fetch data via Supabase
  ↓
useRealtime: subscribe to changes (komentar, rsvp count)
```

---

## 9. Timeline & Prioritas

### Prioritas: P0 → P1 → P2

| Prioritas | Fase | Hari | Deliverable |
|---|---|---|---|
| **P0** | Fase 0-1 | 3 | Setup project + types + lib layer |
| **P0** | Fase 3 | 3 | Halaman undangan (SSR) — tema sakina |
| **P0** | Fase 5 | 4 | Admin panel — CRUD client + invitation editor |
| **P1** | Fase 4 | 3 | Client dashboard — RSVP + kirim WA |
| **P1** | Fase 6 | 1 | API routes — WA |
| **P2** | Fase 2 | 1 | Shared UI components |
| **P2** | Fase 7 | 2 | Polish + deployment |

### Rekomendasi Urutan Pengerjaan

1. **Fase 0** (setup) — 1 hari
2. **Fase 1** (types + lib) — 2 hari
3. **Fase 3** (halaman undangan SSR) — 3 hari → **MVP pertama**
4. **Fase 5** (admin panel) — 4 hari → **User admin bisa pakai**
5. **Fase 4** (client dashboard) — 3 hari → **Client bisa pakai**
6. **Fase 2** (shared UI) — 1 hari (sembari fase lain)
7. **Fase 6-7** (API + polish) — 3 hari

---

## 10. Deployment

### Opsi A: Vercel (Recommended)

**Biaya:** Gratis (100 GB bandwidth, unlimited requests)

**Setup:**
1. Push ke GitHub
2. Import repo ke Vercel
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`)
4. Deploy otomatis setiap push

**Keuntungan:**
- Zero config
- Auto SSL, auto CDN
- Edge functions untuk API routes
- Preview deployments untuk tiap PR

### Opsi B: VPS (Node.js + PM2)

**Biaya:** ~$6/bulan (DigitalOcean/Linode/Vultr)

**Setup:**
1. Build project: `npm run build`
2. Install PM2: `npm install -g pm2`
3. Serve: `pm2 start npm --name "raveolla" -- start`

**Reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name raveolla.my.id;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://qyaxacjktcuyvkcrnofc.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # untuk admin ops
FONNTE_API=https://api.fonnte.com/send
NEXT_PUBLIC_DOMAIN=https://raveolla.my.id
```

> Catatan: Untuk runtime config (tanpa rebuild), env.js tetap ada di `public/env.js` dan dibaca via `window.__ENV`.

---

## Appendix: Checklist Per File

### Phase 0 — Setup
- [ ] `npx create-next-app@latest` — project baru
- [ ] Install deps: `zustand`, `@supabase/supabase-js`, `@supabase/ssr`
- [ ] Config `next.config.ts`, `tsconfig.json`
- [ ] `.env.local` — environment variables
- [ ] `public/env.js` — runtime config (dari existing)

### Phase 1 — Foundation
- [ ] `src/types/index.ts` — semua type definitions
- [ ] `src/lib/supabase/client.ts` — browser supabase
- [ ] `src/lib/supabase/server.ts` — SSR supabase
- [ ] `src/lib/supabase/admin.ts` — service role supabase
- [ ] `src/lib/constants.ts` — PAKET_FEATURES, DEFAULT_TEMPLATE
- [ ] `src/lib/feature-gate.ts` — fitur per paket

### Phase 2 — Shared Components
- [ ] `src/components/shared/Button.tsx`
- [ ] `src/components/shared/Input.tsx`
- [ ] `src/components/shared/Select.tsx`
- [ ] `src/components/shared/Table.tsx`
- [ ] `src/components/shared/Modal.tsx`
- [ ] `src/components/shared/Toast.tsx`
- [ ] `src/components/shared/Spinner.tsx`
- [ ] `src/components/shared/Badge.tsx`
- [ ] `src/components/shared/Pagination.tsx`
- [ ] `src/components/shared/Tabs.tsx`

### Phase 3 — Theme (Sakina)
- [ ] `src/components/themes/ThemeProvider.tsx` — dynamic loader
- [ ] `src/components/themes/sakina/Cover.tsx`
- [ ] `src/components/themes/sakina/Couple.tsx`
- [ ] `src/components/themes/sakina/Events.tsx`
- [ ] `src/components/themes/sakina/Gallery.tsx`
- [ ] `src/components/themes/sakina/RSVP.tsx`
- [ ] `src/components/themes/sakina/Komentar.tsx`
- [ ] `src/components/themes/sakina/Music.tsx`
- [ ] `src/components/themes/sakina/Gift.tsx`
- [ ] `src/components/themes/sakina/LoveStory.tsx`
- [ ] `src/components/themes/sakina/Footer.tsx`
- [ ] `src/components/themes/sakina/sakina.css` — CSS modules
- [ ] `src/app/[slug]/page.tsx` — SSR route
- [ ] `src/app/layout.tsx` — root layout + metadata

### Phase 4 — Client Dashboard
- [ ] `src/store/clientStore.ts` — Zustand store
- [ ] `src/hooks/useAuth.ts` — token auth
- [ ] `src/hooks/useRealtime.ts` — subscriptions
- [ ] `src/hooks/useWaKirim.ts` — WA send logic
- [ ] `src/app/client-dashboard/layout.tsx`
- [ ] `src/app/client-dashboard/login/page.tsx`
- [ ] `src/app/client-dashboard/page.tsx`
- [ ] `src/components/client-dashboard/DashboardLayout.tsx`
- [ ] `src/components/client-dashboard/TamuTab.tsx`
- [ ] `src/components/client-dashboard/RSVPTab.tsx`
- [ ] `src/components/client-dashboard/KomentarTab.tsx`
- [ ] `src/components/client-dashboard/KirimTab.tsx`
- [ ] `src/components/client-dashboard/RiwayatTab.tsx`
- [ ] `src/components/client-dashboard/FloatingProgress.tsx`
- [ ] `src/components/client-dashboard/ToastStack.tsx`

### Phase 5 — Admin Panel
- [ ] `src/store/adminStore.ts` — Zustand store
- [ ] `src/hooks/useAdminAuth.ts` — supabase auth
- [ ] `src/app/admin/layout.tsx` — admin layout
- [ ] `src/app/admin/login/page.tsx` — login page
- [ ] `src/app/admin/page.tsx` — admin dashboard (clients)
- [ ] `src/app/admin/clients/[id]/page.tsx` — RSVP detail
- [ ] `src/app/admin/invitations/[id]/page.tsx` — invitation editor
- [ ] `src/components/admin/LoginForm.tsx`
- [ ] `src/components/admin/DashboardLayout.tsx`
- [ ] `src/components/admin/ClientTable.tsx`
- [ ] `src/components/admin/ClientForm.tsx`
- [ ] `src/components/admin/DetailTable.tsx`
- [ ] `src/components/admin/InvitationEditor.tsx`
- [ ] `src/components/admin/InvMempelai.tsx`
- [ ] `src/components/admin/InvEvents.tsx`
- [ ] `src/components/admin/InvGallery.tsx`
- [ ] `src/components/admin/InvMusic.tsx`
- [ ] `src/components/admin/InvGift.tsx`
- [ ] `src/components/admin/InvLoveStory.tsx`
- [ ] `src/components/admin/SettingsTab.tsx`
- [ ] `src/components/admin/WaClientTable.tsx`

### Phase 6 — API Routes
- [ ] `src/app/api/wa/send/route.ts`
- [ ] `src/app/api/wa/test/route.ts`
- [ ] `src/app/api/upload/route.ts`

### Phase 7 — Polish
- [ ] Dark mode toggle
- [ ] 404 page (`src/app/not-found.tsx`)
- [ ] Error boundary
- [ ] Open Graph metadata
- [ ] Loading states / skeleton

---

## Catatan Penting

### Migration Safety
- **Jangan hapus** file vanilla JS/HTML/PHP sampai React versi sudah stabil dan di-deploy
- Selama transisi, kedua versi bisa jalan paralel:
  - Vanilla: di domain utama (shared hosting)
  - React: di subdomain atau Vercel preview

### CSS Strategy
- Gunakan **CSS Modules** (bukan Tailwind) — agar tampilan identik
- Ekstrak CSS variables dari `:root` menjadi file `globals.css`
- Tiap tema punya file CSS sendiri (scoped)

### Realtime
- Untuk komentar dan RSVP: gunakan `supabase.channel()` di client component
- Unsubscribe saat component unmount untuk hindari memory leak

### Image Optimization
- Next.js `next/image` untuk galeri dan foto profil
- Gunakan Supabase Storage URL langsung

### SEO
```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inv = await getInvitationData(params.slug)
  return {
    title: `Undangan ${inv.bride_nickname} & ${inv.groom_nickname}`,
    description: `Pernikahan ${inv.bride_name} & ${inv.groom_name}`,
    openGraph: {
      title: `Undangan Pernikahan ${inv.bride_nickname} & ${inv.groom_nickname}`,
      images: [inv.bride_photo_url || '/og-default.jpg'],
    },
  }
}
```

---

> **End of Plan**

> Pertanyaan untuk diskusi lanjutan:
> 1. Setuju mulai eksekusi?
> 2. Ingin deploy ke Vercel (gratis) atau VPS sendiri?
> 3. Tema pertama yang dikerjakan: Sakina saja, atau ada tema lain?
