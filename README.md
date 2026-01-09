# AgriTrace

AgriTrace is a blockchain-based traceability application designed to provide verifiable transparency for agricultural products using QR codes and Starknet.

---

## Overview

AgriTrace enables agricultural producers to register product lots and generate QR codes that allow consumers and buyers to verify origin, product data, and integrity.

The system is designed for supply chains where trust, export validation, and authenticity are critical, such as coffee, cacao, mango, and hibiscus production.

---

## Problem

Agricultural supply chains face several structural issues:

- Limited transparency across production and distribution
- Reliance on manual or unverifiable records
- Fraud related to origin and labeling
- Lack of consumer-accessible verification mechanisms

Small and medium producers often lack affordable tools to prove authenticity and product history.

---

## Solution

AgriTrace provides a traceability system that includes:

- Product lot creation and management
- Deterministic hashing of lot metadata
- QR codes linked to verifiable records
- Blockchain-based verification using Starknet

This approach creates an immutable and auditable trail from producer to end consumer.

---

## How It Works

1. A producer creates a product lot within the application
2. Lot data is normalized and hashed deterministically
3. A QR code is generated for the lot
4. A consumer scans the QR code
5. The application verifies the data against Starknet records

---

## Starknet Integration

AgriTrace uses Starknet as the verification and settlement layer.

The current MVP includes:

- Deterministic hashing of lot data
- Starknet transaction simulation
- Network abstraction for Sepolia and Mainnet
- Display of transaction hashes and block metadata

The architecture is designed to support:

- Cairo smart contracts for lot registration
- Low-cost verification transactions
- Public and permissionless auditability

---

## MVP Status

The current MVP includes:

- Expo-based mobile application (Android and iOS)
- Product lot catalog and detail views
- QR code generation and scanning
- Local persistence layer
- Starknet verification simulation

Planned next phase:

- On-chain contract deployment on Starknet

---

## Tech Stack

- React Native (Expo)
- TypeScript
- Starknet
- QR code scanning
- Local storage abstraction
- Deterministic hashing

---

## Getting Started

```bash
git clone https://github.com/agritrace-javier/agritrace.git
cd agritrace
npm install
npx expo start
