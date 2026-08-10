const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePng(width, height) {
  // Simple PNG generator with a dark purple/zinc background and purple glowing accent
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Calculate normalized coords
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(nx * nx + ny * ny);
      
      let r, g, b, a;
      if (dist < 0.7) {
        // Trelvix Violet Accent (#8b5cf6 -> #6366f1)
        r = Math.floor(139 + (99 - 139) * (y / height));
        g = Math.floor(92 + (102 - 92) * (y / height));
        b = Math.floor(246 + (241 - 246) * (y / height));
        a = 255;
      } else {
        // Dark Zinc (#09090b)
        r = 9;
        g = 9;
        b = 11;
        a = 255;
      }
      
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // CRC32 helper
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let c = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc ^ c) & 1 ? 0xedb88320 : 0);
        c >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type 6 (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), makePng(16, 16));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), makePng(32, 32));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), makePng(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), makePng(32, 32));

console.log('Successfully generated favicon PNG files in /public');
