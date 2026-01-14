// app/hash.ts
import type { Lot } from "./lots";

/**
 * ✅ Deterministic hash helper (SHA-256) without extra dependencies.
 * Works on web + native.
 *
 * We hash a stable "payload" string built from lot fields.
 */
export async function computeLotHash(
  lot: Lot
): Promise<{ hashHex: string; payload: string }> {
  const payload = hashPayloadFromLot(lot);
  const hashHex = sha256Hex(payload);
  return { hashHex, payload };
}

/**
 * ✅ Stable payload builder
 * (Useful later for on-chain anchoring: you can store payload + hash)
 *
 * IMPORTANT MVP DECISION:
 * - We hash only "traceability fields"
 * - We DO NOT hash photos/createdAt/reviews, etc.
 *   (photos are evidence; edits to traceability fields should trigger TAMPERED)
 */
export function hashPayloadFromLot(lot: Lot): string {
  const norm = (v: any) => String(v ?? "").trim();

  // Keep stable order + normalized values
  return JSON.stringify(
    {
      id: norm(lot.id),
      product_en: norm(lot.product_en),
      product_es: norm(lot.product_es),
      origin: norm(lot.origin),
      harvestDate: norm(lot.harvestDate),
      batch: norm(lot.batch),
      notes: norm(lot.notes ?? ""),
    },
    null,
    0
  );
}

/** ---------------------------
 * Minimal SHA-256 implementation (pure JS)
 * --------------------------*/

function sha256Hex(input: string): string {
  const bytes = utf8ToBytes(input);
  const words = bytesToWords(bytes);
  const hashWords = sha256Words(words, bytes.length);
  const hex = wordsToHex(hashWords);

  // ✅ SHA-256 hex should be 64 chars
  // (defensive: pad or slice if anything ever goes weird)
  if (hex.length === 64) return hex;
  if (hex.length > 64) return hex.slice(0, 64);
  return hex.padStart(64, "0");
}

function utf8ToBytes(str: string): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < str.length) {
    let c = str.charCodeAt(i++);

    // surrogate pair
    if (c >= 0xd800 && c <= 0xdbff && i < str.length) {
      const c2 = str.charCodeAt(i++);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
      } else {
        i--;
      }
    }

    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6));
      out.push(0x80 | (c & 0x3f));
    } else if (c < 0x10000) {
      out.push(0xe0 | (c >> 12));
      out.push(0x80 | ((c >> 6) & 0x3f));
      out.push(0x80 | (c & 0x3f));
    } else {
      out.push(0xf0 | (c >> 18));
      out.push(0x80 | ((c >> 12) & 0x3f));
      out.push(0x80 | ((c >> 6) & 0x3f));
      out.push(0x80 | (c & 0x3f));
    }
  }
  return out;
}

function bytesToWords(bytes: number[]): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const wi = i >> 2;
    words[wi] = (words[wi] ?? 0) | (bytes[i] << (24 - (i % 4) * 8));
  }
  return words;
}

function wordsToHex(words: number[]): string {
  const hex: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = (words[i] ?? 0) >>> 0;
    hex.push((w >>> 28).toString(16));
    hex.push(((w >>> 24) & 0xf).toString(16));
    hex.push(((w >>> 20) & 0xf).toString(16));
    hex.push(((w >>> 16) & 0xf).toString(16));
    hex.push(((w >>> 12) & 0xf).toString(16));
    hex.push(((w >>> 8) & 0xf).toString(16));
    hex.push(((w >>> 4) & 0xf).toString(16));
    hex.push((w & 0xf).toString(16));
  }
  return hex.join("");
}

function sha256Words(mIn: number[], l: number): number[] {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // ✅ Clone input so we don't mutate caller's array during padding
  const m = mIn.slice();

  // Initial hash values
  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  // Padding
  m[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  m[(((l + 64) >> 9) << 4) + 15] = l * 8;

  const W = new Array<number>(64);

  for (let i = 0; i < m.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = m[i + t] | 0;

    for (let t = 16; t < 64; t++) {
      const s0 =
        rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 =
        rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H0,
      b = H1,
      c = H2,
      d = H3,
      e = H4,
      f = H5,
      g = H6,
      h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  return [H0, H1, H2, H3, H4, H5, H6, H7].map((x) => x >>> 0);
}

function rotr(x: number, n: number) {
  return (x >>> n) | (x << (32 - n));
}
