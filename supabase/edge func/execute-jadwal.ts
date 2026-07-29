// supabase/functions/execute-jadwal/index.ts
// Eksekusi jadwal kirim massal — sequential, no setTimeout
// Dipanggil cron-job.org tiap 1 jam: 0 * * * *
// Deploy: supabase functions deploy execute-jadwal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_PER_CLIENT  = 50
const DELAY_RANGE       = '10-30'

function pad(n: number) { return String(n).padStart(2, '0') }

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now   = new Date()
    const wib   = new Date(now.getTime() + 7 * 60 * 60 * 1000)

    const jamMulai = new Date(wib)
    jamMulai.setUTCMinutes(0, 0, 0)
    const jamSelesai = new Date(jamMulai)
    jamSelesai.setUTCHours(jamSelesai.getUTCHours() + 1)

    const mulaiUtc   = new Date(jamMulai.getTime()   - 7 * 60 * 60 * 1000).toISOString()
    const selesaiUtc = new Date(jamSelesai.getTime() - 7 * 60 * 60 * 1000).toISOString()

    const wibStr = `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth()+1)}-${pad(wib.getUTCDate())} ${pad(wib.getUTCHours())}:00 WIB`
    console.log(`[execute-jadwal] Cek jadwal jam ${wibStr}`)

    const { data: jadwals, error: errJadwal } = await supabase
      .from('kirim_jadwal')
      .select('id, client_id, tamu_ids, waktu_kirim, status, terkirim, total_tamu')
      .in('status', ['terjadwal', 'sebagian'])
      .gte('waktu_kirim', mulaiUtc)
      .lt('waktu_kirim', selesaiUtc)
      .order('created_at', { ascending: true })

    if (errJadwal) throw new Error(errJadwal.message || JSON.stringify(errJadwal))

    if (!jadwals?.length) {
      console.log('[execute-jadwal] Tidak ada jadwal jam ini.')
      return new Response(JSON.stringify({ ok: true, pesan: 'Tidak ada jadwal jam ini', jam: wibStr }), { status: 200 })
    }

    console.log(`[execute-jadwal] ${jadwals.length} jadwal ditemukan.`)

    const clientIds = [...new Set(jadwals.map(j => j.client_id))]
    const { data: clients } = await supabase
      .from('clients')
      .select('id, nama_acara, base_url, wa_mode, wa_api_key, wa_terkirim, max_wa, pesan_template, wa_media_url, paket')
      .in('id', clientIds)

    const clientMap = new Map((clients || []).map(c => [c.id, c]))
    const hasilPerJadwal: object[] = []
    let totalTerkirim = 0

    for (let idx = 0; idx < jadwals.length; idx++) {
      if (idx > 0) await delay(5 * 60 * 1000) // offset 5 menit antar jadwal

      const jadwal = jadwals[idx]
      const client = clientMap.get(jadwal.client_id)

      if (!client) {
        console.warn(`[execute-jadwal] Client ${jadwal.client_id} tidak ditemukan, skip.`)
        continue
      }

      try {
        const result = await prosesJadwal({ supabase, jadwal, client })
        totalTerkirim += result
        hasilPerJadwal.push({ jadwal_id: jadwal.id, client: client.nama_acara, terkirim: result })
      } catch (e) {
        console.error(`[execute-jadwal] Error proses jadwal ${jadwal.id}:`, e)
      }
    }

    console.log(`[execute-jadwal] Selesai: ${totalTerkirim} pesan terkirim dari ${jadwals.length} jadwal.`)

    return new Response(
      JSON.stringify({ ok: true, diproses: jadwals.length, terkirim: totalTerkirim, detail: hasilPerJadwal }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    const errMsg = err?.message || err?.error_description || JSON.stringify(err) || String(err)
    console.error('[execute-jadwal] Error:', errMsg, err)
    return new Response(
      JSON.stringify({ ok: false, error: errMsg, detail: JSON.stringify(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function prosesJadwal({ supabase, jadwal, client }: {
  supabase: any; jadwal: any; client: any
}): Promise<number> {
  const logPrefix = `[execute-jadwal][${client.nama_acara}]`

  const sisaKuota = Math.max(0, (client.max_wa || 500) - (client.wa_terkirim || 0))
  if (sisaKuota <= 0) {
    console.log(`${logPrefix} Kuota paket habis — skip.`)
    await supabase.from('kirim_jadwal').update({ status: 'gagal' }).eq('id', jadwal.id)
    return 0
  }

  const semuaTamuIds: string[] = jadwal.tamu_ids || []
  const sudahTerkirim          = jadwal.terkirim  || 0
  const sisaTamuIds            = semuaTamuIds.slice(sudahTerkirim)

  if (!sisaTamuIds.length) {
    await supabase.from('kirim_jadwal').update({ status: 'terkirim' }).eq('id', jadwal.id)
    return 0
  }

  const batchIds  = sisaTamuIds.slice(0, Math.min(BATCH_PER_CLIENT, sisaKuota))
  const adaSisa   = sisaTamuIds.length > batchIds.length
  console.log(`${logPrefix} Kirim ${batchIds.length} tamu${adaSisa ? `, sisa ${sisaTamuIds.length - batchIds.length}` : ''}.`)

  const { data: tamuList } = await supabase
    .from('tamu_undangan')
    .select('id, nama, telpon')
    .in('id', batchIds)

  if (!tamuList?.length) {
    console.log(`${logPrefix} Data tamu tidak ditemukan.`)
    return 0
  }

  const { data: sudahKirimLog } = await supabase
    .from('wa_log')
    .select('tamu_id')
    .eq('client_id', client.id)
    .eq('tipe', 'massal')
    .eq('status', 'sent')
    .in('tamu_id', batchIds)

  const sudahKirimIds = new Set((sudahKirimLog || []).map((l: any) => l.tamu_id))
  const tamuFinal     = tamuList.filter((t: any) => !sudahKirimIds.has(t.id))

  if (!tamuFinal.length) {
    console.log(`${logPrefix} Semua tamu di batch ini sudah dikirim langsung — tandai selesai.`)
    const baru_terkirim = (jadwal.terkirim || 0) + batchIds.length
    const semuaSelesai  = baru_terkirim >= (jadwal.tamu_ids || []).length
    await supabase.from('kirim_jadwal').update({
      status:   semuaSelesai ? 'terkirim' : 'sebagian',
      terkirim: baru_terkirim,
      ...(semuaSelesai ? {} : { waktu_kirim: new Date(new Date(jadwal.waktu_kirim).getTime() + 3600000).toISOString() })
    }).eq('id', jadwal.id)
    return 0
  }

  console.log(`${logPrefix} Batch ${batchIds.length} tamu — kirim: ${tamuFinal.length}, skip (sudah dikirim langsung): ${sudahKirimIds.size}.`)

  const apiKey = client.wa_mode === 'client'
    ? client.wa_api_key
    : Deno.env.get('ADMIN_API_KEY')

  if (!apiKey) {
    console.error(`${logPrefix} API key tidak ditemukan — abort.`)
    await supabase.from('kirim_jadwal').update({ status: 'gagal' }).eq('id', jadwal.id)
    return 0
  }

  const DEFAULT_TEMPLATE = 'Halo {nama}, berikut link undangan Anda: {link} 🙏'
  const template = client.pesan_template || DEFAULT_TEMPLATE
  const BASE_URL = client.base_url || ''

  const payloads = tamuFinal.map((t: any) => {
    const link  = BASE_URL ? `${BASE_URL}?tamu=${t.id}` : ''
    const pesan = template
      .replace(/\{nama\}/g,  t.nama || '')
      .replace(/\{link\}/g,  link)
      .replace(/\{url\}/g,   link)

    let nomor = String(t.telpon || '').replace(/\D/g, '')
    if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
    if (nomor.startsWith('8')) nomor = '62' + nomor
    if (!nomor.startsWith('62')) nomor = '62' + nomor

    return { id: t.id, nomor, pesan }
  }).filter(p => p.nomor && p.nomor.length >= 10)

  const fonnteParams: Record<string, string> = {
    delay:       DELAY_RANGE,
    countryCode: '62',
    typing:      'true',
    duration:    String(3 + Math.floor(Math.random() * 5))
  }
  if (client.wa_media_url && (client.paket === 'pro' || client.paket === 'premium')) {
    fonnteParams.url = client.wa_media_url
  }

  await Promise.all(
    payloads.map(p =>
      fetch('https://api.fonnte.com/send', {
        method:  'POST',
        headers: { Authorization: apiKey },
        body:    new URLSearchParams({ target: p.nomor, message: p.pesan, ...fonnteParams })
      }).catch(err => {
        console.error(`${logPrefix} Gagal kirim ke ${p.nomor}:`, err)
        return null
      })
    )
  )

  const { error: errIncr } = await supabase.rpc('increment_wa_terkirim', {
    p_client_id: client.id,
    p_jumlah:    payloads.length
  })
  if (errIncr) {
    const { data: cur } = await supabase.from('clients').select('wa_terkirim').eq('id', client.id).single()
    await supabase.from('clients')
      .update({ wa_terkirim: (cur?.wa_terkirim || client.wa_terkirim || 0) + payloads.length })
      .eq('id', client.id)
  }

  const logs = payloads.map(p => ({
    client_id: client.id,
    tamu_id:   p.id,
    nomor:     p.nomor,
    pesan:     p.pesan,
    status:    'sent',
    tipe:      'massal'
  }))
  const { error: errLog } = await supabase.from('wa_log').insert(logs)
  if (errLog) console.error(`${logPrefix} Gagal insert wa_log:`, errLog.message)

  const tamuIdsTerkirim = payloads.map(p => p.id)
  if (tamuIdsTerkirim.length) {
    const { error: errKirim } = await supabase
      .from('tamu_undangan')
      .update({ status_kirim: true })
      .in('id', tamuIdsTerkirim)
    if (errKirim) console.error(`${logPrefix} Gagal update status_kirim:`, errKirim.message)
  }

  const baru_terkirim = sudahTerkirim + batchIds.length

  if (adaSisa) {
    const waktuBerikutnya = new Date(jadwal.waktu_kirim)
    waktuBerikutnya.setUTCHours(waktuBerikutnya.getUTCHours() + 1)

    await supabase.from('kirim_jadwal').update({
      status:      'sebagian',
      terkirim:    baru_terkirim,
      waktu_kirim: waktuBerikutnya.toISOString()
    }).eq('id', jadwal.id)

    console.log(`${logPrefix} Sisa akan dilanjutkan jam berikutnya.`)
  } else {
    await supabase.from('kirim_jadwal').update({
      status:   'terkirim',
      terkirim: baru_terkirim
    }).eq('id', jadwal.id)
    console.log(`${logPrefix} Semua terkirim.`)
  }

  return payloads.length
}
