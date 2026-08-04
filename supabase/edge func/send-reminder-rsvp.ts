// supabase/functions/v1/send-reminder-rsvp/index.ts
// Kirim reminder isi RSVP ke tamu yang belum RSVP
// Mode 1: Dipanggil dari browser langsung (kirim sekarang)
// Mode 2: Dipanggil dari cron-job.org sesuai jadwal client

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS })

  try {
    const body           = await req.json().catch(() => ({}))
    const targetClientId = body.client_id || null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const DELAY_RANGE      = '5-30'
    const BATCH_PER_CLIENT = 100

    let clients: any[] = []

    if (targetClientId) {
      const { data } = await supabase
        .from('clients')
        .select('id, nama_acara, base_url, wa_mode, wa_api_key, reminder_rsvp_template')
        .eq('id', targetClientId)
        .single()
      if (data) clients = [data]
    } else {
      const now  = new Date()
      const wib  = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      const pad  = (n: number) => String(n).padStart(2, '0')
      const today = `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth()+1)}-${pad(wib.getUTCDate())}`

      if (wib.getUTCHours() !== 8) {
        return new Response(JSON.stringify({
          ok: true, pesan: `Di luar jam eksekusi reminder RSVP (08.00 WIB) — jam ${pad(wib.getUTCHours())}:00 WIB`
        }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      const { data } = await supabase
        .from('clients')
        .select('id, nama_acara, base_url, wa_mode, wa_api_key, reminder_rsvp_template')
        .eq('reminder_rsvp_jadwal', today)
        .eq('reminder_rsvp_aktif', true)
      clients = data || []
    }

    if (!clients.length) {
      return new Response(JSON.stringify({
        ok: true, pesan: targetClientId
          ? 'Client tidak ditemukan'
          : 'Tidak ada jadwal reminder RSVP hari ini'
      }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const allPayloads: { apiKey: string; nomor: string; pesan: string }[] = []
    const allLogs: object[] = []
    const waLogs: object[] = []

    for (const client of clients) {
      const apiKey = await resolveApiKey({ supabase, client })

      if (!apiKey) {
        console.warn(`[send-reminder-rsvp] Skip ${client.id} — tidak ada API key.`)
        continue
      }

      const DEFAULT_TEMPLATE =
        'Halo {nama}, kami mengundang Anda ke acara *{acara}*. ' +
        'Mohon konfirmasi kehadiran Anda melalui link berikut: {link} 🙏'
      const templateRaw = client.reminder_rsvp_template || DEFAULT_TEMPLATE

      const { data: semuaTamu } = await supabase
        .from('tamu_undangan')
        .select('id, nama, telpon')
        .eq('client_id', client.id)

      if (!semuaTamu?.length) {
        console.log(`[send-reminder-rsvp] ${client.nama_acara} — tidak ada tamu.`)
        continue
      }

      const { data: sudahRsvp } = await supabase
        .from('rsvp_tamu')
        .select('tamu_id')
        .eq('client_id', client.id)

      const sudahRsvpIds = new Set((sudahRsvp || []).map((r: any) => r.tamu_id))
      const belumRsvp = semuaTamu.filter(t => !sudahRsvpIds.has(t.id))

      if (!belumRsvp.length) {
        console.log(`[send-reminder-rsvp] ${client.nama_acara} — semua tamu sudah RSVP.`)
        continue
      }

      const { data: sudahKirim } = await supabase
        .from('reminder_log')
        .select('tamu_id')
        .eq('client_id', client.id)
        .eq('tipe', 'rsvp')
        .in('status', ['sent', 'sending'])

      const sudahKirimIds = new Set((sudahKirim || []).map((r: any) => r.tamu_id))
      const belum = belumRsvp.filter(t => !sudahKirimIds.has(t.id))

      if (!belum.length) {
        console.log(`[send-reminder-rsvp] ${client.nama_acara} — semua sudah dapat reminder RSVP.`)
        continue
      }

      const batch   = belum.slice(0, BATCH_PER_CLIENT)
      const adaSisa = belum.length > BATCH_PER_CLIENT
      console.log(`[send-reminder-rsvp] ${client.nama_acara}: ${batch.length} tamu diproses${adaSisa ? `, sisa ${belum.length - BATCH_PER_CLIENT}` : ''}.`)

      batch.forEach((t: any) => {
        const linkTamu = t.id && client.base_url
          ? `${client.base_url}?tamu=${t.id}`
          : client.base_url || ''

        const pesan = templateRaw
          .replace(/\{nama\}/g,  t.nama  || '')
          .replace(/\{acara\}/g, client.nama_acara || '')
          .replace(/\{link\}/g,  linkTamu)
          .replace(/\{url\}/g,   linkTamu)

        let nomor = String(t.telpon || '').replace(/\D/g, '')
        if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
        if (nomor.startsWith('8')) nomor = '62' + nomor
        if (!nomor.startsWith('62')) nomor = '62' + nomor
        if (!nomor || nomor.length < 10) return

        allPayloads.push({ apiKey, nomor, pesan })
        allLogs.push({
          client_id: client.id,
          tamu_id:   t.id,
          nama:      t.nama || '',
          nomor,
          tipe:      'rsvp',
          status:    'sending'
        })
        waLogs.push({
          client_id: client.id,
          tamu_id:   t.id,
          nomor,
          nama:      t.nama || '',
          pesan,
          status:    'sent',
          tipe:      'rsvp'
        })
      })
    }

    if (!allPayloads.length) {
      return new Response(JSON.stringify({
        ok: true, pesan: 'Tidak ada tamu yang perlu dikirimi reminder RSVP'
      }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const results = await Promise.all(
      allPayloads.map(p =>
        fetch('https://api.fonnte.com/send', {
          method:  'POST',
          headers: { Authorization: p.apiKey },
          body:    new URLSearchParams({
            target:      p.nomor,
            message:     p.pesan,
            delay:       DELAY_RANGE,
            countryCode: '62',
            typing:      'true',
            duration:    String(3 + Math.floor(Math.random() * 5))
          })
        })
          .then(async res => {
            const data = await res.json().catch(() => ({}))
            return data?.status === true
          })
          .catch(err => {
            console.error(`[send-reminder-rsvp] Gagal kirim ke ${p.nomor}:`, err)
            return false
          })
      )
    )

    const indexSukses = results
      .map((ok, i) => (ok ? i : -1))
      .filter(i => i >= 0)

    if (indexSukses.length) {
      await supabase.from('reminder_log').insert(indexSukses.map(i => allLogs[i]))
      await supabase.from('wa_log').insert(indexSukses.map(i => waLogs[i]))

      const quotaPerClient = new Map<string, number>()
      indexSukses.forEach(i => {
        const log: any = allLogs[i]
        quotaPerClient.set(log.client_id, (quotaPerClient.get(log.client_id) || 0) + 1)
      })
      for (const [clientId, jumlah] of quotaPerClient) {
        try {
          const { error } = await supabase.rpc('increment_wa_terkirim', {
            p_client_id: clientId,
            p_jumlah:    jumlah
          })
          if (error) throw error
        } catch {
          const { data } = await supabase.from('clients')
            .select('wa_terkirim').eq('id', clientId).single()
          await supabase.from('clients')
            .update({ wa_terkirim: (data?.wa_terkirim || 0) + jumlah })
            .eq('id', clientId)
        }
      }
    }

    const gagal = allPayloads.length - indexSukses.length
    console.log(`[send-reminder-rsvp] ✓ ${indexSukses.length} pesan terkirim ke Fonnte${gagal ? `, ${gagal} gagal` : ''}.`)

    return new Response(
      JSON.stringify({ ok: true, ditembak: indexSukses.length, gagal }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[send-reminder-rsvp] Error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

async function resolveApiKey({ supabase, client }: {
  supabase: any; client: any
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
    console.warn(`[send-reminder-rsvp] Gagal baca admin_settings (admin_apikey): ${e?.message || e}`)
  }
  return null
}
