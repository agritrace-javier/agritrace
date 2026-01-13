# AgriTrace

AgriTrace is a **real-time agricultural traceability MVP** that provides **verifiable transparency and auditability** for agricultural product lots across **Web and Mobile clients**, using **Supabase as the canonical source of truth** and **Starknet as the integrity verification layer**.

The platform enables producers, operators, buyers, and auditors to create, track, and verify agricultural lots with synchronized data, photo evidence, and blockchain-aligned integrity proofs.

---

## Overview

Agricultural supply chains—especially in export-oriented markets—suffer from fragmented data, unverifiable records, and weak trust guarantees.

AgriTrace addresses these challenges by enabling:

- Real-time lot creation and updates  
- Multi-device synchronization (Web + Mobile)  
- Verifiable photo evidence linked to each lot  
- Deterministic hashing of normalized lot data  
- Blockchain-aligned integrity proofs  

The system is designed for **trust-sensitive agricultural products** such as coffee, cacao, mango, hibiscus, and similar commodities where **origin, authenticity, and auditability** are critical.

---

## Problem

Agricultural traceability systems face persistent structural issues:

- Fragmented and manual record-keeping  
- Lack of real-time visibility across stakeholders  
- High risk of origin and labeling fraud  
- Expensive or inaccessible verification tools for small and medium producers  
- Consumer-facing QR codes that link to mutable or unverifiable data  

These limitations reduce trust, restrict export opportunities, and disproportionately impact small producers.

---

## Solution

AgriTrace provides a unified, real-time traceability system where:

- Product lots are created and managed in a **single source of truth (Supabase Postgres)**  
- All connected clients remain synchronized via **Supabase Realtime**  
- Photo evidence is uploaded to **cloud storage** and cryptographically linked to lots  
- Lot payloads are **normalized and deterministically hashed**  
- Hashes can be **anchored to Starknet** to ensure tamper-evident verification  

This creates a transparent, auditable trail from production to consumption.

---

## Architecture (High-Level)

- **Supabase Postgres**  
  Canonical source of truth for all lot data.

- **Supabase Realtime**  
  Broadcasts INSERT / UPDATE / DELETE events to all connected clients.

- **Supabase Storage**  
  Stores photo evidence linked to each lot (`photos[]`).

- **Web + Mobile Clients (Expo)**  
  Operators interact with the same synchronized dataset across platforms.

- **Starknet (MVP / Simulation)**  
  Deterministic lot hashes are prepared for anchoring on Starknet to provide integrity guarantees.

---

## How It Works

1. A product lot is created on Web or Mobile  
2. Lot data is normalized and stored in Supabase (source of truth)  
3. Changes propagate instantly via Supabase Realtime  
4. Photos are uploaded to Supabase Storage and referenced in the lot record  
5. A deterministic hash of the lot payload is generated  
6. (MVP) The hash is simulated for Starknet anchoring  
7. (Next Phase) The hash is committed on-chain via Starknet smart contracts  
8. Consumers or auditors verify the lot via QR code  

---

## Current MVP Capabilities

- Web application (Expo / React Native Web)  
- Mobile application (Android / iOS via Expo Go)  
- Real-time synchronization across all clients  
- Supabase as a single source of truth  
- Full CRUD operations for product lots  
- Photo uploads with cloud persistence  
- `photos[]` array linked directly to lot records  
- Deterministic hashing of lot metadata  
- Starknet transaction simulation (integrity preview)  

This MVP demonstrates **end-to-end data flow**, **real-time synchronization**, and **verification readiness**.

---

## Demo & Proof

Demo and verification assets are included in the repository:

- `demo/demo-script.md` – Step-by-step demo recording guide  
- `demo/screenshots/`  
  - `supabase-lots.png`  
  - `storage-lot-photos.png`  
  - `mobile-catalog.png`  

### Demo Video (Unlisted)

- **Mobile Demo (YouTube Short)**  
  https://youtube.com/shorts/tM56PLrSP_M

- **Web Demo (YouTube)**  
  https://youtu.be/HrV_Pe0rn4g

> These videos demonstrate the AgriTrace Web and Mobile clients interacting  
> with the same Supabase-backed dataset.  
> All data shown is persisted in Supabase and synchronized in real time.

---

## Project Status

- MVP complete and functional  
- Real-time sync verified across Web and Mobile  
- Photo evidence pipeline operational  
- Deterministic hashing implemented  
- Starknet grant **pre-screening passed**  

AgriTrace is currently **grant-ready** and prepared for on-chain expansion.

---

## Roadmap

### Phase 1 (Completed)
- Supabase-backed real-time traceability MVP  
- Web + Mobile clients  
- Photo evidence and deterministic hashing  

### Phase 2 (Post-Grant)
- Starknet Cairo smart contracts for lot hash anchoring  
- On-chain integrity commitments  
- Public verification endpoint via QR scanning  

---

## Tech Stack

- React Native (Expo)  
- TypeScript  
- Supabase (Postgres, Realtime, Storage)  
- Starknet (simulation → on-chain verification)  

---

## License

MIT
