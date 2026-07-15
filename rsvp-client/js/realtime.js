// ============================================================
// realtime.js — Supabase Realtime & Fallback Polling
// ============================================================
import { SB, KEY } from './config.js';

export let supabaseClient  = null;
let realtimeChannel = null;
let fallbackInterval = null;

export function initSupabaseClient() {
  if (supabaseClient) return;
  supabaseClient = window.supabase.createClient(SB, KEY);
}

let lastStatus = null;

export function initRealtime() {
  // Import di dalam fungsi untuk hindari circular dependency
  const { clientData }     = window._appState;
  const { loadTamu }       = window._appModules.tamu;
  const { loadRsvp }       = window._appModules.rsvp;
  const { loadKomentar }   = window._appModules.komentar;
  const { loadKirimLog }   = window._appModules.log;
  const { refreshReminderBadges } = window._appModules.reminder;

  if (!clientData?.id) return;
  initSupabaseClient();

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  lastStatus = null;

  realtimeChannel = supabaseClient
    .channel(`client-${clientData.id}`)

    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tamu_undangan',
      filter: `client_id=eq.${clientData.id}`
    }, () => loadTamu())

    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'rsvp_tamu',
      filter: `client_id=eq.${clientData.id}`
    }, () => { loadRsvp(); loadTamu(); })

    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'komentar',
      filter: `client_id=eq.${clientData.id}`
    }, () => loadKomentar())

    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'wa_log',
      filter: `client_id=eq.${clientData.id}`
    }, () => {
      const tabRiwayat = document.getElementById('tab-riwayat');
      if (tabRiwayat?.classList.contains('active')) loadKirimLog();
    })

    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'reminder_log',
      filter: `client_id=eq.${clientData.id}`
    }, () => refreshReminderBadges())

    .subscribe((status) => {
      // Supabase kadang sempat lempar CHANNEL_ERROR sesaat lalu otomatis
      // reconnect ke SUBSCRIBED — ini normal, terutama tepat setelah login.
      // Hindari log berulang untuk status yang sama persis.
      if (status === lastStatus) return;
      lastStatus = status;

      if (status === 'SUBSCRIBED') {
        console.log('✓ Realtime terhubung');
        stopFallbackPolling(); // realtime sudah pulih, tidak perlu polling ganda
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(`⚠ Realtime terputus (${status}) — mengaktifkan fallback polling sementara`);
        startFallbackPolling();
      }
    });
}

function startFallbackPolling() {
  if (fallbackInterval) return;
  fallbackInterval = setInterval(() => {
    const { clientData }  = window._appState;
    const { loadRsvp }    = window._appModules.rsvp;
    const { loadTamu }    = window._appModules.tamu;
    if (clientData && !document.hidden) { loadRsvp(); loadTamu(); }
  }, 120000);
}

function stopFallbackPolling() {
  if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
}

export function stopRealtime() {
  if (realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  stopFallbackPolling();
  lastStatus = null;
}
