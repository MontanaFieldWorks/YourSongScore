/**
 * Pure TypeScript WAV Metadata Parser
 * Parse RIFF INFO (INAM, IART, IGNR) and ID3 (TIT2, TPE1, TCON, APIC) metadata directly from WAV binary ArrayBuffers.
 */

export interface WavMetadata {
  title?: string;
  artist?: string;
  genre?: string;
  coverArt?: string;
}

export async function parseWavFile(file: File): Promise<WavMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return parseWavBuffer(arrayBuffer);
  } catch (error) {
    console.error("Failed to parse WAV arrayBuffer:", error);
    return {};
  }
}

export function parseWavBuffer(arrayBuffer: ArrayBuffer): WavMetadata {
  const result: WavMetadata = {};
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder("utf-8");

  function readFourCC(offset: number): string {
    if (offset + 4 > arrayBuffer.byteLength) return "";
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    return s;
  }

  if (view.byteLength < 12) return result;

  const riff = readFourCC(0);
  const format = readFourCC(8);

  if (riff !== "RIFF" || format !== "WAVE") {
    console.warn("File is not a valid RIFF/WAVE container.");
    return result;
  }

  let offset = 12;
  const length = view.byteLength;

  // Let's first search sequentially
  while (offset + 8 <= length) {
    const chunkId = readFourCC(offset);
    const chunkSize = view.getUint32(offset + 4, true);

    // Guard against corrupt/invalid chunk size
    if (chunkSize < 0 || offset + 8 + chunkSize > length) {
      break;
    }

    // Parse RIFF INFO LIST
    if (chunkId === "LIST") {
      const listType = readFourCC(offset + 8);
      if (listType === "INFO") {
        let listOffset = offset + 12;
        const listEnd = offset + 8 + chunkSize;

        while (listOffset + 8 <= listEnd) {
          const tagId = readFourCC(listOffset);
          const tagSize = view.getUint32(listOffset + 4, true);

          if (listOffset + 8 + tagSize > listEnd) break;

          if (tagSize > 0) {
            const rawBytes = new Uint8Array(arrayBuffer, listOffset + 8, tagSize);
            let value = textDecoder.decode(rawBytes).replace(/\0+$/, "").trim();

            if (tagId === "INAM") {
              result.title = value;
            } else if (tagId === "IART") {
              result.artist = value;
            } else if (tagId === "IGNR") {
              result.genre = value;
            }
          }

          const paddedTagSize = (tagSize + 1) & ~1;
          listOffset += 8 + paddedTagSize;
        }
      }
    }

    // Parse ID3v2 tag chunk if present
    if (chunkId.toLowerCase() === "id3 " || chunkId.toLowerCase() === "id3") {
      parseID3Chunk(bytes.subarray(offset + 8, offset + 8 + chunkSize), result);
    }

    const paddedChunkSize = (chunkSize + 1) & ~1;
    offset += 8 + paddedChunkSize;
  }

  // Backup brute-force search for RIFF INFO "LIST" and "INFO"
  if (!result.title || !result.artist || !result.genre) {
    let listIdx = -1;
    for (let i = 12; i < bytes.length - 12; i++) {
      if (
        bytes[i] === 76 &&     // 'L'
        bytes[i + 1] === 73 && // 'I'
        bytes[i + 2] === 83 && // 'S'
        bytes[i + 3] === 84    // 'T'
      ) {
        // Confirm it's followed by INFO
        if (
          bytes[i + 8] === 73 &&     // 'I'
          bytes[i + 9] === 78 &&     // 'N'
          bytes[i + 10] === 70 &&    // 'F'
          bytes[i + 11] === 79       // 'O'
        ) {
          listIdx = i;
          break;
        }
      }
    }

    if (listIdx !== -1) {
      let listOffset = listIdx + 12;
      const listEnd = bytes.length; // fallback to EOF
      while (listOffset + 8 <= listEnd) {
        const tagId = String.fromCharCode(bytes[listOffset], bytes[listOffset + 1], bytes[listOffset + 2], bytes[listOffset + 3]);
        const tagSize = view.getUint32(listOffset + 4, true);

        if (tagSize <= 0 || listOffset + 8 + tagSize > listEnd) break;

        const rawBytes = new Uint8Array(arrayBuffer, listOffset + 8, tagSize);
        let value = textDecoder.decode(rawBytes).replace(/\0+$/, "").trim();

        if (tagId === "INAM" && !result.title) {
          result.title = value;
        } else if (tagId === "IART" && !result.artist) {
          result.artist = value;
        } else if (tagId === "IGNR" && !result.genre) {
          result.genre = value;
        }

        const paddedTagSize = (tagSize + 1) & ~1;
        listOffset += 8 + paddedTagSize;
      }
    }
  }

  // Backup ID3v2 block scavenger (brute force search of 'ID3' anywhere after WAV header)
  if (!result.coverArt || !result.title || !result.artist || !result.genre) {
    let id3Index = -1;
    for (let i = 12; i < bytes.length - 10; i++) {
      if (bytes[i] === 73 && bytes[i + 1] === 68 && bytes[i + 2] === 51) { // 'I', 'D', '3'
        id3Index = i;
        break;
      }
    }
    if (id3Index !== -1) {
      parseID3Chunk(bytes.subarray(id3Index), result);
    }
  }

  return result;
}

