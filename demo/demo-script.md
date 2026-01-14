# AgriTrace – Demo Script (3–5 Minutes)

This document provides a step-by-step script to record a short demo video
showcasing the current AgriTrace MVP capabilities.

The goal is to demonstrate:
- Real-time synchronization
- Supabase as the source of truth
- Photo evidence persistence
- Readiness for on-chain integrity via Starknet

---

## 0. Setup (Before Recording)

- Open **Web App** in Browser (Tab A)
- Open **Web App** in Browser (Tab B) or another browser
- Open **Supabase Dashboard**:
  - Table Editor → `lots`
  - Storage → `lot-photos`
- Open **Mobile App** via Expo Go (optional but recommended)

Ensure screen recording is ready.

---

## 1. Introduction (20–30 seconds)

**Say:**

> “AgriTrace is a real-time agricultural traceability MVP.
> Supabase acts as the canonical source of truth,
> while Starknet provides an integrity and verification layer.”

> “I’ll demonstrate real-time synchronization, photo evidence,
> and blockchain-aligned verification readiness.”

---

## 2. Create a Lot (Web → Supabase) (40–60 seconds)

**Show:**
- Web App (Tab A)

**Action:**
- Create a new product lot:
  - Product name
  - Origin
  - Harvest date
  - Batch
  - Optional notes

**Say:**

> “I’m creating a product lot on the Web client.
> This data is written directly to Supabase,
> which acts as the single source of truth.”

**Then:**
- Switch to Supabase Table Editor
- Show the new row appearing instantly

---

## 3. Realtime Sync (Web Tab A ↔ Web Tab B) (30–40 seconds)

**Show:**
- Web App (Tab B)

**Action:**
- Update the same lot from Tab A (edit notes or rating)

**Say:**

> “Any change is instantly broadcast via Supabase Realtime.
> No refresh is required.”

**Confirm:**
- Change appears immediately on Tab B

---

## 4. Photo Evidence (Storage + DB Link) (40–60 seconds)

**Show:**
- Web App

**Action:**
- Upload a photo to the lot

**Say:**

> “Photo evidence is uploaded to Supabase Storage
> and linked directly to the lot record.”

**Then:**
- Open Supabase Storage → `lot-photos`
- Show the uploaded image
- Return to Supabase Table Editor
- Show `photos[]` updated with the file path

---

## 5. Mobile → Web Realtime Sync (Optional but Strong) (30–45 seconds)

**Show:**
- Mobile App

**Action:**
- Update the lot (edit notes or rating)

**Say:**

> “The same dataset is shared across Web and Mobile.
> Updates propagate instantly in real time.”

**Confirm:**
- Switch back to Web → change appears without refresh

---

## 6. Integrity & Starknet Simulation (20–30 seconds)

**Show:**
- Lot detail screen with hash / simulation output

**Say:**

> “Each lot payload is normalized and deterministically hashed.
> In this MVP, we simulate Starknet anchoring.
> In the next phase, these hashes will be committed on-chain
> via Cairo smart contracts.”

---

## 7. Closing (10–20 seconds)

**Say:**

> “This concludes the AgriTrace MVP demo.
> The system is real-time, auditable,
> and ready for on-chain verification.”

Stop recording.

---

## Notes

- Keep total duration under 5 minutes
- Do not explain future features in detail
- Focus on what is already working
- Calm, slow narration > speed
