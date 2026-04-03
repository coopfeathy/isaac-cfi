# Isaac CFI Local AI Plan

Practical implementation plan for running Ollama on Isaac's computer while development is done remotely from a Mac.

No legal language, no contracts, no custom public domain required.

Effective date: 2026-04-03

---

## 1. Setup Tasks

Complete these once to get the base system running.

### 1.1 Isaac Computer Tasks

1. Install Ubuntu Server on Isaac machine
2. Install Docker and Docker Compose
3. Install Ollama and pull initial model(s)
4. Install Tailscale and join shared tailnet
5. Keep Ollama bound to local/private network only
6. Create `.env` file for local gateway secrets
7. Start services and verify health endpoint

### 1.2 Developer Tasks

1. Build AI gateway endpoints in website/backend
2. Add token validation and rate limiting
3. Add request logging with request IDs
4. Add workflow endpoints:
   - scheduling
   - student updates
   - debriefs
   - messaging/prospects
5. Add database tables for:
   - prompt/output logs
   - job status
   - approval state
6. Add admin UI for approve/reject before outbound sends

### 1.3 Shared Validation Tasks

1. Confirm Mac can reach Isaac gateway over Tailscale
2. Confirm invalid token is rejected
3. Confirm valid token returns model response
4. Confirm all requests are logged with timestamps

---

## 2. Rollout Tasks

Roll out in this order so failure blast radius stays small.

### 2.1 Phase A: Scheduling

1. Launch scheduling suggestions only
2. Keep final booking action human-confirmed
3. Add conflict checks before any booking write

### 2.2 Phase B: Student Updates and Debriefs

1. Generate draft-only outputs from templates
2. Require manual review before any send
3. Store draft, final edit, and approver metadata

### 2.3 Phase C: Messaging and Prospects

1. Start with follow-up draft generation only
2. Enforce opt-out and frequency limits
3. Require approval for all external sends

### 2.4 Stability Hardening

1. Add retry policy for failed jobs
2. Add basic monitoring and alert thresholds
3. Add fail-safe behavior when Isaac machine is offline

---

## 3. Timeline

### Week 1: Infrastructure and Secure Connectivity

1. Ubuntu + Docker + Ollama installed on Isaac machine
2. Tailscale connectivity working from developer Mac
3. Gateway health endpoint operational
4. Token auth and logging in place

Success criteria:

1. End-to-end test request works from Mac to Isaac runtime
2. No public internet exposure of raw Ollama endpoint

### Week 2: Scheduling Live

1. Scheduling endpoint deployed
2. Validation rules active (no double booking)
3. Human confirmation on final booking action

Success criteria:

1. Scheduling suggestions are usable
2. Zero invalid booking writes in test runs

### Week 3: Student Updates and Debriefs Live

1. Draft generation endpoints deployed
2. Approval UI flow active
3. Audit trail stored for every send

Success criteria:

1. Most drafts require light edits only
2. Every outbound message has approver and timestamp

### Week 4: Messaging and Prospects Live

1. Prospect messaging drafts enabled
2. Opt-out and send frequency controls enabled
3. Monitoring and alerting baseline finalized

Success criteria:

1. No sends to opted-out contacts
2. No unapproved outbound messages

---

## 4. Daily Operating Routine

Simple day-to-day routine to keep things stable.

### Isaac Daily

1. Confirm local services are healthy
2. Confirm no stuck job backlog
3. Confirm machine has safe disk/RAM headroom
4. Notify developer if any recurring or unresolved issue appears

### Developer Daily

1. Check error logs and failed jobs
2. Fix code/API issues surfaced by Isaac checks
3. Review output quality and adjust prompts/workflows

---

## 5. Escalation Format (Quick Copy/Paste)

When Isaac reports an issue to developer, send:

1. What broke
2. When it started (timezone)
3. Which workflow is affected
4. What was already tried
5. Last error text and request ID if available

Template:

Subject: AI issue - <short title>

1. Started: <timestamp + timezone>
2. Impact: <scheduling/student updates/debriefs/messaging>
3. Status: <down/degraded/intermittent>
4. Tried so far: <restart/check/token test>
5. Last error: <exact message>
6. Need from dev: <code fix/config fix/investigation>
