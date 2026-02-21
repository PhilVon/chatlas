// Converts build/icon.svg → build/icon.ico (multi-size PNG-in-ICO)
const sharp = require('../node_modules/sharp')
const fs = require('fs')
const path = require('path')

const svgPath  = path.join(__dirname, 'icon.svg')
const icoPath  = path.join(__dirname, 'icon.ico')

// Windows icon sizes (16 and 32 are critical for explorer/taskbar)
const sizes = [16, 24, 32, 48, 64, 128, 256]

async function main() {
  const svgBuffer = fs.readFileSync(svgPath)

  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  )

  const count = sizes.length
  const HEADER_SIZE    = 6
  const DIR_ENTRY_SIZE = 16

  // Calculate image offsets
  const dataOffset = HEADER_SIZE + DIR_ENTRY_SIZE * count
  const offsets = []
  let pos = dataOffset
  for (const buf of pngBuffers) {
    offsets.push(pos)
    pos += buf.length
  }

  // ICONDIR header (6 bytes)
  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type 1 = ICO
  header.writeUInt16LE(count, 4) // image count

  // ICONDIRENTRY array
  const dir = Buffer.alloc(DIR_ENTRY_SIZE * count)
  for (let i = 0; i < count; i++) {
    const off  = i * DIR_ENTRY_SIZE
    const size = sizes[i]
    dir.writeUInt8(size >= 256 ? 0 : size, off)      // width  (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, off + 1)  // height (0 = 256)
    dir.writeUInt8(0, off + 2)                        // colorCount
    dir.writeUInt8(0, off + 3)                        // reserved
    dir.writeUInt16LE(1,  off + 4)                    // planes
    dir.writeUInt16LE(32, off + 6)                    // bitCount (32-bit RGBA)
    dir.writeUInt32LE(pngBuffers[i].length, off + 8)  // sizeInBytes
    dir.writeUInt32LE(offsets[i],           off + 12) // offset
  }

  const ico = Buffer.concat([header, dir, ...pngBuffers])
  fs.writeFileSync(icoPath, ico)
  console.log(`✓ Created ${icoPath}  (${(ico.length / 1024).toFixed(1)} kB, sizes: ${sizes.join(', ')}px)`)
}

main().catch(err => { console.error(err); process.exit(1) })
