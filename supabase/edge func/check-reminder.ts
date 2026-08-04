// supabase/functions/check-reminder/index.ts
// Cek & kirim reminder H-3/H-1 otomatis — sequential, no setTimeout
// Deploy: supabase functions deploy check-reminder
// Trigger: cron-job.org tiap jam 08:00 WIB

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DELAY_RANGE      = '5-30'
const BATCH_PER_CLIENT = 100

function pad(n: number) { return String(n).padStart(2, '0') }
function addDays(d: Date, days: number) {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + days)
  return `${r.getUTCFullYear()}-${pad(r.getUTCMonth()+1)}-${pad(r.getUTCDate())}`
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now   = new Date()
    const wib   = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const today = addDays(wib, 0)
    const h3    = addDays(wib, 3)
    const h1    = addDays(wib, 1)

    console.log(`[check-reminder] WIB: ${today} | H-3: ${h3} | H-1: ${h1}`)

    if (wib.getUTCHours() !== 8) {
      console.log(`[check-reminder] Di luar jam eksekusi (08.00 WIB) — sekarang ${pad(wib.getUTCHours())}:00 WIB, skip.`)
      return new Response(
        JSON.stringify({ ok: true, pesan: `Di luar jam eksekusi H-3/H-1 — jam ${pad(wib.getUTCHours())}:00 WIB` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: clients, error: errClients } = await supabase
      .from('clients')
      .select('id, nama_acara, tanggal_acara, wa_mode, wa_api_key, base_url, reminder_h3, reminder_h1, reminder_template_h3, reminder_template_h1, wa_terkirim, max_wa')
      .or(`and(tanggal_acara.eq.${h3},reminder_h3.eq.true),and(tanggal_acara.eq.${h1},reminder_h1.eq.true)`)

    if (errClients) throw new Error(errClients.message || JSON.stringify(errClients))
    if (!clients?.length) {
      return new Response(
        JSON.stringify({ ok: true, pesan: 'Tidak ada reminder hari ini', today, h3, h1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[check-reminder] ${clients.length} client perlu reminder.`)
    let totalTerkirim = 0

    for (const client of clients) {
      try {
        const result = await prosesClientReminder({ supabase, client, h3, h1 })
        totalTerkirim += result
      } catch (e) {
        console.error(`[check-reminder][${client.nama_acara}] Error:`, e)
      }
    }

    console.log(`[check-reminder] Selesai: ${totalTerkirim} pesan terkirim dari ${clients.length} client.`)

    return new Response(
      JSON.stringify({ ok: true, diproses: clients.length, terkirim: totalTerkirim, today, h3, h1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[check-reminder] Error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || JSON.stringify(err) }),
      { status: 500 }
    )
  }
})

async function prosesClientReminder({ supabase, client, h3, h1 }: {
  supabase: any; client: any; h3: string; h1: string
}): Promise<number> {
  const log   = (msg: string) => console.log(`[check-reminder][${client.nama_acara}] ${msg}`)
  const tipe  = client.tanggal_acara === h3 ? 'h3' : 'h1'

  const sisa = Math.max(0, (client.max_wa || 500) - (client.wa_terkirim || 0))
  if (sisa <= 0) { log('Kuota paket habis — skip.'); return 0 }

  const apiKey = await resolveApiKey({ supabase, client, log })
  if (!apiKey) { log('Tidak ada API key — skip.'); return 0 }

  const DEFAULT_H3 = 'Halo {nama}, mengingatkan bahwa acara *{acara}* tinggal 3 hari lagi! Jangan lupa membawa QR Code undangan Anda 🙏'
  const DEFAULT_H1 = 'Halo {nama}, besok adalah hari istimewa! Acara *{acara}* akan segera dimulai. Sampai jumpa! 🎊'
  const templateRaw = tipe === 'h3'
    ? (client.reminder_template_h3 || DEFAULT_H3)
    : (client.reminder_template_h1 || DEFAULT_H1)

  const { data: tamuRsvp } = await supabase
    .from('rsvp_tamu')
    .select('id, tamu_id, nama, telpon')
    .eq('client_id', client.id)
    .eq('kehadiran', 'Hadir')

  if (!tamuRsvp?.length) { log('Tidak ada tamu RSVP Hadir.'); return 0 }

  const tamuIdsBelumTelpon = tamuRsvp
    .filter((t: any) => !t.telpon)
    .map((t: any) => t.tamu_id)
    .filter(Boolean)

  const telponMap: Record<string, string> = {}
  if (tamuIdsBelumTelpon.length > 0) {
    const { data: tamuUndangan } = await supabase
      .from('tamu_undangan')
      .select('id, telpon')
      .in('id', tamuIdsBelumTelpon)
    ;(tamuUndangan || []).forEach((t: any) => { telponMap[t.id] = t.telpon })
  }

  const tamu = tamuRsvp.map((t: any) => ({
    ...t,
    telpon: t.telpon || telponMap[t.tamu_id] || ''
  }))

  if (!tamu.length) { log('Tidak ada tamu RSVP Hadir.'); return 0 }

  const { data: sudahKirim } = await supabase
    .from('reminder_log')
    .select('tamu_id')
    .eq('client_id', client.id)
    .eq('tipe', tipe)
    .in('status', ['sent', 'sending'])

  const sudahIds = new Set((sudahKirim || []).map((r: any) => r.tamu_id))
  const belum    = tamu.filter((t: any) => !sudahIds.has(t.tamu_id || t.id))
  if (!belum.length) { log(`Semua tamu sudah dapat reminder ${tipe}.`); return 0 }

  const batch   = belum.slice(0, Math.min(BATCH_PER_CLIENT, sisa))
  const adaSisa = belum.length > batch.length
  log(`${tipe.toUpperCase()}: ${batch.length} tamu${adaSisa ? `, sisa ${belum.length - batch.length}` : ''}.`)

  const payloads: any[] = []
  const logs: any[]     = []
  const waLogs: any[]   = []

  batch.forEach((t: any) => {
    const link  = t.tamu_id && client.base_url ? `${client.base_url}?tamu=${t.tamu_id}` : client.base_url || ''
    const pesan = templateRaw
      .replace(/\{nama\}/g,  t.nama || '')
      .replace(/\{acara\}/g, client.nama_acara || '')
      .replace(/\{link\}/g,  link)
      .replace(/\{url\}/g,   link)

    let nomor = String(t.telpon || '').replace(/\D/g, '')
    if (nomor.startsWith('0'))   nomor = '62' + nomor.slice(1)
    if (nomor.startsWith('8'))   nomor = '62' + nomor
    if (!nomor.startsWith('62')) nomor = '62' + nomor
    if (!nomor || nomor.length < 10) return

    payloads.push({ nomor, pesan })
    logs.push({ client_id: client.id, tamu_id: t.tamu_id || t.id, nama: t.nama || '', nomor, tipe, status: 'sending' })
    waLogs.push({ client_id: client.id, tamu_id: t.tamu_id || t.id, nomor, nama: t.nama || '', pesan, status: 'sent', tipe })
  })

  if (!payloads.length) return 0

  const results = await Promise.all(
    payloads.map(p =>
      fetch('https://api.fonnte.com/send', {
        method:  'POST',
        headers: { Authorization: apiKey },
        body:    new URLSearchParams({
          target: p.nomor, message: p.pesan, delay: DELAY_RANGE,
          countryCode: '62', typing: 'true',
          duration: String(3 + Math.floor(Math.random() * 5))
        })
      })
        .then(async res => {
          const data = await res.json().catch(() => ({}))
          return data?.status === true
        })
        .catch(err => {
          console.error(`[check-reminder][${client.nama_acara}] Gagal kirim ke ${p.nomor}:`, err)
          return false
        })
    )
  )

  const indexSukses = results
    .map((ok, i) => (ok ? i : -1))
    .filter(i => i >= 0)

  if (!indexSukses.length) {
    log('Semua kiriman gagal di Fonnte — tidak ada log/kuota ditambah.')
    return 0
  }

  await supabase.from('reminder_log').insert(indexSukses.map(i => logs[i]))
  await supabase.from('wa_log').insert(indexSukses.map(i => waLogs[i]))
  await incrKuota(supabase, client.id, indexSukses.length)

  const gagal = payloads.length - indexSukses.length
  log(`✓ ${indexSukses.length} pesan terkirim ke Fonnte${gagal ? `, ${gagal} gagal` : ''}.`)
  return indexSukses.length
}

async function resolveApiKey({ supabase, client, log }: {
  supabase: any; client: any; log?: (msg: string) => void
}): Promise<string | null> {
  if (client.wa_mode === 'client') return client.wa_api_key || null
  const envKey = Deno.env.get('ADMIN_API_KEY')
  if (envKey) return envKey
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('id', 'admin_apikey')
      .single()
    if (error) throw error
    if (data?.value) return data.value
  } catch (e: any) {
    log?.(`Gagal baca admin_settings (admin_apikey): ${e?.message || e}`)
  }
  return null
}

async function incrKuota(supabase: any, clientId: string, jumlah: number) {
  const { error } = await supabase.rpc('increment_wa_terkirim', {
    p_client_id: clientId,
    p_jumlah:    jumlah
  })
  if (error) {
    const { data } = await supabase.from('clients').select('wa_terkirim').eq('id', clientId).single()
    await supabase.from('clients')
      .update({ wa_terkirim: (data?.wa_terkirim || 0) + jumlah })
      .eq('id', clientId)
  }
}
