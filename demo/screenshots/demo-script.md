# AgriTrace – 3–5 Minute Demo Script (Grant Review)

## Goal (What reviewers should see)
AgriTrace is a real-time traceability MVP where:
- Supabase is the single source of truth (Postgres)
- Web + Mobile stay in sync in real time (Supabase Realtime)
- Photo evidence is stored in Supabase Storage and linked to each Lot (photos[])
- (Optional) Lots can be integrity-verified via a deterministic hash anchored to Starknet (sim/MVP)

---

## Setup (10 seconds)
- Open AgriTrace Web (Catalog)
- Open Supabase dashboard:
  - Table Editor → `public.lots`
  - Storage → bucket `lot-photos`
- Optional: Open 2 browser tabs (Tab A / Tab B)
- Optional: Open Mobile (Expo Go)

---

## Demo Flow (3–5 minutes)

### 1) Create a Lot on Web → appears in Supabase (30–40s)
**Action**
- In Web, create a new lot:
  - ID: `LOT-DEMO-001`
  - Fill any fields (product, origin, harvest date, batch)
**Show**
- In Supabase Table Editor → `lots`, refresh and show the new row.

**Narration (say this)**
“When a lot is created on the web, it is persisted in Supabase immediately. Supabase acts as the source of truth for all clients.”

---

### 2) Realtime Sync (40–60s)
**Action**
- Open Tab A and Tab B on the Catalog screen.
- In Tab A, create or edit a lot (e.g., change notes or rating).

**Show**
- Tab B updates automatically (no refresh).

**Narration**
“Updates propagate instantly using Supabase Realtime, so all clients stay consistent without manual refresh.”

---

### 3) Photo Upload → Storage + DB (40–60s)
**Action**
- Open `LOT-DEMO-001` detail screen.
- Upload a photo.

**Show**
- Supabase Storage → `lot-photos` shows the uploaded file.
- Supabase Table Editor → `lots` → the `photos` array includes the uploaded photo reference/URL.

**Narration**
“Photos are uploaded to Supabase Storage and linked back to the lot record via a `photos[]` array, enabling verifiable media evidence.”

---

### 4) Mobile ↔ Web Sync (40–60s)
**Action**
- On Mobile, create a new lot:
  - ID: `LOT-MOB-DEMO-001`

**Show**
- Web updates automatically (realtime).
- Supabase table includes the new row.

**Narration**
“Field operators can create and update lots from mobile, and the web admin view updates in real time.”

---

### 5) (Optional) Integrity Proof via Starknet (20–40s)
**Action**
- Show the lot hash / txHash output (SIM/MVP).

**Narration**
“For integrity, AgriTrace computes a deterministic hash of the lot payload and can anchor it to Starknet. This makes records tamper-evident and verifiable.”

---

## End (10 seconds)
**Narration**
“This concludes the MVP demo: multi-client realtime sync, cloud persistence, and photo evidence—ready to evolve into Starknet-anchored integrity proofs and expanded traceability workflows.”

---

## Repo Proof Links (optional)
- Supabase table: `public.lots`
- Storage bucket: `lot-photos`
- Realtime enabled for `public.lots`
