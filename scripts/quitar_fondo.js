// Quita el fondo blanco de una imagen usando flood-fill desde los bordes,
// para no comerse zonas blancas internas (guantes, calendario) que estan
// encerradas por el trazo negro del dibujo.
import sharp from 'sharp'

const ENTRADA = process.argv[2]
const SALIDA = process.argv[3]
const UMBRAL = 20 // que tan cerca de blanco puro (0-255) cuenta como fondo

async function main() {
  const img = sharp(ENTRADA).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const esBlanco = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    return (255 - r) <= UMBRAL && (255 - g) <= UMBRAL && (255 - b) <= UMBRAL
  }

  const visitado = new Uint8Array(width * height)
  const pila = []

  for (let x = 0; x < width; x++) {
    pila.push([x, 0], [x, height - 1])
  }
  for (let y = 0; y < height; y++) {
    pila.push([0, y], [width - 1, y])
  }

  while (pila.length) {
    const [x, y] = pila.pop()
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const idxPixel = y * width + x
    if (visitado[idxPixel]) continue
    const i = idxPixel * channels
    if (!esBlanco(i)) continue
    visitado[idxPixel] = 1
    data[i + 3] = 0
    pila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(SALIDA)

  console.log('Listo:', SALIDA)
}

main().catch(err => { console.error(err); process.exit(1) })
