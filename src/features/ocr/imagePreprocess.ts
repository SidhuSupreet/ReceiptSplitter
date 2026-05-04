const MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.9

export async function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

/**
 * Returns a data URL for the input image, downscaling and re-encoding as JPEG
 * if the original is larger than 5 MB or has a long edge over 1800px.
 */
export async function preprocessImage(file: File): Promise<string> {
  if (file.size <= MAX_BYTES) {
    return readAsDataUrl(file)
  }

  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
  const targetWidth = Math.round(img.naturalWidth * scale)
  const targetHeight = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}
