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
export type StarknetNetwork =
  | "SIM"
  | "starknet-sepolia"
  | "starknet-mainnet";

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

function fakeTxHash(seed: string) {
  // deterministic-ish fake tx hash for demo
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return `0xSIM${hex}${Date.now().toString(16)}`.replace(/[^0-9a-fx]/gi, "");
}

export async function verifyOnStarknetSim(
  input: StarknetSimPayload
): Promise<StarknetSimResult> {
  // Simulate network latency
  await sleep(650);

  const txHash = fakeTxHash(`${input.lotId}|${input.hashHex}`);

  return {
    ok: true,
    network: "SIM", // ✅ ahora válido por tipo
    txHash,
    blockNumber: 900000 + (Math.floor(Math.random() * 9999) % 9999),
    timestamp: Date.now(),
    note:
      "SIMULATION ONLY: This is an MVP demo. In production, the lot hash will be anchored on Starknet via a smart contract transaction.",
  };
}
