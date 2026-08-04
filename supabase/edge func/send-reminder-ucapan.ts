// supabase/functions/v1/send-reminder-ucapan/index.ts
// Kirim ucapan terima kasih setelah acara
// Mode 1: Dipanggil dari browser (kirim sekarang)
// Mode 2: Dipanggil cron-job.org sesuai jadwal client

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
        .select('id, nama_acara, base_url, wa_mode, wa_api_key, reminder_ucapan_template, reminder_ucapan_target')
        .eq('id', targetClientId)
        .single()
      if (data) clients = [data]
    } else {
      const now  = new Date()
      const wib  = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      const pad  = (n: number) => String(n).padStart(2, '0')
      const today = `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth()+1)}-${pad(wib.getUTCDate())}`

      if (wib.getUTCHours() !== 10) {
        return new Response(JSON.stringify({
          ok: true, pesan: `Di luar jam eksekusi ucapan (10.00 WIB) — jam ${pad(wib.getUTCHours())}:00 WIB`
        }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      const { data } = await supabase
        .from('clients')
        .select('id, nama_acara, base_url, wa_mode, wa_api_key, reminder_ucapan_template, reminder_ucapan_target')
        .eq('reminder_ucapan_jadwal', today)
        .eq('reminder_ucapan_aktif', true)
      clients = data || []
    }

    if (!clients.length) {
      return new Response(JSON.stringify({
        ok: true, pesan: targetClientId
          ? 'Client tidak ditemukan'
          : 'Tidak ada jadwal ucapan terima kasih hari ini'
      }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const allPayloads: { apiKey: string; nomor: string; pesan: string }[] = []
    const allLogs: object[] = []
    const waLogs: object[] = []

    for (const client of clients) {
      const apiKey = await resolveApiKey({ supabase, client })

      if (!apiKey) {
        console.warn(`[send-reminder-ucapan] Skip ${client.id} — tidak ada API key.`)
        continue
      }

      const DEFAULT_TEMPLATE =
        'Terima kasih {nama} atas kehadiran dan doa restu yang telah diberikan di acara *{acara}*. ' +
        'Semoga silaturahmi kita selalu terjaga. Salam hangat 🙏'
      const templateRaw = client.reminder_ucapan_template || DEFAULT_TEMPLATE

      const target = client.reminder_ucapan_target || 'hadir'
      const query  = supabase
        .from('rsvp_tamu')
        .select('id, tamu_id, nama, telpon')
        .eq('client_id', client.id)
      const { data: tamuRsvp } = target === 'semua'
        ? await query
        : await query.eq('status_hadir', true)

      const tamuIdsBelumTelpon = (tamuRsvp || [])
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

      const tamu = (tamuRsvp || []).map((t: any) => ({
        ...t,
        telpon: t.telpon || telponMap[t.tamu_id] || ''
      }))

      if (!tamu?.length) {
        console.log(`[send-reminder-ucapan] ${client.nama_acara} — belum ada tamu yang check-in.`)
        continue
      }

      const { data: sudahKirim } = await supabase
        .from('reminder_log')
        .select('tamu_id')
        .eq('client_id', client.id)
        .eq('tipe', 'ucapan')
        .in('status', ['sent', 'sending'])

      const sudahIds = new Set((sudahKirim || []).map((r: any) => r.tamu_id))
      const belum    = tamu.filter(t => !sudahIds.has(t.tamu_id || t.id))

      if (!belum.length) {
        console.log(`[send-reminder-ucapan] ${client.nama_acara} — semua sudah dapat ucapan.`)
        continue
      }

      const batch   = belum.slice(0, BATCH_PER_CLIENT)
      const adaSisa = belum.length > BATCH_PER_CLIENT
      console.log(`[send-reminder-ucapan] ${client.nama_acara}: ${batch.length} tamu${adaSisa ? `, sisa ${belum.length - BATCH_PER_CLIENT}` : ''}.`)

      batch.forEach((t: any) => {
        const pesan = templateRaw
          .replace(/\{nama\}/g,  t.nama || '')
          .replace(/\{acara\}/g, client.nama_acara || '')

        let nomor = String(t.telpon || '').replace(/\D/g, '')
        if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
        if (nomor.startsWith('8')) nomor = '62' + nomor
        if (!nomor.startsWith('62')) nomor = '62' + nomor
        if (!nomor || nomor.length < 10) return

        allPayloads.push({ apiKey, nomor, pesan })
        allLogs.push({
          client_id: client.id,
          tamu_id:   t.tamu_id || t.id,
          nama:      t.nama || '',
          nomor,
          tipe:      'ucapan',
          status:    'sending'
        })
        waLogs.push({
          client_id: client.id,
          tamu_id:   t.tamu_id || t.id,
          nomor,
          nama:      t.nama || '',
          pesan,
          status:    'sent',
          tipe:      'ucapan'
        })
      })
    }

    if (!allPayloads.length) {
      return new Response(JSON.stringify({
        ok: true, pesan: 'Tidak ada tamu yang perlu dikirimi ucapan terima kasih'
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
            console.error(`[send-reminder-ucapan] Gagal kirim ke ${p.nomor}:`, err)
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
    console.log(`[send-reminder-ucapan] ✓ ${indexSukses.length} pesan terkirim ke Fonnte${gagal ? `, ${gagal} gagal` : ''}.`)

    return new Response(
      JSON.stringify({ ok: true, ditembak: indexSukses.length, gagal }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[send-reminder-ucapan] Error:', err)
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
    console.warn(`[send-reminder-ucapan] Gagal baca admin_settings (admin_apikey): ${e?.message || e}`)
  }
  return null
}
