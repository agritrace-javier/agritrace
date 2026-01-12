# AgriTrace

AgriTrace is a real-time agricultural traceability MVP designed to provide verifiable transparency for product lots across web and mobile clients, using Supabase as the source of truth and Starknet for integrity proofs.

The system enables producers, operators, and buyers to create, verify, and audit agricultural lots with synchronized data, photo evidence, and blockchain-aligned verification.

---

## Overview

AgriTrace addresses trust and transparency gaps in agricultural supply chains by enabling:

- Real-time lot creation and updates  
- Multi-device synchronization (Web + Mobile)  
- Verifiable photo evidence linked to each lot  
- Deterministic hashing and blockchain-aligned integrity proofs  

The platform is designed for export-oriented and trust-sensitive products such as coffee, cacao, mango, and hibiscus, where origin, authenticity, and auditability are critical.

---

## Problem

Agricultural supply chains face persistent structural challenges:

- Fragmented and manual record-keeping  
- Limited real-time visibility across stakeholders  
- High risk of origin and labeling fraud  
- Lack of affordable verification tools for small and medium producers  
- Consumer-facing QR codes that link to unverifiable or mutable data  

These issues reduce trust, limit export opportunities, and disadvantage small producers.

---

## Solution

AgriTrace provides a unified traceability system where:

- Product lots are created and managed in a single source of truth (Supabase)  
- All clients stay synchronized in real time (Supabase Realtime)  
- Photo evidence is uploaded to cloud storage and linked directly to lots  
- Lot data is normalized and deterministically hashed  
- Hashes can be anchored to Starknet for tamper-evident verification  

This creates a transparent, auditable trail from production to consumption.

---

## Architecture (High-Level)

- **Supabase Postgres**  
  Acts as the canonical source of truth for all lot data.

- **Supabase Realtime**  
  Broadcasts INSERT / UPDATE / DELETE events to all connected clients.

- **Supabase Storage**  
  Stores photo evidence linked to each lot (`photos[]`).

- **Web + Mobile Clients (Expo)**  
  Operators and users interact with the same synchronized dataset.

- **Starknet (MVP / Simulation)**  
  Deterministic lot hashes are prepared for anchoring on Starknet to ensure integrity and auditability.

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

## Current MVP Capabilities (Implemented)

✔ Web application (Expo / React Native Web)  
✔ Mobile application (Android / iOS via Expo Go)  
✔ Real-time synchronization between all clients  
✔ Supabase as a single source of truth  
✔ CRUD operations for product lots  
✔ Photo uploads with cloud persistence  
✔ `photos[]` linked directly to lot records  
✔ Deterministic hashing of lot metadata  
✔ Starknet transaction simulation (Sepolia / Mainnet abstraction)  

This MVP demonstrates end-to-end data flow, synchronization, and verification readiness.

---

## Demo & Proof

A full demo script and proof artifacts are available in the repository:

