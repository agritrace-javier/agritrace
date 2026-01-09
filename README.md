# AgriTrace

AgriTrace is a blockchain-based traceability application designed to bring transparency, trust, and verification to agricultural products using QR codes and Starknet.

---

## Overview

AgriTrace allows producers to register agricultural product lots and generate QR codes that consumers can scan to verify origin, product details, and integrity.  
The system is designed for regions where trust, export validation, and product authenticity are critical, such as coffee, cacao, mango, and hibiscus supply chains.

---

## Problem

Agricultural supply chains suffer from:
- Lack of transparency
- Manual and unverifiable records
- Fraud in origin and labeling
- No consumer-level verification

Small and medium producers have no affordable way to prove authenticity or track product history.

---

## Solution

AgriTrace provides:
- Lot creation and management by producers
- Deterministic hashing of lot data
- QR codes linked to verifiable records
- On-chain verification via Starknet (simulation-ready)

This creates an immutable, auditable trail from producer to consumer.

---

## How It Works

1. Producer creates a product lot inside the app
2. Lot data is normalized and hashed
3. A QR code is generated for the lot
4. Consumers scan the QR code
5. The app verifies the lot data against Starknet

---

## Starknet Integration

AgriTrace is built with Starknet as the verification layer.

Current MVP includes:
- Deterministic lot hashing
- Starknet transaction simulation
- Network abstraction (Sepolia / Mainnet ready)
- Transaction hash and block metadata display

The architecture is designed to support:
- Cairo smart contracts for lot registration
- Low-cost verification transactions
- Public auditability

---

## MVP Status

✅ Expo mobile app (Android / iOS)  
✅ Lot catalog and detail view  
✅ QR code generation and scanning  
✅ Local persistence  
✅ Starknet verification simulation  

⏳ On-chain contract deployment (next phase)

---

## Tech Stack

- React Native (Expo)
- TypeScript
- Starknet (simulation layer)
- QR scanning
- Local storage abstraction
- Deterministic hashing

---

## Getting Started

```bash
git clone https://github.com/agritrace-javier/agritrace.git
cd agritrace
npm install
npx expo start
