export type WebpConvertOptions = {
  maxBytes: number
  maxDimension: number
  qualityStart?: number
  qualityMin?: number
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) return dataUrl.length
  const base64 = dataUrl.slice(commaIdx + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode image'))
    img.src = dataUrl
  })
}

function getTargetSize(width: number, height: number, maxDimension: number): { w: number; h: number } {
  if (width <= 0 || height <= 0) return { w: width, h: height }
  const maxSide = Math.max(width, height)
  if (maxSide <= maxDimension) return { w: width, h: height }
  const scale = maxDimension / maxSide
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) }
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to encode webp'))
        resolve(blob)
      },
      'image/webp',
      quality
    )
  })
}

export async function convertImageFileToWebpDataUrl(file: File, opts: WebpConvertOptions): Promise<string> {
  const qualityStart = typeof opts.qualityStart === 'number' ? opts.qualityStart : 0.85
  const qualityMin = typeof opts.qualityMin === 'number' ? opts.qualityMin : 0.55

  // Decode using a data URL to keep it broadly compatible.
  const inputDataUrl = await fileToDataUrl(file)
  const img = await loadImageFromDataUrl(inputDataUrl)

  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  if (!srcW || !srcH) throw new Error('Invalid image dimensions')

  // Some photos still can't reach maxBytes with just quality reduction.
  // In that case, we progressively downscale dimensions.
  let currentMaxDimension = Math.max(64, Math.floor(opts.maxDimension))
  let best: Blob | null = null

  for (let pass = 0; pass < 5; pass++) {
    const target = getTargetSize(srcW, srcH, currentMaxDimension)
    if (!target.w || !target.h) throw new Error('Invalid image dimensions')

    const canvas = document.createElement('canvas')
    canvas.width = target.w
    canvas.height = target.h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(img, 0, 0, target.w, target.h)

    // Try to fit under maxBytes by lowering quality.
    let quality = qualityStart
    while (quality >= qualityMin) {
      const blob = await canvasToWebpBlob(canvas, quality)
      best = blob
      if (blob.size <= opts.maxBytes) return await fileToDataUrl(blob)
      quality = Math.max(qualityMin, quality - 0.08)
      if (quality === qualityMin) break
    }

    // Still too large at min quality; reduce dimensions and retry.
    currentMaxDimension = Math.max(64, Math.floor(currentMaxDimension * 0.82))
  }

  if (!best) throw new Error('Failed to encode webp')
  return await fileToDataUrl(best)
}
