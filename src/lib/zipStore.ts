export interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

class ByteWriter {
  private parts: Uint8Array[] = [];
  length = 0;

  u16(value: number) {
    const b = new Uint8Array(2);
    const v = new DataView(b.buffer);
    v.setUint16(0, value & 0xffff, true);
    this.push(b);
  }

  u32(value: number) {
    const b = new Uint8Array(4);
    const v = new DataView(b.buffer);
    v.setUint32(0, value >>> 0, true);
    this.push(b);
  }

  push(bytes: Uint8Array) {
    this.parts.push(bytes);
    this.length += bytes.length;
  }

  concat(): Uint8Array {
    const out = new Uint8Array(this.length);
    let offset = 0;
    for (const part of this.parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
}

/**
 * Builds a standards-compliant ZIP using the STORE method (no outer compression).
 * XLSX files are already ZIP-compressed internally, so recompressing them adds cost
 * without meaningful size savings. Keeping this utility dependency-free also isolates
 * the temporary internal batch tool from the production dependency graph.
 */
export function buildStoredZip(files: ZipFileEntry[]): Uint8Array {
  const local = new ByteWriter();
  const central = new ByteWriter();
  const { time, date } = dosDateTime();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const localOffset = local.length;

    // Local file header
    local.u32(0x04034b50);
    local.u16(20);
    local.u16(0x0800); // UTF-8 filenames
    local.u16(0); // STORE
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(data.length);
    local.u32(data.length);
    local.u16(nameBytes.length);
    local.u16(0);
    local.push(nameBytes);
    local.push(data);

    // Central directory entry
    central.u32(0x02014b50);
    central.u16(20);
    central.u16(20);
    central.u16(0x0800);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(data.length);
    central.u32(data.length);
    central.u16(nameBytes.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0);
    central.u32(localOffset);
    central.push(nameBytes);
  }

  const localBytes = local.concat();
  const centralBytes = central.concat();
  const end = new ByteWriter();

  end.u32(0x06054b50);
  end.u16(0);
  end.u16(0);
  end.u16(files.length);
  end.u16(files.length);
  end.u32(centralBytes.length);
  end.u32(localBytes.length);
  end.u16(0);

  const endBytes = end.concat();
  const out = new Uint8Array(localBytes.length + centralBytes.length + endBytes.length);
  out.set(localBytes, 0);
  out.set(centralBytes, localBytes.length);
  out.set(endBytes, localBytes.length + centralBytes.length);
  return out;
}