function parseID3Chunk(id3Bytes: Uint8Array, result: WavMetadata) {
  if (id3Bytes.length < 10) return;

  // Verify 'ID3' header
  if (id3Bytes[0] !== 73 || id3Bytes[1] !== 68 || id3Bytes[2] !== 51) return;

  // Synchsafe size of ID3
  const sizeBytes = id3Bytes.subarray(6, 10);
  const id3Size = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];
  const maxOffset = Math.min(id3Size + 10, id3Bytes.length);

  let offset = 10;
  const textDecoder = new TextDecoder("utf-8");

  while (offset + 10 <= maxOffset) {
    const frameId = String.fromCharCode(id3Bytes[offset], id3Bytes[offset + 1], id3Bytes[offset + 2], id3Bytes[offset + 3]);
    
    // Read frame size
    let frameSize = 0;
    // Standard ID3v2.3 uses regular 32-bit; ID3v2.4 uses synchsafe. Let's support both nicely
    const fs0 = id3Bytes[offset + 4];
    const fs1 = id3Bytes[offset + 5];
    const fs2 = id3Bytes[offset + 6];
    const fs3 = id3Bytes[offset + 7];
    
    // Normal 32-bit size
    const normalSize = (fs0 << 24) | (fs1 << 16) | (fs2 << 8) | fs3;
    // Synchsafe 32-bit size
    const synchSize = (fs0 << 21) | (fs1 << 14) | (fs2 << 7) | fs3;

    // Standard detection heuristic
    if (offset + 10 + normalSize <= maxOffset && normalSize > 0) {
      frameSize = normalSize;
    } else if (offset + 10 + synchSize <= maxOffset && synchSize > 0) {
      frameSize = synchSize;
    } else {
      // End or weird frame
      break;
    }

    if (frameSize <= 0) break;

    const frameData = id3Bytes.subarray(offset + 10, offset + 10 + frameSize);

    if (frameId === "TIT2" && !result.title) {
      result.title = decodeID3String(frameData);
    } else if (frameId === "TPE1" && !result.artist) {
      result.artist = decodeID3String(frameData);
    } else if (frameId === "TCON" && !result.genre) {
      result.genre = decodeID3String(frameData);
    } else if (frameId === "APIC" && !result.coverArt) {
      // Extract picture format and body
      const imgType = detectImageFormat(frameData);
      if (imgType) {
        const { mime, startIdx } = imgType;
        const base64Data = base64Encode(frameData.subarray(startIdx));
        result.coverArt = `data:${mime};base64,${base64Data}`;
      }
    }

    offset += 10 + frameSize;
  }
}

function decodeID3String(data: Uint8Array): string {
  if (data.length === 0) return "";
  const encoding = data[0];
  const stringData = data.subarray(1);

  if (encoding === 0) {
    // ISO-8859-1
    return new TextDecoder("windows-1252").decode(stringData).replace(/\0+$/, "").trim();
  } else if (encoding === 1) {
    // UTF-16 with BOM
    return new TextDecoder("utf-16").decode(stringData).replace(/\0+$/, "").trim();
  } else if (encoding === 2) {
    // UTF-16BE without BOM
    return new TextDecoder("utf-16be").decode(stringData).replace(/\0+$/, "").trim();
  } else if (encoding === 3) {
    // UTF-8
    return new TextDecoder("utf-8").decode(stringData).replace(/\0+$/, "").trim();
  }
  return new TextDecoder("utf-8").decode(stringData).replace(/\0+$/, "").trim();
}

function detectImageFormat(data: Uint8Array): { mime: string; startIdx: number } | null {
  // We search for standard magic numbers of JPEG and PNG
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  for (let i = 0; i < data.length - 8; i++) {
    if (data[i] === 0xFF && data[i + 1] === 0xD8 && data[i + 2] === 0xFF) {
      return { mime: "image/jpeg", startIdx: i };
    }
    if (
      data[i] === 0x89 &&
      data[i + 1] === 0x50 &&
      data[i + 2] === 0x4E &&
      data[i + 3] === 0x47 &&
      data[i + 4] === 0x0D &&
      data[i + 5] === 0x0A &&
      data[i + 6] === 0x1A &&
      data[i + 7] === 0x0A
    ) {
      return { mime: "image/png", startIdx: i };
    }
  }
  return null;
}

function base64Encode(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}
