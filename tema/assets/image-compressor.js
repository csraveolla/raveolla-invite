// ================================================================
// image-compressor.js — Resize foto agar muat bingkai 3000x2000 px.
// Kualitas dijaga (JPEG 0.95 / pertahankan format PNG-WebP).
// Jika ukuran sudah ≤ bingkai, file asli dikembalikan TANPA re-encode.
// ================================================================

export const WEB_MAX_WIDTH  = 3000
export const WEB_MAX_HEIGHT = 2000
export const WEB_QUALITY    = 0.95

function loadImage(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src     = url
  })
}

// Mengembalikan Blob versi web. Jika gambar sudah muat bingkai,
// mengembalikan file asli (=== file) tanpa kompresi.
export async function prepareWebImage(file, maxWidth = WEB_MAX_WIDTH, maxHeight = WEB_MAX_HEIGHT, quality = WEB_QUALITY) {
  const image = await loadImage(file)
  if (!image) return file

  const { width, height } = image
  if (width <= maxWidth && height <= maxHeight) return file

  const scale = Math.min(maxWidth / width, maxHeight / height)
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(image, 0, 0, w, h)

  const mime = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg'
  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality))
  return blob || file
}

// Ekstensi untuk path versi web
export function webExt(mime) {
  if (mime === 'image/png')  return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}
