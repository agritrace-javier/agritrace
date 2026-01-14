// app/starknet-sim.ts

export type StarknetSimPayload = {
  lotId: string;
  hashHex: string;
  payload: string;
};

/**
 * ✅ Permitimos SIM explícitamente
 * (para MVP / grants / demo sin wallet real)
 */
export type StarknetNetwork = "SIM" | "starknet-sepolia" | "starknet-mainnet";

export type StarknetSimResult = {
  ok: boolean;
  network: StarknetNetwork;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  note: string;
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * ✅ deterministic-ish 32-byte hex generator from a string seed
 * (not cryptographic — only for SIM demo)
 */
function pseudoHex64(seed: string) {
  let a = 0x12345678;
  let b = 0x9abcdef0;

  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    a = (a ^ c) + ((a << 5) | (a >>> 27));
    a >>>= 0;
    b = (b + c) ^ ((b << 7) | (b >>> 25));
    b >>>= 0;
  }

  const parts: string[] = [];
  // 64 hex chars = 32 bytes
  for (let i = 0; i < 8; i++) {
    a = (a * 1664525 + 1013904223) >>> 0;
    b = (b * 22695477 + 1) >>> 0;
    parts.push(a.toString(16).padStart(8, "0"));
    if (parts.join("").length >= 64) break;
    parts.push(b.toString(16).padStart(8, "0"));
    if (parts.join("").length >= 64) break;
  }

  return parts.join("").slice(0, 64);
}

/**
 * ✅ txHash looks like a real chain hash:
 * 0x + 64 hex chars
 */
function fakeTxHash(seed: string) {
  // include time so two verifications never collide (still deterministic-ish)
  const timeHex = Date.now().toString(16);
  const hex64 = pseudoHex64(`${seed}|${timeHex}`);
  return `0x${hex64}`;
}

/**
 * ✅ Deterministic "block number" from seed (more believable than Math.random)
 */
function fakeBlockNumber(seed: string) {
  // produce a stable-ish number in a plausible range
  const h = pseudoHex64(seed);
  const n = parseInt(h.slice(0, 8), 16) >>> 0;
  return 900000 + (n % 50000); // 900k .. 949,999
}

export async function verifyOnStarknetSim(
  input: StarknetSimPayload
): Promise<StarknetSimResult> {
  // Simulate network latency
  await sleep(650);

  const seed = `${input.lotId}|${input.hashHex}`;
  const txHash = fakeTxHash(seed);

  return {
    ok: true,
    network: "SIM",
    txHash,
    blockNumber: fakeBlockNumber(seed),
    timestamp: Date.now(),
    note:
      "SIMULATION ONLY: This is an MVP demo. In production, the lot hash will be anchored on Starknet via a smart contract transaction.",
  };
}
